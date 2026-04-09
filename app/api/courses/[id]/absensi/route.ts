import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, push, ref, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function isValidDateYYYYMMDD(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

function isValidTimeHHMM(input: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    if (!['guru', 'root', 'administrator'].includes(session.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const date = normalizeString(body?.date);
    const startTime = normalizeString(body?.startTime);
    const endTime = normalizeString(body?.endTime);
    const startAt = normalizeString(body?.startAt);
    const endAt = normalizeString(body?.endAt);
    const title = normalizeString(body?.title) || (date ? `Absensi ${date}` : 'Absensi');
    const description = normalizeString(body?.description);

    if (!date || !isValidDateYYYYMMDD(date)) {
      return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 });
    }
    if (!startTime || !isValidTimeHHMM(startTime)) {
      return NextResponse.json({ error: 'Jam mulai wajib diisi (HH:MM)' }, { status: 400 });
    }
    if (!endTime || !isValidTimeHHMM(endTime)) {
      return NextResponse.json({ error: 'Jam selesai wajib diisi (HH:MM)' }, { status: 400 });
    }
    if (!startAt || !endAt) {
      return NextResponse.json({ error: 'Waktu mulai/selesai tidak valid' }, { status: 400 });
    }
    const parsedStartAt = new Date(startAt);
    const parsedEndAt = new Date(endAt);
    if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
      return NextResponse.json({ error: 'Waktu mulai/selesai tidak valid' }, { status: 400 });
    }
    if (parsedEndAt.getTime() <= parsedStartAt.getTime()) {
      return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 });
    }
    const nowDate = new Date();
    if (parsedEndAt.getTime() <= nowDate.getTime()) {
      return NextResponse.json({ error: 'Jam selesai harus di masa depan' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const itemData = {
      type: 'absensi',
      title,
      description,
      createdBy: session.userId,
      createdAt: now,
    };

    const sessionData = {
      date,
      startTime,
      endTime,
      startAt: parsedStartAt.toISOString(),
      endAt: parsedEndAt.toISOString(),
      createdBy: session.userId,
      createdAt: now,
    };

    const database = getRtdb();
    const newItemRef = push(ref(database, `course_items/${courseId}`));
    if (!newItemRef.key) return NextResponse.json({ error: 'Gagal membuat absensi' }, { status: 500 });

    const updates: Record<string, any> = {};
    updates[`course_items/${courseId}/${newItemRef.key}`] = itemData;
    updates[`course_attendance_sessions/${courseId}/${newItemRef.key}`] = sessionData;
    await update(ref(database), updates);

    return NextResponse.json(
      { ok: true, item: { id: newItemRef.key, ...itemData }, session: sessionData },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
