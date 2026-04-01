import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { isEnvConfigured } from '@/lib/app-config';

export const runtime = 'nodejs';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.FIREBASE_APP_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const database = getDatabase(app);

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

type ItemType = 'materi' | 'tugas' | 'kuis' | 'absensi';

function isValidType(input: string): input is ItemType {
  return ['materi', 'tugas', 'kuis', 'absensi'].includes(input);
}

async function canAccessCourse(courseId: string, userId: string) {
  const courseSnapshot = await get(ref(database, `courses/${courseId}`));
  if (!courseSnapshot.exists()) return { exists: false, isOwner: false, isEnrolled: false };
  const course = courseSnapshot.val();
  const isOwner = course?.createdBy === userId;
  const membershipSnapshot = await get(ref(database, `user_courses/${userId}/${courseId}`));
  const isEnrolled = membershipSnapshot.exists();
  return { exists: true, isOwner, isEnrolled };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json({ error: 'ENV_NOT_CONFIGURED' }, { status: 503 });
    }
    const session = requireSession(request);
    const { id: courseId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const snapshot = await get(ref(database, `course_items/${courseId}`));
    const items: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        items.push({ id: child.key, ...child.val() });
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json({ error: 'ENV_NOT_CONFIGURED' }, { status: 503 });
    }
    const session = requireSession(request);
    const { id: courseId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    if (!['guru', 'root', 'administrator'].includes(session.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json();
    const type = normalizeString(body?.type).toLowerCase();
    const title = normalizeString(body?.title);
    const description = normalizeString(body?.description);

    if (!isValidType(type)) {
      return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const itemData = {
      type,
      title,
      description,
      createdBy: session.userId,
      createdAt: now,
    };

    const newItemRef = push(ref(database, `course_items/${courseId}`));
    await set(newItemRef, itemData);

    return NextResponse.json({ ok: true, item: { id: newItemRef.key, ...itemData } }, { status: 201 });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
