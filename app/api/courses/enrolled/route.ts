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

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);

    const membershipsSnapshot = await get(ref(database, `user_courses/${session.userId}`));
    const courseIds: string[] = [];

    if (membershipsSnapshot.exists()) {
      membershipsSnapshot.forEach((child) => {
        if (child.key) courseIds.push(child.key);
      });
    }

    const coursesSnapshot = await get(ref(database, 'courses'));
    const courses: any[] = [];

    if (coursesSnapshot.exists()) {
      coursesSnapshot.forEach((child) => {
        if (!child.key || !courseIds.includes(child.key)) return;
        const course = child.val();
        courses.push({
          id: child.key,
          title: normalizeString(course?.title),
          courseKey: normalizeString(course?.courseKey),
          createdBy: course?.createdBy || '',
          createdAt: course?.createdAt || null,
        });
      });
    }

    return NextResponse.json({ ok: true, courses });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

