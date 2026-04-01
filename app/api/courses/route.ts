import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, push, set } from 'firebase/database';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import crypto from 'crypto';

import { requireSession, requireRole } from '@/lib/auth/api';
import { syncCourseToFirestoreBestEffort } from '@/lib/firestore-sync-courses';
import { getFirestoreDb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'missing',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'missing',
  projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'missing',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'missing',
  appId: process.env.FIREBASE_APP_ID || 'missing',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'missing',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const database = getDatabase(app);

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function normalizeCourseKey(input: unknown) {
  const key = normalizeString(input).toLowerCase();
  return key;
}

function isValidCourseKey(key: string) {
  return key.length >= 3 && key.length <= 30 && !/\s/.test(key);
}

// GET - Search/list courses (by title or courseKey)
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const { searchParams } = new URL(request.url);
    const q = normalizeString(searchParams.get('q') || '').toLowerCase();

    const firestore = getFirestoreDb();
    const snapshot = await getDocs(
      query(collection(firestore, 'courses'), where('status', '==', 'approved'), limit(200))
    );

    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .map((course) => {
        const title = normalizeString(course?.title);
        const courseKey = normalizeString(course?.courseKey);
        return {
          id: course.id,
          title,
          courseKey,
          createdBy: course?.createdBy || '',
          createdAt: course?.createdAt || null,
        };
      })
      .filter((course) => {
        if (!q) return true;
        return (
          course.title.toLowerCase().includes(q) ||
          course.courseKey.toLowerCase().includes(q)
        );
      });

    return NextResponse.json({ ok: true, courses: results });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

// POST - Create course (guru/root/administrator)
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);

    const body = await request.json();
    const title = normalizeString(body?.title);
    const courseKey = normalizeCourseKey(body?.courseKey);
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!title) {
      return NextResponse.json({ error: 'Nama kursus wajib diisi' }, { status: 400 });
    }
    if (!isValidCourseKey(courseKey)) {
      return NextResponse.json(
        { error: 'Kunci kursus tidak valid (tanpa spasi, 3-30 karakter)' },
        { status: 400 }
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: 'Password kursus minimal 4 karakter' },
        { status: 400 }
      );
    }

    const keySnapshot = await get(ref(database, `course_keys/${courseKey}`));
    if (keySnapshot.exists()) {
      return NextResponse.json({ error: 'Kunci kursus sudah dipakai' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const status = session.role === 'guru' ? 'pending' : 'approved';
    const courseData = {
      title,
      courseKey,
      passwordHash: hashPassword(password),
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
      status,
    };

    const newCourseRef = push(ref(database, 'courses'));
    await set(newCourseRef, courseData);
    if (newCourseRef.key) {
      await set(ref(database, `course_keys/${courseKey}`), newCourseRef.key);
      await syncCourseToFirestoreBestEffort(newCourseRef.key, courseData);
    }

    return NextResponse.json({
      ok: true,
      course: { id: newCourseRef.key, title, courseKey, createdBy: session.userId, createdAt: now },
    }, { status: 201 });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
