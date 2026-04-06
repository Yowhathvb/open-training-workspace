import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, push, ref, set } from 'firebase/database';

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
    if (item.type !== 'tugas') return NextResponse.json({ error: 'Bukan tipe tugas' }, { status: 400 });

    const database = getRtdb();
    const snapshot = await get(ref(database, `course_item_submissions/${courseId}/${itemId}`));
    const submissions: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const value = child.val();
        if (access.isOwner || value?.createdBy === session.userId) {
          submissions.push({ id: child.key, ...value });
        }
      });
    }

    submissions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return NextResponse.json({ ok: true, submissions });
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
    if (!access.isOwner && !access.isEnrolled) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const item = await getItem(courseId, itemId);
    if (!item) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 });
    if (item.type !== 'tugas') return NextResponse.json({ error: 'Bukan tipe tugas' }, { status: 400 });

    const contentType = request.headers.get('content-type') || '';
    let title = '';
    let description = '';
    let link = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = normalizeString(formData.get('title'));
      description = normalizeString(formData.get('description'));
      link = normalizeString(formData.get('link'));
      const fileEntry = formData.get('file');
      file = isFormDataFile(fileEntry) ? fileEntry : null;
    } else {
      const body = await request.json().catch(() => ({}));
      title = normalizeString(body?.title);
      description = normalizeString(body?.description);
      link = normalizeString(body?.link);
    }

    if (!title) return NextResponse.json({ error: 'Nama tugas wajib diisi' }, { status: 400 });
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json({ error: 'Link harus diawali http/https' }, { status: 400 });
    }

    let uploadMeta: Record<string, any> | null = null;
    if (file) {
      if (!isImageKitConfigured()) {
        return NextResponse.json({ error: 'ImageKit belum dikonfigurasi' }, { status: 503 });
      }
      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ error: 'Ukuran file terlalu besar (maks 25MB)' }, { status: 413 });
      }

      const uploaded = await uploadToImageKit(file, {
        folder: `/courses/${courseId}/tugas/${itemId}/${session.userId}`,
        tags: ['course', courseId, 'tugas', itemId, session.userId],
      });
      uploadMeta = {
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
    const submissionData = {
      title,
      description,
      link,
      ...(uploadMeta ? uploadMeta : {}),
      createdBy: session.userId,
      authorName: displayName,
      createdAt: now,
    };

    const database = getRtdb();
    const newRef = push(ref(database, `course_item_submissions/${courseId}/${itemId}`));
    await set(newRef, submissionData);

    return NextResponse.json(
      { ok: true, submission: { id: newRef.key, ...submissionData } },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
