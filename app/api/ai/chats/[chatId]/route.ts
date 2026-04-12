import { NextRequest, NextResponse } from 'next/server';
import { get, ref, remove, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function nowIso() {
  return new Date().toISOString();
}

async function canAccessCourse(database: ReturnType<typeof getRtdb>, courseId: string, userId: string) {
  const [courseSnap, membershipSnap] = await Promise.all([
    get(ref(database, `courses/${courseId}`)),
    get(ref(database, `user_courses/${userId}/${courseId}`)),
  ]);
  if (!courseSnap.exists()) return { exists: false, ok: false, title: '' };
  const course = courseSnap.val() as any;
  const isOwner = normalizeString(course?.createdBy) === userId;
  const isEnrolled = membershipSnap.exists();
  if (!isOwner && !isEnrolled) return { exists: true, ok: false, title: '' };
  return { exists: true, ok: true, title: normalizeString(course?.title) };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = requireSession(request);
    const { chatId } = await params;
    const database = getRtdb();

    const chatSnap = await get(ref(database, `ai_chats/${session.userId}/${chatId}`));
    if (!chatSnap.exists()) {
      return NextResponse.json({ error: 'Chat tidak ditemukan' }, { status: 404 });
    }

    const chatValue = chatSnap.val() as any;
    const messagesSnap = await get(ref(database, `ai_chat_messages/${session.userId}/${chatId}`));
    const messages: any[] = [];
    if (messagesSnap.exists()) {
      messagesSnap.forEach((child) => {
        if (!child.key) return;
        const value = child.val() as any;
        messages.push({
          id: child.key,
          role: normalizeString(value?.role) || 'user',
          content: normalizeString(value?.content),
          createdAt: value?.createdAt || null,
        });
      });
    }
    messages.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

    return NextResponse.json({
      ok: true,
      chat: {
        id: chatId,
        title: normalizeString(chatValue?.title) || 'Chat baru',
        courseId: normalizeString(chatValue?.courseId) || null,
        courseTitle: normalizeString(chatValue?.courseTitle) || null,
        createdAt: chatValue?.createdAt || null,
        updatedAt: chatValue?.updatedAt || null,
      },
      messages,
    });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = requireSession(request);
    const { chatId } = await params;
    const database = getRtdb();

    const chatRef = ref(database, `ai_chats/${session.userId}/${chatId}`);
    const chatSnap = await get(chatRef);
    if (!chatSnap.exists()) {
      return NextResponse.json({ error: 'Chat tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, any> = {};

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const title = normalizeString(body?.title);
      if (!title) return NextResponse.json({ error: 'Judul chat wajib diisi' }, { status: 400 });
      updates[`ai_chats/${session.userId}/${chatId}/title`] = title;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'courseId')) {
      const courseId = normalizeString(body?.courseId);
      if (!courseId) {
        updates[`ai_chats/${session.userId}/${chatId}/courseId`] = null;
        updates[`ai_chats/${session.userId}/${chatId}/courseTitle`] = null;
      } else {
        const access = await canAccessCourse(database, courseId, session.userId);
        if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
        if (!access.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
        updates[`ai_chats/${session.userId}/${chatId}/courseId`] = courseId;
        updates[`ai_chats/${session.userId}/${chatId}/courseTitle`] = access.title || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    updates[`ai_chats/${session.userId}/${chatId}/updatedAt`] = nowIso();
    await update(ref(database), updates);

    const updatedSnap = await get(chatRef);
    const value = updatedSnap.exists() ? (updatedSnap.val() as any) : (chatSnap.val() as any);
    return NextResponse.json({
      ok: true,
      chat: {
        id: chatId,
        title: normalizeString(value?.title) || 'Chat baru',
        courseId: normalizeString(value?.courseId) || null,
        courseTitle: normalizeString(value?.courseTitle) || null,
        createdAt: value?.createdAt || null,
        updatedAt: value?.updatedAt || null,
      },
    });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = requireSession(request);
    const { chatId } = await params;
    const database = getRtdb();

    const chatSnap = await get(ref(database, `ai_chats/${session.userId}/${chatId}`));
    if (!chatSnap.exists()) {
      return NextResponse.json({ error: 'Chat tidak ditemukan' }, { status: 404 });
    }

    await Promise.all([
      remove(ref(database, `ai_chats/${session.userId}/${chatId}`)),
      remove(ref(database, `ai_chat_messages/${session.userId}/${chatId}`)),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

