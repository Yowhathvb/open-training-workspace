import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

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

    const firestore = getFirestoreDb();
    const courseDoc = await getDoc(doc(firestore, 'courses', courseId));
    if (!courseDoc.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const course = courseDoc.data() as any;
    const isOwner = course?.createdBy === session.userId;

    const database = getRtdb();
    const membershipSnapshot = await get(ref(database, `user_courses/${session.userId}/${courseId}`));
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
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
