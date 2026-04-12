import { NextRequest, NextResponse } from 'next/server';
import { get, push, ref, set, update } from 'firebase/database';

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

async function canAccessCourse(database: ReturnType<typeof getRtdb>, courseId: string, userId: string) {
  const [courseSnap, membershipSnap] = await Promise.all([
    get(ref(database, `courses/${courseId}`)),
    get(ref(database, `user_courses/${userId}/${courseId}`)),
  ]);
  if (!courseSnap.exists()) return { exists: false, ok: false, title: '', course: null as any, items: [] as any[] };
  const course = courseSnap.val() as any;
  const isOwner = normalizeString(course?.createdBy) === userId;
  const isEnrolled = membershipSnap.exists();
  if (!isOwner && !isEnrolled) return { exists: true, ok: false, title: '', course: null as any, items: [] as any[] };

  const itemsSnap = await get(ref(database, `course_items/${courseId}`));
  const items: any[] = [];
  if (itemsSnap.exists()) {
    itemsSnap.forEach((child) => {
      if (!child.key) return;
      const value = child.val() as any;
      items.push({
        id: child.key,
        type: normalizeString(value?.type),
        title: normalizeString(value?.title),
        description: normalizeString(value?.description),
        createdAt: value?.createdAt || null,
      });
    });
  }
  items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  return { exists: true, ok: true, title: normalizeString(course?.title), course, items };
}

function buildCourseContext(course: any, items: any[]) {
  const title = normalizeString(course?.title);
  const courseKey = normalizeString(course?.courseKey);
  const lines: string[] = [];
  lines.push(`Kursus terhubung: ${title || '(tanpa judul)'}${courseKey ? ` (kunci: ${courseKey})` : ''}`);
  if (!items.length) {
    lines.push('Konten kursus: (belum ada)');
    return lines.join('\n');
  }
  const byType: Record<string, any[]> = {};
  for (const it of items) {
    const t = normalizeString(it?.type) || 'lainnya';
    byType[t] = byType[t] || [];
    byType[t].push(it);
  }
  lines.push('Konten kursus (ringkas):');
  for (const type of Object.keys(byType)) {
    const list = byType[type];
    lines.push(`- ${type}: ${list.length} item`);
    for (const it of list.slice(0, 20)) {
      const t = normalizeString(it?.title) || it?.id;
      const d = normalizeString(it?.description);
      lines.push(`  • ${t}${d ? ` — ${d}` : ''}`);
    }
    if (list.length > 20) lines.push(`  • ...dan ${list.length - 20} lainnya`);
  }
  return lines.join('\n');
}

function toGeminiRole(role: string) {
  const r = normalizeString(role).toLowerCase();
  if (r === 'assistant' || r === 'model') return 'model';
  return 'user';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = requireSession(request);
    const { chatId } = await params;
    const database = getRtdb();

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi' }, { status: 503 });
    }

    const chatRef = ref(database, `ai_chats/${session.userId}/${chatId}`);
    const chatSnap = await get(chatRef);
    if (!chatSnap.exists()) {
      return NextResponse.json({ error: 'Chat tidak ditemukan' }, { status: 404 });
    }
    const chatValue = chatSnap.val() as any;

    const body = await request.json().catch(() => ({}));
    const message = normalizeString(body?.message);
    if (!message) {
      return NextResponse.json({ error: 'Pesan wajib diisi' }, { status: 400 });
    }

    const linkedCourseId = normalizeString(chatValue?.courseId);
    let courseContextText = '';
    if (linkedCourseId) {
      const access = await canAccessCourse(database, linkedCourseId, session.userId);
      if (access.exists && access.ok) {
        courseContextText = buildCourseContext(access.course, access.items);
      }
    }

    const messagesSnap = await get(ref(database, `ai_chat_messages/${session.userId}/${chatId}`));
    const history: Array<{ role: string; content: string; createdAt?: string | null }> = [];
    if (messagesSnap.exists()) {
      messagesSnap.forEach((child) => {
        const value = child.val() as any;
        history.push({
          role: normalizeString(value?.role) || 'user',
          content: normalizeString(value?.content),
          createdAt: value?.createdAt || null,
        });
      });
    }
    history.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const recent = history.filter((m) => m.content).slice(-20);

    const systemInstruction = [
      'Kamu adalah AI tutor e-learning yang membantu pengguna belajar.',
      'Jawab dengan bahasa Indonesia yang jelas, ringkas, dan actionable.',
      'Jika pertanyaan ambigu, ajukan 1-2 pertanyaan klarifikasi.',
      courseContextText ? `\nKonteks kursus:\n${courseContextText}` : '',
    ].filter(Boolean).join('\n');

    const contents = [
      ...recent.map((m) => ({
        role: toGeminiRole(m.role),
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const endpoint =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    });

    const geminiData: any = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      const msg =
        geminiData?.error?.message ||
        geminiData?.message ||
        'Gagal memanggil Gemini';
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const replyText =
      normalizeString(geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) ||
      normalizeString(geminiData?.candidates?.[0]?.content?.parts?.map?.((p: any) => p?.text).filter(Boolean).join('\n')) ||
      '';

    const ts = nowIso();
    const userMsgRef = push(ref(database, `ai_chat_messages/${session.userId}/${chatId}`));
    const assistantMsgRef = push(ref(database, `ai_chat_messages/${session.userId}/${chatId}`));

    await Promise.all([
      set(userMsgRef, { role: 'user', content: message, createdAt: ts }),
      set(assistantMsgRef, { role: 'assistant', content: replyText || '(Tidak ada respon)', createdAt: nowIso() }),
    ]);

    const updates: Record<string, any> = {};
    updates[`ai_chats/${session.userId}/${chatId}/updatedAt`] = nowIso();

    const currentTitle = normalizeString(chatValue?.title);
    if (!currentTitle || currentTitle === 'Chat baru') {
      updates[`ai_chats/${session.userId}/${chatId}/title`] = safeTitleFromMessage(message);
    }
    await update(ref(database), updates);

    return NextResponse.json({ ok: true, reply: replyText });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

