import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, push, ref, set } from 'firebase/database';

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

async function getItem(courseId: string, itemId: string) {
  const database = getRtdb();
  const itemSnap = await get(ref(database, `course_items/${courseId}/${itemId}`));
  if (!itemSnap.exists()) return null;
  return { id: itemId, ...(itemSnap.val() as any) };
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

    const item = await getItem(courseId, itemId);
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    if (item.type !== 'materi') return NextResponse.json({ error: 'Bukan tipe materi' }, { status: 400 });

    const database = getRtdb();
    const snapshot = await get(ref(database, `course_item_comments/${courseId}/${itemId}`));
    const comments: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        comments.push({ id: child.key, ...child.val() });
      });
    }

    comments.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return NextResponse.json({ ok: true, comments });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, itemId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const item = await getItem(courseId, itemId);
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    if (item.type !== 'materi') return NextResponse.json({ error: 'Bukan tipe materi' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const message = normalizeString(body?.message);
    if (!message) return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 });

    const now = new Date().toISOString();
    const displayName = session.namaLengkap || session.username || session.email;
    const commentData = {
      message,
      createdBy: session.userId,
      authorName: displayName,
      createdAt: now,
    };

    const database = getRtdb();
    const newRef = push(ref(database, `course_item_comments/${courseId}/${itemId}`));
    await set(newRef, commentData);

    return NextResponse.json({ ok: true, comment: { id: newRef.key, ...commentData } }, { status: 201 });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

