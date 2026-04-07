import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, push, ref, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

type AnswerType = 'multiple_choice' | 'short' | 'paragraph';

function isValidAnswerType(input: string): input is AnswerType {
  return ['multiple_choice', 'short', 'paragraph'].includes(input);
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

    const body = await request.json().catch(() => null);
    const title = normalizeString(body?.title);
    const description = normalizeString(body?.description);
    const rawQuestions = Array.isArray(body?.questions) ? body?.questions : [];

    if (!title) return NextResponse.json({ error: 'Judul kuis wajib diisi' }, { status: 400 });
    if (rawQuestions.length === 0) return NextResponse.json({ error: 'Minimal 1 soal' }, { status: 400 });

    const questions = rawQuestions.map((q: any, idx: number) => {
      const prompt = normalizeString(q?.prompt);
      const answerTypeRaw = normalizeString(q?.answerType);
      const id = normalizeString(q?.id) || `q_${idx + 1}`;

      if (!prompt) throw Object.assign(new Error(`Soal #${idx + 1} wajib diisi`), { status: 400 });
      if (!isValidAnswerType(answerTypeRaw)) {
        throw Object.assign(new Error(`Soal #${idx + 1}: jenis jawaban tidak valid`), { status: 400 });
      }

      if (answerTypeRaw === 'multiple_choice') {
        const optionsRaw = Array.isArray(q?.options) ? q.options : [];
        const options = optionsRaw.map((opt: unknown) => normalizeString(opt));

        if (options.length < 2) throw Object.assign(new Error(`Soal #${idx + 1}: minimal 2 pilihan`), { status: 400 });
        if (options.length > 26) throw Object.assign(new Error(`Soal #${idx + 1}: maksimal 26 pilihan (A-Z)`), { status: 400 });
        for (let i = 0; i < options.length; i++) {
          if (!options[i]) throw Object.assign(new Error(`Soal #${idx + 1}: pilihan tidak boleh kosong`), { status: 400 });
        }

        let answerKey: number | null = null;
        const rawAnswerKeyIndex = q?.answerKeyIndex;
        if (rawAnswerKeyIndex !== undefined && rawAnswerKeyIndex !== null && rawAnswerKeyIndex !== '') {
          const parsed = Number(rawAnswerKeyIndex);
          if (!Number.isInteger(parsed)) {
            throw Object.assign(new Error(`Soal #${idx + 1}: kunci jawaban tidak valid`), { status: 400 });
          }
          if (parsed < 0 || parsed >= options.length) {
            throw Object.assign(new Error(`Soal #${idx + 1}: kunci jawaban di luar pilihan`), { status: 400 });
          }
          answerKey = parsed;
        }

        return {
          id,
          prompt,
          answerType: answerTypeRaw,
          options,
          answerKey,
        };
      }

      const answerKeyText = normalizeString(q?.answerKeyText);
      return {
        id,
        prompt,
        answerType: answerTypeRaw,
        answerKey: answerKeyText || null,
      };
    });

    const now = new Date().toISOString();
    const itemData = {
      type: 'kuis',
      title,
      description,
      createdBy: session.userId,
      createdAt: now,
    };

    const kuisData = {
      title,
      description,
      questions,
      createdBy: session.userId,
      createdAt: now,
    };

    const database = getRtdb();
    const newItemRef = push(ref(database, `course_items/${courseId}`));
    if (!newItemRef.key) return NextResponse.json({ error: 'Gagal membuat kuis' }, { status: 500 });

    const updates: Record<string, any> = {};
    updates[`course_items/${courseId}/${newItemRef.key}`] = itemData;
    updates[`course_quizzes/${courseId}/${newItemRef.key}`] = kuisData;
    await update(ref(database), updates);

    return NextResponse.json(
      { ok: true, item: { id: newItemRef.key, ...itemData } },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

