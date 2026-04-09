import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

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
  { params }: { params: Promise<{ id: string; absensiId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, absensiId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const canManage = access.isOwner && ['guru', 'root', 'administrator'].includes(session.role);

    const database = getRtdb();
    const [itemSnap, sessionSnap] = await Promise.all([
      get(ref(database, `course_items/${courseId}/${absensiId}`)),
      get(ref(database, `course_attendance_sessions/${courseId}/${absensiId}`)),
    ]);
    if (!itemSnap.exists() || !sessionSnap.exists()) {
      return NextResponse.json({ error: 'Absensi tidak ditemukan' }, { status: 404 });
    }

    const item = itemSnap.val() as any;
    if (normalizeString(item?.type) !== 'absensi') {
      return NextResponse.json({ error: 'Bukan tipe absensi' }, { status: 400 });
    }

    const sessionData = sessionSnap.val() as any;
    return NextResponse.json({
      ok: true,
      canManage,
      absensi: {
        id: absensiId,
        title: normalizeString(item?.title),
        description: normalizeString(item?.description),
        createdBy: normalizeString(item?.createdBy),
        createdAt: item?.createdAt || null,
        date: normalizeString(sessionData?.date),
        startTime: normalizeString(sessionData?.startTime) || '00:00',
        endTime:
          normalizeString(sessionData?.endTime) ||
          normalizeString(sessionData?.deadlineTime) ||
          '',
        startAt: sessionData?.startAt || null,
        endAt: sessionData?.endAt || sessionData?.deadlineAt || null,
      },
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
