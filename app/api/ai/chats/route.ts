import { NextRequest, NextResponse } from 'next/server';
import { get, push, ref, set } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function nowIso() {
  return new Date().toISOString();
}

function safeTitleFromMessage(message: string) {
  const trimmed = normalizeString(message);
  if (!trimmed) return 'Chat baru';
  const singleLine = trimmed.replace(/\s+/g, ' ');
  return singleLine.length > 48 ? `${singleLine.slice(0, 48)}…` : singleLine;
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const database = getRtdb();

    const snapshot = await get(ref(database, `ai_chats/${session.userId}`));
    const chats: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        if (!child.key) return;
        const value = child.val() as any;
        chats.push({
          id: child.key,
          title: normalizeString(value?.title) || 'Chat baru',
          courseId: normalizeString(value?.courseId) || null,
          courseTitle: normalizeString(value?.courseTitle) || null,
          createdAt: value?.createdAt || null,
          updatedAt: value?.updatedAt || null,
        });
      });
    }

    chats.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    return NextResponse.json({ ok: true, chats });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request);
    const database = getRtdb();

    const body = await request.json().catch(() => ({}));
    const initialMessage = normalizeString(body?.initialMessage);
    const title = normalizeString(body?.title) || safeTitleFromMessage(initialMessage);

    const chatRef = push(ref(database, `ai_chats/${session.userId}`));
    if (!chatRef.key) {
      return NextResponse.json({ error: 'Gagal membuat chat' }, { status: 500 });
    }

    const ts = nowIso();
    const chat = {
      title,
      courseId: null,
      courseTitle: null,
      createdAt: ts,
      updatedAt: ts,
    };

    await set(chatRef, chat);

    return NextResponse.json(
      { ok: true, chat: { id: chatRef.key, ...chat } },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

