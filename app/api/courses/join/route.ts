import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import crypto from 'crypto';

import { requireSession } from '@/lib/auth/api';

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

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const body = await request.json();

    const courseKey = normalizeString(body?.courseKey).toLowerCase();
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!courseKey) {
      return NextResponse.json({ error: 'Kunci kursus wajib diisi' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password kursus wajib diisi' }, { status: 400 });
    }

    const keySnapshot = await get(ref(database, `course_keys/${courseKey}`));
    if (!keySnapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }
    const courseId = keySnapshot.val() as string;

    const existing = await get(ref(database, `user_courses/${session.userId}/${courseId}`));
    if (existing.exists()) {
      return NextResponse.json({ ok: true, courseId, alreadyJoined: true });
    }

    const courseSnapshot = await get(ref(database, `courses/${courseId}`));
    if (!courseSnapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const course = courseSnapshot.val();
    if (course?.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: 'Password kursus salah' }, { status: 401 });
    }

    const now = new Date().toISOString();
    await set(ref(database, `enrollments/${courseId}/${session.userId}`), {
      joinedAt: now,
      role: 'student',
    });
    await set(ref(database, `user_courses/${session.userId}/${courseId}`), {
      joinedAt: now,
    });

    return NextResponse.json({ ok: true, courseId, joinedAt: now });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

