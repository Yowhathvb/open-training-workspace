import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';
import { isImageKitConfigured, uploadToImageKit } from '@/lib/imagekit-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function isFormDataFile(input: FormDataEntryValue | null): input is File {
  return typeof input === 'object' && input !== null && 'arrayBuffer' in input;
}

type AttendanceStatus = 'hadir' | 'izin' | 'sakit';

function parseStatus(input: unknown): AttendanceStatus | null {
  const value = normalizeString(input).toLowerCase();
  if (value === 'hadir' || value === 'izin' || value === 'sakit') return value;
  return null;
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

async function getAbsensiSession(courseId: string, absensiId: string) {
  const database = getRtdb();
  const sessionSnap = await get(ref(database, `course_attendance_sessions/${courseId}/${absensiId}`));
  if (!sessionSnap.exists()) return null;
  const value = sessionSnap.val() as any;
  return {
    date: normalizeString(value?.date),
    startTime: normalizeString(value?.startTime),
    endTime: normalizeString(value?.endTime),
    startAt: normalizeString(value?.startAt),
    endAt: normalizeString(value?.endAt) || normalizeString(value?.deadlineAt),
  };
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

    const sessionData = await getAbsensiSession(courseId, absensiId);
    if (!sessionData) return NextResponse.json({ error: 'Absensi tidak ditemukan' }, { status: 404 });

    const start = sessionData.startAt ? new Date(sessionData.startAt) : null;
    const end = sessionData.endAt ? new Date(sessionData.endAt) : null;
    const isNotStarted =
      start && !Number.isNaN(start.getTime()) ? Date.now() < start.getTime() : false;
    const isClosed = !sessionData.endAt || !end || Number.isNaN(end.getTime())
      ? false
      : Date.now() > end.getTime();

    const database = getRtdb();
    const attemptSnap = await get(
      ref(database, `course_attendance_attempts/${courseId}/${absensiId}/${session.userId}`)
    );
    if (!attemptSnap.exists()) {
      return NextResponse.json({ ok: true, isClosed, isNotStarted, attempt: null });
    }

    const attempt = attemptSnap.val() as any;
    return NextResponse.json({
      ok: true,
      isClosed,
      isNotStarted,
      attempt: {
        submittedAt: attempt?.submittedAt || null,
        status: normalizeString(attempt?.status),
        evidence: attempt?.evidence || null,
      },
    });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; absensiId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, absensiId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const sessionData = await getAbsensiSession(courseId, absensiId);
    if (!sessionData) return NextResponse.json({ error: 'Absensi tidak ditemukan' }, { status: 404 });

    const start = sessionData.startAt ? new Date(sessionData.startAt) : null;
    if (start && !Number.isNaN(start.getTime()) && Date.now() < start.getTime()) {
      return NextResponse.json({ error: 'Absensi belum dibuka' }, { status: 403 });
    }

    const end = sessionData.endAt ? new Date(sessionData.endAt) : null;
    if (sessionData.endAt && end && !Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
      return NextResponse.json({ error: 'Batas waktu absensi sudah lewat' }, { status: 403 });
    }

    const database = getRtdb();
    const existingAttemptSnap = await get(
      ref(database, `course_attendance_attempts/${courseId}/${absensiId}/${session.userId}`)
    );
    if (existingAttemptSnap.exists()) {
      return NextResponse.json({ error: 'Kamu sudah absen' }, { status: 409 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Format request tidak valid' }, { status: 400 });
    }

    const formData = await request.formData();
    const status = parseStatus(formData.get('status'));
    if (!status) return NextResponse.json({ error: 'Status absensi tidak valid' }, { status: 400 });

    const fileEntry = formData.get('file');
    const file = isFormDataFile(fileEntry) ? fileEntry : null;

    if ((status === 'izin' || status === 'sakit') && !file) {
      return NextResponse.json({ error: 'Bukti file wajib diunggah untuk izin/sakit' }, { status: 400 });
    }

    let evidence: Record<string, any> | null = null;
    if (file) {
      if (!isImageKitConfigured()) {
        return NextResponse.json({ error: 'ImageKit belum dikonfigurasi' }, { status: 503 });
      }
      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ error: 'Ukuran file terlalu besar (maks 25MB)' }, { status: 413 });
      }

      const uploaded = await uploadToImageKit(file, {
        folder: `/courses/${courseId}/absensi/${absensiId}/${session.userId}`,
        tags: ['course', courseId, 'absensi', absensiId, session.userId, status],
      });
      evidence = {
        fileUrl: uploaded.url,
        fileName: uploaded.name || file.name,
        fileSize: uploaded.size ?? file.size,
        fileType: uploaded.fileType || file.type,
        thumbnailUrl: uploaded.thumbnailUrl,
        imagekitFileId: uploaded.fileId,
      };
    }

    const now = new Date().toISOString();
    const displayName = session.namaLengkap || session.username || session.email;
    const attemptRecord = {
      userId: session.userId,
      authorName: displayName,
      status,
      submittedAt: now,
      ...(evidence ? { evidence } : {}),
    };

    const updates: Record<string, any> = {};
    updates[`course_attendance_attempts/${courseId}/${absensiId}/${session.userId}`] = attemptRecord;
    updates[`user_attendance_attempts/${session.userId}/${courseId}/${absensiId}`] = {
      status,
      submittedAt: now,
    };
    await update(ref(database), updates);

    return NextResponse.json(
      { ok: true, attempt: { submittedAt: now, status, evidence: evidence || null } },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
