import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

import { requireRole } from '@/lib/auth/api';
import { syncCourseToFirestoreBestEffort } from '@/lib/firestore-sync-courses';
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

// GET - list pending courses
export async function GET(request: NextRequest) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json({ error: 'ENV_NOT_CONFIGURED' }, { status: 503 });
    }
    requireRole(request, ['root', 'administrator']);
    const snapshot = await get(ref(database, 'courses'));
    const courses: any[] = [];

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const course = child.val();
        if (course?.status !== 'pending') return;
        courses.push({
          id: child.key,
          title: normalizeString(course?.title),
          courseKey: normalizeString(course?.courseKey),
          createdBy: course?.createdBy || '',
          createdAt: course?.createdAt || null,
          status: course?.status,
        });
      });
    }

    return NextResponse.json({ ok: true, courses });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

// PUT - approve/reject
export async function PUT(request: NextRequest) {
  try {
    if (!isEnvConfigured()) {
      return NextResponse.json({ error: 'ENV_NOT_CONFIGURED' }, { status: 503 });
    }
    const session = requireRole(request, ['root', 'administrator']);
    const body = await request.json();
    const courseId = normalizeString(body?.courseId);
    const status = normalizeString(body?.status); // approved | rejected

    if (!courseId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid courseId or status' }, { status: 400 });
    }

    const snapshot = await get(ref(database, `courses/${courseId}`));
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await update(ref(database, `courses/${courseId}`), {
      status,
      updatedAt: now,
      approvedAt: status === 'approved' ? now : null,
      approvedBy: status === 'approved' ? session.userId : null,
      rejectedAt: status === 'rejected' ? now : null,
      rejectedBy: status === 'rejected' ? session.userId : null,
    });

    const updated = await get(ref(database, `courses/${courseId}`));
    const courseData = updated.val();
    await syncCourseToFirestoreBestEffort(courseId, courseData);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
