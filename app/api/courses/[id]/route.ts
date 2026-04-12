import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref, update } from 'firebase/database';
import crypto from 'crypto';

import { requireRole, requireSession } from '@/lib/auth/api';
import { deleteCourseFromFirestoreBestEffort, syncCourseToFirestoreBestEffort } from '@/lib/firestore-sync-courses';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function normalizeCourseKey(input: unknown) {
  return normalizeString(input).toLowerCase();
}

function isValidCourseKey(key: string) {
  return key.length >= 3 && key.length <= 30 && !/\s/.test(key);
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);
    const { id: courseId } = await params;

    const database = getRtdb();
    const snapshot = await get(ref(database, `courses/${courseId}`));
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const current = snapshot.val() as any;
    const isOwner = normalizeString(current?.createdBy) === session.userId;
    const isAdminLike = session.role === 'root' || session.role === 'administrator';
    if (!isOwner && !isAdminLike) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const nextTitleRaw = body && Object.prototype.hasOwnProperty.call(body, 'title') ? normalizeString(body?.title) : null;
    const nextCourseKeyRaw = body && Object.prototype.hasOwnProperty.call(body, 'courseKey')
      ? normalizeCourseKey(body?.courseKey)
      : null;
    const nextPasswordRaw = body && Object.prototype.hasOwnProperty.call(body, 'password')
      ? (typeof body?.password === 'string' ? body.password : '')
      : null;

    const updates: Record<string, any> = {};
    const now = new Date().toISOString();

    if (nextTitleRaw !== null) {
      if (!nextTitleRaw) {
        return NextResponse.json({ error: 'Nama kursus wajib diisi' }, { status: 400 });
      }
      updates[`courses/${courseId}/title`] = nextTitleRaw;
    }

    const currentCourseKey = normalizeCourseKey(current?.courseKey);
    if (nextCourseKeyRaw !== null && nextCourseKeyRaw !== currentCourseKey) {
      if (!isValidCourseKey(nextCourseKeyRaw)) {
        return NextResponse.json(
          { error: 'Kunci kursus tidak valid (tanpa spasi, 3-30 karakter)' },
          { status: 400 }
        );
      }

      const keySnapshot = await get(ref(database, `course_keys/${nextCourseKeyRaw}`));
      if (keySnapshot.exists() && keySnapshot.val() !== courseId) {
        return NextResponse.json({ error: 'Kunci kursus sudah dipakai' }, { status: 400 });
      }

      updates[`courses/${courseId}/courseKey`] = nextCourseKeyRaw;
      updates[`course_keys/${nextCourseKeyRaw}`] = courseId;

      if (currentCourseKey) {
        const oldKeySnap = await get(ref(database, `course_keys/${currentCourseKey}`));
        if (oldKeySnap.exists() && oldKeySnap.val() === courseId) {
          updates[`course_keys/${currentCourseKey}`] = null;
        }
      }
    }

    if (nextPasswordRaw !== null) {
      const password = nextPasswordRaw;
      if (password && password.length < 4) {
        return NextResponse.json(
          { error: 'Password kursus minimal 4 karakter' },
          { status: 400 }
        );
      }
      if (password) {
        updates[`courses/${courseId}/passwordHash`] = hashPassword(password);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    updates[`courses/${courseId}/updatedAt`] = now;
    await update(ref(database), updates);

    const updatedSnapshot = await get(ref(database, `courses/${courseId}`));
    const updated = updatedSnapshot.exists() ? (updatedSnapshot.val() as any) : current;
    await syncCourseToFirestoreBestEffort(courseId, updated);

    return NextResponse.json({
      ok: true,
      course: {
        id: courseId,
        title: normalizeString(updated?.title),
        courseKey: normalizeString(updated?.courseKey),
        createdBy: normalizeString(updated?.createdBy),
        createdAt: updated?.createdAt || null,
      },
    });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);
    const { id: courseId } = await params;

    const database = getRtdb();
    const snapshot = await get(ref(database, `courses/${courseId}`));
    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }

    const course = snapshot.val() as any;
    const isOwner = normalizeString(course?.createdBy) === session.userId;
    const isAdminLike = session.role === 'root' || session.role === 'administrator';
    if (!isOwner && !isAdminLike) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const courseKey = normalizeCourseKey(course?.courseKey);

    const enrolledSnapshot = await get(ref(database, `enrollments/${courseId}`));
    const enrolledUserIds: string[] = [];
    if (enrolledSnapshot.exists()) {
      enrolledSnapshot.forEach((child) => {
        if (child.key) enrolledUserIds.push(child.key);
      });
    }

    const updates: Record<string, any> = {
      [`courses/${courseId}`]: null,
      [`course_items/${courseId}`]: null,
      [`course_item_comments/${courseId}`]: null,
      [`course_item_submissions/${courseId}`]: null,
      [`course_quizzes/${courseId}`]: null,
      [`course_quiz_attempts/${courseId}`]: null,
      [`course_attendance_sessions/${courseId}`]: null,
      [`course_attendance_attempts/${courseId}`]: null,
      [`enrollments/${courseId}`]: null,
    };

    for (const userId of enrolledUserIds) {
      updates[`user_courses/${userId}/${courseId}`] = null;
      updates[`user_quiz_attempts/${userId}/${courseId}`] = null;
      updates[`user_attendance_attempts/${userId}/${courseId}`] = null;
    }

    if (courseKey) {
      const keySnapshot = await get(ref(database, `course_keys/${courseKey}`));
      if (keySnapshot.exists() && keySnapshot.val() === courseId) {
        updates[`course_keys/${courseKey}`] = null;
      }
    }

    await update(ref(database), updates);

    const now = new Date().toISOString();
    await syncCourseToFirestoreBestEffort(courseId, { ...(course || {}), status: 'deleted', updatedAt: now });
    await deleteCourseFromFirestoreBestEffort(courseId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
