import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

async function canAccessCourse(courseId: string, userId: string) {
  const firestore = getFirestoreDb();
  const courseDoc = await getDoc(doc(firestore, 'courses', courseId));
  if (!courseDoc.exists()) return { exists: false, isOwner: false, isEnrolled: false };
  const course = courseDoc.data() as any;
  const isOwner = course?.createdBy === userId;
  const database = getRtdb();
  const membershipSnapshot = await get(ref(database, `user_courses/${userId}/${courseId}`));
  const isEnrolled = membershipSnapshot.exists();
  return { exists: true, isOwner, isEnrolled };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, itemId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const database = getRtdb();
    const itemSnap = await get(ref(database, `course_items/${courseId}/${itemId}`));
    if (!itemSnap.exists()) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: { id: itemId, ...(itemSnap.val() as any) } });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

