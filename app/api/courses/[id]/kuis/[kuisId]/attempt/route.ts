import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { get, ref, update } from 'firebase/database';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb, getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function normalizeAnswerText(input: unknown) {
  return normalizeString(input).toLowerCase().replace(/\s+/g, ' ');
}

type AnswerType = 'multiple_choice' | 'short' | 'paragraph';
type PointsMode = 'auto' | 'custom';

function isValidAnswerType(input: string): input is AnswerType {
  return ['multiple_choice', 'short', 'paragraph'].includes(input);
}

function parsePointsMode(input: unknown): PointsMode {
  return normalizeString(input).toLowerCase() === 'custom' ? 'custom' : 'auto';
}

function splitPointsEvenly(totalPoints: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(totalPoints / count);
  const remainder = totalPoints % count;
  return Array.from({ length: count }, (_, idx) => base + (idx < remainder ? 1 : 0));
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

function resolveGrading(rawGrading: any, questions: any[]) {
  const enabledRaw = rawGrading?.enabled;
  const enabledConfigured = enabledRaw === undefined || enabledRaw === null ? null : Boolean(enabledRaw);
  const showScoreToStudent = Boolean(rawGrading?.showScoreToStudent ?? true);
  const pointsMode = parsePointsMode(rawGrading?.pointsMode);
  const totalPoints = Number.isFinite(rawGrading?.totalPoints) ? Number(rawGrading.totalPoints) : 100;

  const hasAllKeys = questions.every((q) => {
    if (q.answerType === 'multiple_choice') return q.answerKey !== null && q.answerKey !== undefined;
    return normalizeString(q.answerKey);
  });

  // Backward compat: kalau quiz lama belum punya config grading, nyalakan penilaian hanya kalau semua kunci ada.
  const enabled = enabledConfigured === null ? hasAllKeys : enabledConfigured;

  if (!enabled || !hasAllKeys) {
    return { enabled: false, showScoreToStudent: false, pointsMode: 'auto' as const, totalPoints: 0 };
  }

  return { enabled: true, showScoreToStudent, pointsMode, totalPoints: totalPoints || 100 };
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

    const database = getRtdb();
    const attemptSnap = await get(
      ref(database, `course_quiz_attempts/${courseId}/${kuisId}/${session.userId}`)
    );
    if (!attemptSnap.exists()) {
      return NextResponse.json({ ok: true, attempt: null });
    }

    const attempt = attemptSnap.val() as any;
    const scoreVisibleToStudent = Boolean(attempt?.showScoreToStudent ?? false);
    return NextResponse.json({
      ok: true,
      attempt: {
        submittedAt: attempt?.submittedAt || null,
        score: scoreVisibleToStudent && Number.isFinite(attempt?.score) ? Number(attempt.score) : null,
        totalPoints:
          scoreVisibleToStudent && Number.isFinite(attempt?.totalPoints)
            ? Number(attempt.totalPoints)
            : null,
        showScoreToStudent: scoreVisibleToStudent,
        answersByQuestionId: attempt?.answersByQuestionId || {},
      },
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; kuisId: string }> }
) {
  try {
    const session = requireSession(request);
    const { id: courseId, kuisId } = await params;

    const access = await canAccessCourse(courseId, session.userId);
    if (!access.exists) return NextResponse.json({ error: 'Kursus tidak ditemukan' }, { status: 404 });
    if (!access.isOwner && !access.isEnrolled) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const database = getRtdb();
    const existingAttemptSnap = await get(
      ref(database, `course_quiz_attempts/${courseId}/${kuisId}/${session.userId}`)
    );
    if (existingAttemptSnap.exists()) {
      return NextResponse.json({ error: 'Kuis ini sudah pernah dikirim' }, { status: 409 });
    }

    const quizSnap = await get(ref(database, `course_quizzes/${courseId}/${kuisId}`));
    if (!quizSnap.exists()) return NextResponse.json({ error: 'Kuis tidak ditemukan' }, { status: 404 });
    const quiz = quizSnap.val() as any;

    const rawQuestions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const questions = rawQuestions
      .map((q: any, idx: number) => {
        const id = normalizeString(q?.id) || `q_${idx + 1}`;
        const prompt = normalizeString(q?.prompt);
        const answerTypeRaw = normalizeString(q?.answerType);
        if (!prompt) return null;
        if (!isValidAnswerType(answerTypeRaw)) return null;
        if (answerTypeRaw === 'multiple_choice') {
          const optionsRaw = Array.isArray(q?.options) ? q.options : [];
          const options = optionsRaw.map((opt: unknown) => normalizeString(opt));
          if (options.length < 2) return null;
          return {
            id,
            prompt,
            answerType: answerTypeRaw,
            options,
            answerKey: q?.answerKey ?? null,
            points: Number.isFinite(q?.points) ? Number(q.points) : undefined,
          };
        }
        return {
          id,
          prompt,
          answerType: answerTypeRaw,
          answerKey: q?.answerKey ?? null,
          points: Number.isFinite(q?.points) ? Number(q.points) : undefined,
        };
      })
      .filter(Boolean) as any[];

    if (questions.length === 0) {
      return NextResponse.json({ error: 'Kuis tidak valid' }, { status: 400 });
    }

    const grading = resolveGrading(quiz?.grading, questions);

    const body = await request.json().catch(() => null);
    const answersInput = body?.answersByQuestionId && typeof body.answersByQuestionId === 'object'
      ? body.answersByQuestionId
      : (body?.answers && typeof body.answers === 'object' ? body.answers : null);
    if (!answersInput) return NextResponse.json({ error: 'Jawaban tidak valid' }, { status: 400 });

    const answersByQuestionId: Record<string, any> = {};
    for (const q of questions) {
      const rawAnswer = answersInput[q.id];
      if (q.answerType === 'multiple_choice') {
        const parsed = typeof rawAnswer === 'string' && rawAnswer.trim() !== '' ? Number(rawAnswer) : rawAnswer;
        if (!Number.isInteger(parsed)) {
          return NextResponse.json({ error: `Jawaban untuk soal "${q.prompt}" wajib dipilih` }, { status: 400 });
        }
        if (parsed < 0 || parsed >= q.options.length) {
          return NextResponse.json({ error: `Jawaban untuk soal "${q.prompt}" tidak valid` }, { status: 400 });
        }
        answersByQuestionId[q.id] = parsed;
      } else {
        const text = normalizeString(rawAnswer);
        if (!text) {
          return NextResponse.json({ error: `Jawaban untuk soal "${q.prompt}" wajib diisi` }, { status: 400 });
        }
        answersByQuestionId[q.id] = text;
      }
    }

    let score: number | null = null;
    let totalPoints: number | null = null;

    if (grading.enabled) {
      totalPoints = grading.totalPoints || 100;
      const pointsByIndex =
        grading.pointsMode === 'custom'
          ? questions.map((q) => (Number.isInteger(q.points) && q.points >= 0 ? q.points : 0))
          : splitPointsEvenly(totalPoints, questions.length);

      let sum = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const pts = pointsByIndex[i] ?? 0;
        let correct = false;
        if (q.answerType === 'multiple_choice') {
          correct = Number.isInteger(q.answerKey) && answersByQuestionId[q.id] === q.answerKey;
        } else {
          const key = normalizeAnswerText(q.answerKey);
          correct = Boolean(key) && normalizeAnswerText(answersByQuestionId[q.id]) === key;
        }
        if (correct) sum += pts;
      }
      score = sum;
    }

    const now = new Date().toISOString();
    const attemptRecord = {
      userId: session.userId,
      submittedAt: now,
      answersByQuestionId,
      score,
      totalPoints,
      gradingEnabled: grading.enabled,
      showScoreToStudent: grading.enabled ? grading.showScoreToStudent : false,
      pointsMode: grading.enabled ? grading.pointsMode : 'auto',
    };

    const updates: Record<string, any> = {};
    updates[`course_quiz_attempts/${courseId}/${kuisId}/${session.userId}`] = attemptRecord;
    updates[`user_quiz_attempts/${session.userId}/${courseId}/${kuisId}`] = {
      submittedAt: now,
      score,
      totalPoints,
      gradingEnabled: grading.enabled,
      showScoreToStudent: grading.enabled ? grading.showScoreToStudent : false,
    };
    await update(ref(database), updates);

    const scoreVisibleToStudent = grading.enabled ? grading.showScoreToStudent : false;
    return NextResponse.json({
      ok: true,
      attempt: {
        submittedAt: now,
        score: scoreVisibleToStudent ? score : null,
        totalPoints: scoreVisibleToStudent ? totalPoints : null,
        showScoreToStudent: scoreVisibleToStudent,
      },
    }, { status: 201 });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}
