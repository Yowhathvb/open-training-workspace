import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function safeFileName(input: unknown, fallback: string) {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[\\/:*?"<>|\r\n]+/g, '-');
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

function isAllowedDownloadUrl(urlString: string) {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
  if (endpoint) {
    const normalizedEndpoint = endpoint.replace(/\/+$/, '');
    return urlString.startsWith(`${normalizedEndpoint}/`);
  }

  return url.hostname === 'ik.imagekit.io';
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

    const item = itemSnap.val() as any;
    const fileUrl = typeof item?.fileUrl === 'string' ? item.fileUrl : '';
    if (!fileUrl) {
      return NextResponse.json({ error: 'File tidak tersedia' }, { status: 404 });
    }
    if (!isAllowedDownloadUrl(fileUrl)) {
      return NextResponse.json({ error: 'URL file tidak diizinkan' }, { status: 400 });
    }

    const upstream = await fetch(fileUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Gagal mengambil file' }, { status: 502 });
    }

    const fallbackPrefix =
      item?.type === 'tugas' ? 'tugas' : item?.type === 'materi' ? 'materi' : 'file';
    const filename = safeFileName(item?.fileName, `${fallbackPrefix}-${itemId}`);
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    const len = upstream.headers.get('content-length');
    if (len) headers.set('Content-Length', len);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(upstream.body as any, { status: 200, headers });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
