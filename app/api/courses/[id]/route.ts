import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

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

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId } = await params;

    const courseSnapshot = await get(ref(database, `courses/${courseId}`));
    if (!courseSnapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const course = courseSnapshot.val();
    const isOwner = course?.createdBy === session.userId;

    const membershipSnapshot = await get(
      ref(database, `user_courses/${session.userId}/${courseId}`)
    );
    const isEnrolled = membershipSnapshot.exists();

    if (!isOwner && !isEnrolled) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      course: {
        id: courseId,
        title: normalizeString(course?.title),
        courseKey: normalizeString(course?.courseKey),
        createdBy: course?.createdBy || '',
        createdAt: course?.createdAt || null,
      },
      canManage: isOwner && (session.role === 'guru' || session.role === 'root' || session.role === 'administrator'),
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

