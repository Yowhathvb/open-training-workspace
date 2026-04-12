import { NextRequest, NextResponse } from 'next/server';
import { get, ref } from 'firebase/database';

import { requireRole } from '@/lib/auth/api';
import { getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function toPublicUser(userId: string, raw: any) {
  return {
    id: userId,
    username: normalizeString(raw?.username),
    namaLengkap: normalizeString(raw?.namaLengkap) || normalizeString(raw?.nama),
    email: normalizeString(raw?.email),
    nis: normalizeString(raw?.nis),
    role: normalizeString(raw?.role),
    status: normalizeString(raw?.status),
  };
}

type ItemType = 'materi' | 'tugas' | 'kuis' | 'absensi';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(request, ['guru', 'root', 'administrator']);
    const { id: courseId } = await params;
    const database = getRtdb();

    const courseSnap = await get(ref(database, `courses/${courseId}`));
    if (!courseSnap.exists()) {
      return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    }
    const course = courseSnap.val() as any;
    const isOwner = normalizeString(course?.createdBy) === session.userId;
    const isAdminLike = session.role === 'root' || session.role === 'administrator';
    if (!isOwner && !isAdminLike) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const [itemsSnap, enrollSnap] = await Promise.all([
      get(ref(database, `course_items/${courseId}`)),
      get(ref(database, `enrollments/${courseId}`)),
    ]);

    const items: Array<{ id: string; type: ItemType; title: string; createdAt?: string | null }> = [];
    if (itemsSnap.exists()) {
      itemsSnap.forEach((child) => {
        if (!child.key) return;
        const value = child.val() as any;
        const type = normalizeString(value?.type).toLowerCase() as ItemType;
        if (!type) return;
        items.push({
          id: child.key,
          type,
          title: normalizeString(value?.title),
          createdAt: value?.createdAt || null,
        });
      });
    }

    const tugasItems = items.filter((it) => it.type === 'tugas');
    const kuisItems = items.filter((it) => it.type === 'kuis');
    const absensiItems = items.filter((it) => it.type === 'absensi');

    const enrolledUserIds: string[] = [];
    if (enrollSnap.exists()) {
      enrollSnap.forEach((child) => {
        if (child.key) enrolledUserIds.push(child.key);
      });
    }

    const usersSnaps = await Promise.all(
      enrolledUserIds.map(async (userId) => {
        const snap = await get(ref(database, `users/${userId}`));
        return { userId, snap };
      })
    );

    const participants = usersSnaps
      .filter((x) => x.snap.exists())
      .map((x) => toPublicUser(x.userId, x.snap.val()));

    participants.sort((a, b) => {
      const an = a.namaLengkap || a.username || a.email || '';
      const bn = b.namaLengkap || b.username || b.email || '';
      return an.localeCompare(bn);
    });

    const tugasByItemId: Record<string, Record<string, { submittedAt: string | null }>> = {};
    const kuisByItemId: Record<
      string,
      Record<
        string,
        {
          submittedAt: string | null;
          score: number | null;
          totalPoints: number | null;
          gradingEnabled: boolean;
        }
      >
    > = {};
    const absensiByItemId: Record<string, Record<string, { submittedAt: string | null; status: string }>> = {};

    const [tugasSnaps, kuisSnaps, absensiSnaps] = await Promise.all([
      Promise.all(
        tugasItems.map(async (it) => ({
          itemId: it.id,
          snap: await get(ref(database, `course_item_submissions/${courseId}/${it.id}`)),
        }))
      ),
      Promise.all(
        kuisItems.map(async (it) => ({
          itemId: it.id,
          snap: await get(ref(database, `course_quiz_attempts/${courseId}/${it.id}`)),
        }))
      ),
      Promise.all(
        absensiItems.map(async (it) => ({
          itemId: it.id,
          snap: await get(ref(database, `course_attendance_attempts/${courseId}/${it.id}`)),
        }))
      ),
    ]);

    for (const { itemId, snap } of tugasSnaps) {
      const latestByUser: Record<string, string> = {};
      if (snap.exists()) {
        snap.forEach((child) => {
          const value = child.val() as any;
          const userId = normalizeString(value?.createdBy);
          if (!userId) return;
          const createdAt = normalizeString(value?.createdAt);
          if (!createdAt) return;
          const prev = latestByUser[userId];
          if (!prev || createdAt.localeCompare(prev) > 0) latestByUser[userId] = createdAt;
        });
      }

      const record: Record<string, { submittedAt: string | null }> = {};
      for (const userId of enrolledUserIds) {
        const submittedAt = latestByUser[userId] || null;
        if (submittedAt) record[userId] = { submittedAt };
      }
      tugasByItemId[itemId] = record;
    }

    for (const { itemId, snap } of kuisSnaps) {
      const record: Record<
        string,
        { submittedAt: string | null; score: number | null; totalPoints: number | null; gradingEnabled: boolean }
      > = {};
      if (snap.exists()) {
        snap.forEach((child) => {
          if (!child.key) return;
          const attempt = child.val() as any;
          const submittedAt = normalizeString(attempt?.submittedAt) || null;
          const gradingEnabled = Boolean(attempt?.gradingEnabled ?? false);
          const score = Number.isFinite(attempt?.score) ? Number(attempt.score) : null;
          const totalPoints = Number.isFinite(attempt?.totalPoints) ? Number(attempt.totalPoints) : null;
          if (!submittedAt) return;
          record[child.key] = {
            submittedAt,
            score: gradingEnabled ? score : null,
            totalPoints: gradingEnabled ? totalPoints : null,
            gradingEnabled,
          };
        });
      }
      kuisByItemId[itemId] = record;
    }

    for (const { itemId, snap } of absensiSnaps) {
      const record: Record<string, { submittedAt: string | null; status: string }> = {};
      if (snap.exists()) {
        snap.forEach((child) => {
          if (!child.key) return;
          const attempt = child.val() as any;
          const submittedAt = normalizeString(attempt?.submittedAt) || null;
          if (!submittedAt) return;
          record[child.key] = {
            submittedAt,
            status: normalizeString(attempt?.status),
          };
        });
      }
      absensiByItemId[itemId] = record;
    }

    const progressByUserId: Record<
      string,
      {
        tugasSubmitted: number;
        kuisSubmitted: number;
        absensiSubmitted: number;
        kuisScoreTotal: number;
        kuisMaxTotal: number;
      }
    > = {};
    for (const userId of enrolledUserIds) {
      progressByUserId[userId] = {
        tugasSubmitted: 0,
        kuisSubmitted: 0,
        absensiSubmitted: 0,
        kuisScoreTotal: 0,
        kuisMaxTotal: 0,
      };
    }

    for (const itemId of Object.keys(tugasByItemId)) {
      const map = tugasByItemId[itemId] || {};
      for (const userId of Object.keys(map)) {
        if (!progressByUserId[userId]) continue;
        progressByUserId[userId].tugasSubmitted += 1;
      }
    }

    for (const itemId of Object.keys(kuisByItemId)) {
      const map = kuisByItemId[itemId] || {};
      for (const userId of Object.keys(map)) {
        if (!progressByUserId[userId]) continue;
        progressByUserId[userId].kuisSubmitted += 1;
        const attempt = map[userId];
        if (attempt?.gradingEnabled && Number.isFinite(attempt?.score) && Number.isFinite(attempt?.totalPoints)) {
          progressByUserId[userId].kuisScoreTotal += Number(attempt.score);
          progressByUserId[userId].kuisMaxTotal += Number(attempt.totalPoints);
        }
      }
    }

    for (const itemId of Object.keys(absensiByItemId)) {
      const map = absensiByItemId[itemId] || {};
      for (const userId of Object.keys(map)) {
        if (!progressByUserId[userId]) continue;
        progressByUserId[userId].absensiSubmitted += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      participants,
      totals: {
        participants: enrolledUserIds.length,
        tugas: tugasItems.length,
        kuis: kuisItems.length,
        absensi: absensiItems.length,
      },
      items: {
        tugas: tugasItems.map((it) => ({ id: it.id, title: it.title })),
        kuis: kuisItems.map((it) => ({ id: it.id, title: it.title })),
        absensi: absensiItems.map((it) => ({ id: it.id, title: it.title })),
      },
      progressByUserId,
      tugasByItemId,
      kuisByItemId,
      absensiByItemId,
    });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

