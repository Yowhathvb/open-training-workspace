import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

type AnswerType = 'multiple_choice' | 'short' | 'paragraph';
type PointsMode = 'auto' | 'custom';

function isValidAnswerType(input: string): input is AnswerType {
  return ['multiple_choice', 'short', 'paragraph'].includes(input);
}

function parsePointsMode(input: unknown): PointsMode {
  return normalizeString(input).toLowerCase() === 'custom' ? 'custom' : 'auto';
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
  { params }: { params: Promise<{ id: string; kuisId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, kuisId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const canManage =
      access.isOwner && ['guru', 'root', 'administrator'].includes(session.role);

    const database = getRtdb();
    const snapshot = await get(ref(database, `course_quizzes/${courseId}/${kuisId}`));
    if (!snapshot.exists()) return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });

    const quiz = snapshot.val() as any;
    const rawGrading = quiz?.grading || null;
    const enabledRaw = rawGrading?.enabled;
    const enabledConfigured = enabledRaw === undefined || enabledRaw === null ? null : Boolean(enabledRaw);
    const showScoreToStudent = Boolean(rawGrading?.showScoreToStudent ?? true);
    const pointsMode = parsePointsMode(rawGrading?.pointsMode);
    const totalPoints = Number.isFinite(rawGrading?.totalPoints) ? Number(rawGrading.totalPoints) : 100;

    const rawQuestions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const hasAllKeys = rawQuestions.every((q: any) => {
      const answerTypeRaw = normalizeString(q?.answerType);
      if (!isValidAnswerType(answerTypeRaw)) return false;
      if (answerTypeRaw === 'multiple_choice') return q?.answerKey !== null && q?.answerKey !== undefined;
      return normalizeString(q?.answerKey);
    });
    const gradingEnabled = (enabledConfigured === null ? hasAllKeys : enabledConfigured) && hasAllKeys;
    const questions = rawQuestions
      .map((q: any, idx: number) => {
        const id = normalizeString(q?.id) || `q_${idx + 1}`;
        const prompt = normalizeString(q?.prompt);
        const answerTypeRaw = normalizeString(q?.answerType);
        if (!prompt) return null;
        if (!isValidAnswerType(answerTypeRaw)) return null;

        const points = Number.isFinite(q?.points) ? Number(q.points) : undefined;

        if (answerTypeRaw === 'multiple_choice') {
          const optionsRaw = Array.isArray(q?.options) ? q.options : [];
          const options = optionsRaw.map((opt: unknown) => normalizeString(opt)).filter(Boolean);
          if (options.length < 2) return null;
          const payload: any = { id, prompt, answerType: answerTypeRaw, options, ...(points !== undefined ? { points } : {}) };
          if (canManage) payload.answerKey = q?.answerKey ?? null;
          return payload;
        }

        const payload: any = { id, prompt, answerType: answerTypeRaw, ...(points !== undefined ? { points } : {}) };
        if (canManage) payload.answerKey = q?.answerKey ?? null;
        return payload;
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      canManage,
      quiz: {
        id: kuisId,
        title: normalizeString(quiz?.title),
        description: normalizeString(quiz?.description),
        grading: {
          enabled: gradingEnabled,
          showScoreToStudent,
          pointsMode,
          totalPoints,
        },
        questions,
        createdBy: normalizeString(quiz?.createdBy),
        createdAt: quiz?.createdAt || null,
      },
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
