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

type ItemType = 'materi' | 'tugas' | 'kuis' | 'absensi';

function isValidType(input: string): input is ItemType {
  return ['materi', 'tugas', 'kuis', 'absensi'].includes(input);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const database = getRtdb();
    const snapshot = await get(ref(database, `course_items/${courseId}`));
    const items: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        items.push({ id: child.key, ...child.val() });
      });
    }

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
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

    const contentType = request.headers.get('content-type') || '';

    let type = '';
    let title = '';
    let description = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      type = normalizeString(formData.get('type')).toLowerCase();
      title = normalizeString(formData.get('title'));
      description = normalizeString(formData.get('description'));
      const fileEntry = formData.get('file');
      file = isFormDataFile(fileEntry) ? fileEntry : null;
    } else {
      const body = await request.json();
      type = normalizeString(body?.type).toLowerCase();
      title = normalizeString(body?.title);
      description = normalizeString(body?.description);
    }

    if (!isValidType(type)) {
      return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    const database = getRtdb();
    const newItemRef = push(ref(database, `course_items/${courseId}`));
    const newItemId = newItemRef.key;
    if (!newItemId) {
      return NextResponse.json({ error: 'Gagal membuat ID item' }, { status: 500 });
    }

    let uploadMeta: Record<string, any> | null = null;
    if ((type === 'materi' || type === 'tugas') && file) {
      if (!isImageKitConfigured()) {
        return NextResponse.json(
          { error: 'ImageKit belum dikonfigurasi' },
          { status: 503 }
        );
      }

      const maxBytes = 25 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: 'Ukuran file terlalu besar (maks 25MB)' },
          { status: 413 }
        );
      }

      const uploaded = await uploadToImageKit(file, {
        folder:
          type === 'materi'
            ? `/courses/${courseId}/materi`
            : `/courses/${courseId}/tugas/${newItemId}`,
        tags:
          type === 'materi'
            ? ['course', courseId, 'materi']
            : ['course', courseId, 'tugas', newItemId],
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
    const itemData = {
      type,
      title,
      description,
      ...(uploadMeta ? uploadMeta : {}),
      createdBy: session.userId,
      createdAt: now,
    };

    await set(newItemRef, itemData);

    return NextResponse.json({ ok: true, item: { id: newItemRef.key, ...itemData } }, { status: 201 });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
