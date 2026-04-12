import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref, update } from 'firebase/database';

import { requireRole, requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';
import { isImageKitConfigured, uploadToImageKit } from '@/lib/imagekit-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function isFormDataFile(input: FormDataEntryValue | null): input is File {
  return typeof input === 'object' && input !== null && 'arrayBuffer' in input;
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

async function canManageCourse(courseId: string, session: { userId: string; role: string }) {
  const firestore = getFirestoreDb();
  const courseDoc = await getDoc(doc(firestore, 'courses', courseId));
  if (!courseDoc.exists()) return { exists: false, isOwner: false, isAdminLike: false };
  const course = courseDoc.data() as any;
  const isOwner = normalizeString(course?.createdBy) === session.userId;
  const isAdminLike = session.role === 'root' || session.role === 'administrator';
  return { exists: true, isOwner, isAdminLike };
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);
    const { id: courseId, itemId } = await params;

    const manage = await canManageCourse(courseId, session);
    if (!manage.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!manage.isOwner && !manage.isAdminLike) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const database = getRtdb();
    const itemSnap = await get(ref(database, `course_items/${courseId}/${itemId}`));
    if (!itemSnap.exists()) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const currentItem = itemSnap.val() as any;
    const itemType = normalizeString(currentItem?.type).toLowerCase();

    const contentType = request.headers.get('content-type') || '';
    let body: any = null;
    let formData: FormData | null = null;
    if (contentType.includes('multipart/form-data')) {
      formData = await request.formData();
    } else {
      body = await request.json().catch(() => null);
    }

    const nextTitleRaw =
      formData !== null
        ? (formData.has('title') ? normalizeString(formData.get('title')) : null)
        : (body && Object.prototype.hasOwnProperty.call(body, 'title') ? normalizeString(body?.title) : null);
    const nextDescriptionRaw =
      formData !== null
        ? (formData.has('description') ? normalizeString(formData.get('description')) : null)
        : (body && Object.prototype.hasOwnProperty.call(body, 'description') ? normalizeString(body?.description) : null);

    const updates: Record<string, any> = {};
    const now = new Date().toISOString();

    if (nextTitleRaw !== null) {
      if (!nextTitleRaw) {
        return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
      }
      updates[`course_items/${courseId}/${itemId}/title`] = nextTitleRaw;
    }

    if (nextDescriptionRaw !== null) {
      updates[`course_items/${courseId}/${itemId}/description`] = nextDescriptionRaw;
    }

    const fileEntry = formData ? formData.get('file') : null;
    const file = formData ? (isFormDataFile(fileEntry) ? fileEntry : null) : null;
    if (file) {
      if (!(itemType === 'materi' || itemType === 'tugas')) {
        return NextResponse.json({ error: 'File hanya bisa untuk materi/tugas' }, { status: 400 });
      }

      if (!isImageKitConfigured()) {
        return NextResponse.json({ error: 'ImageKit belum dikonfigurasi' }, { status: 503 });
      }

      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ error: 'Ukuran file terlalu besar (maks 25MB)' }, { status: 413 });
      }

      const uploaded = await uploadToImageKit(file, {
        folder:
          itemType === 'materi'
            ? `/courses/${courseId}/materi`
            : `/courses/${courseId}/tugas/${itemId}`,
        tags:
          itemType === 'materi'
            ? ['course', courseId, 'materi']
            : ['course', courseId, 'tugas', itemId],
      });

      updates[`course_items/${courseId}/${itemId}/fileUrl`] = uploaded.url;
      updates[`course_items/${courseId}/${itemId}/fileName`] = uploaded.name || file.name;
      updates[`course_items/${courseId}/${itemId}/fileSize`] = uploaded.size ?? file.size;
      updates[`course_items/${courseId}/${itemId}/fileType`] = uploaded.fileType || file.type;
      updates[`course_items/${courseId}/${itemId}/thumbnailUrl`] = uploaded.thumbnailUrl || null;
      updates[`course_items/${courseId}/${itemId}/imagekitFileId`] = uploaded.fileId;
    }

    if (itemType === 'kuis') {
      if (nextTitleRaw !== null) updates[`course_quizzes/${courseId}/${itemId}/title`] = nextTitleRaw;
      if (nextDescriptionRaw !== null) updates[`course_quizzes/${courseId}/${itemId}/description`] = nextDescriptionRaw;
      if (nextTitleRaw !== null || nextDescriptionRaw !== null) {
        updates[`course_quizzes/${courseId}/${itemId}/updatedAt`] = now;
      }
    }

    if (itemType === 'absensi') {
      const dateRaw = body && Object.prototype.hasOwnProperty.call(body, 'date') ? normalizeString(body?.date) : null;
      const startTimeRaw = body && Object.prototype.hasOwnProperty.call(body, 'startTime') ? normalizeString(body?.startTime) : null;
      const endTimeRaw = body && Object.prototype.hasOwnProperty.call(body, 'endTime') ? normalizeString(body?.endTime) : null;
      const startAtRaw = body && Object.prototype.hasOwnProperty.call(body, 'startAt') ? normalizeString(body?.startAt) : null;
      const endAtRaw = body && Object.prototype.hasOwnProperty.call(body, 'endAt') ? normalizeString(body?.endAt) : null;

      const anySessionFieldProvided = [dateRaw, startTimeRaw, endTimeRaw, startAtRaw, endAtRaw].some(
        (v) => v !== null
      );
      if (anySessionFieldProvided) {
        if (!dateRaw || !isValidDateYYYYMMDD(dateRaw)) {
          return NextResponse.json({ error: 'Tanggal tidak valid' }, { status: 400 });
        }
        if (!startTimeRaw || !isValidTimeHHMM(startTimeRaw)) {
          return NextResponse.json({ error: 'Jam mulai wajib diisi (HH:MM)' }, { status: 400 });
        }
        if (!endTimeRaw || !isValidTimeHHMM(endTimeRaw)) {
          return NextResponse.json({ error: 'Jam selesai wajib diisi (HH:MM)' }, { status: 400 });
        }
        if (!startAtRaw || !endAtRaw) {
          return NextResponse.json({ error: 'Waktu mulai/selesai tidak valid' }, { status: 400 });
        }

        const parsedStartAt = new Date(startAtRaw);
        const parsedEndAt = new Date(endAtRaw);
        if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
          return NextResponse.json({ error: 'Waktu mulai/selesai tidak valid' }, { status: 400 });
        }
        if (parsedEndAt.getTime() <= parsedStartAt.getTime()) {
          return NextResponse.json({ error: 'Jam selesai harus lebih besar dari jam mulai' }, { status: 400 });
        }
        if (parsedEndAt.getTime() <= Date.now()) {
          return NextResponse.json({ error: 'Jam selesai harus di masa depan' }, { status: 400 });
        }

        updates[`course_attendance_sessions/${courseId}/${itemId}/date`] = dateRaw;
        updates[`course_attendance_sessions/${courseId}/${itemId}/startTime`] = startTimeRaw;
        updates[`course_attendance_sessions/${courseId}/${itemId}/endTime`] = endTimeRaw;
        updates[`course_attendance_sessions/${courseId}/${itemId}/startAt`] = parsedStartAt.toISOString();
        updates[`course_attendance_sessions/${courseId}/${itemId}/endAt`] = parsedEndAt.toISOString();
        updates[`course_attendance_sessions/${courseId}/${itemId}/updatedAt`] = now;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    updates[`course_items/${courseId}/${itemId}/updatedAt`] = now;
    await update(ref(database), updates);

    const updatedSnap = await get(ref(database, `course_items/${courseId}/${itemId}`));
    const updatedItem = updatedSnap.exists() ? (updatedSnap.val() as any) : currentItem;
    return NextResponse.json({ ok: true, item: { id: itemId, ...updatedItem } });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);
    const { id: courseId, itemId } = await params;

    const manage = await canManageCourse(courseId, session);
    if (!manage.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!manage.isOwner && !manage.isAdminLike) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const database = getRtdb();
    const itemSnap = await get(ref(database, `course_items/${courseId}/${itemId}`));
    if (!itemSnap.exists()) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });

    const item = itemSnap.val() as any;
    const itemType = normalizeString(item?.type).toLowerCase();

    const updates: Record<string, any> = {
      [`course_items/${courseId}/${itemId}`]: null,
      [`course_item_comments/${courseId}/${itemId}`]: null,
      [`course_item_submissions/${courseId}/${itemId}`]: null,
    };

    if (itemType === 'kuis') {
      updates[`course_quizzes/${courseId}/${itemId}`] = null;
      updates[`course_quiz_attempts/${courseId}/${itemId}`] = null;

      const attemptsSnap = await get(ref(database, `course_quiz_attempts/${courseId}/${itemId}`));
      if (attemptsSnap.exists()) {
        attemptsSnap.forEach((child) => {
          if (child.key) {
            updates[`user_quiz_attempts/${child.key}/${courseId}/${itemId}`] = null;
          }
        });
      }
    }

    if (itemType === 'absensi') {
      updates[`course_attendance_sessions/${courseId}/${itemId}`] = null;
      updates[`course_attendance_attempts/${courseId}/${itemId}`] = null;

      const attemptsSnap = await get(ref(database, `course_attendance_attempts/${courseId}/${itemId}`));
      if (attemptsSnap.exists()) {
        attemptsSnap.forEach((child) => {
          if (child.key) {
            updates[`user_attendance_attempts/${child.key}/${courseId}/${itemId}`] = null;
          }
        });
      }
    }

    await update(ref(database), updates);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
