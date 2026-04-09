'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type AnswerType = 'multiple_choice' | 'short' | 'paragraph';
type PointsMode = 'auto' | 'custom';

type QuizQuestion = {
  id: string;
  prompt: string;
  answerType: AnswerType;
  options?: string[];
  points?: number;
};

type Quiz = {
  id: string;
  title: string;
  description?: string;
  grading?: {
    enabled?: boolean;
    showScoreToStudent?: boolean;
    pointsMode?: PointsMode;
    totalPoints?: number;
  };
  questions: QuizQuestion[];
};

type Attempt = {
  submittedAt: string | null;
  score: number | null;
  totalPoints: number | null;
  showScoreToStudent: boolean;
  answersByQuestionId: Record<string, any>;
};

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function formatDateTime(input: string | null) {
  if (!input) return '';
  const asDate = new Date(input);
  if (Number.isNaN(asDate.getTime())) return input;
  return asDate.toLocaleString();
}

function optionLabel(index: number) {
  if (index >= 0 && index < 26) return String.fromCharCode('A'.charCodeAt(0) + index);
  return String(index + 1);
}

export default function KuisAttemptClient({ courseId, kuisId }: { courseId: string; kuisId: string }) {
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, any>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [quizRes, attemptRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/kuis/${kuisId}`),
        fetch(`/api/courses/${courseId}/kuis/${kuisId}/attempt`),
      ]);

      const quizData = await quizRes.json().catch(() => ({}));
      if (!quizRes.ok) {
        setErrorMessage(quizData?.error || 'Gagal memuat kuis');
        return;
      }
      const fetchedQuiz = quizData?.quiz as Quiz;
      setQuiz(fetchedQuiz);

      const attemptData = await attemptRes.json().catch(() => ({}));
      if (!attemptRes.ok) {
        setErrorMessage(attemptData?.error || 'Gagal memuat status kuis');
        return;
      }
      const fetchedAttempt = attemptData?.attempt as Attempt | null;
      setAttempt(fetchedAttempt);

      if (fetchedAttempt?.answersByQuestionId) {
        setAnswersByQuestionId(fetchedAttempt.answersByQuestionId);
      } else {
        const initial: Record<string, any> = {};
        for (const q of fetchedQuiz?.questions || []) {
          initial[q.id] = q.answerType === 'multiple_choice' ? null : '';
        }
        setAnswersByQuestionId(initial);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat kuis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, kuisId]);

  const isLocked = Boolean(attempt?.submittedAt);

  const gradingInfo = useMemo(() => {
    const enabled = Boolean(quiz?.grading?.enabled ?? false);
    const showScoreToStudent = Boolean(quiz?.grading?.showScoreToStudent ?? true);
    const totalPoints = Number.isFinite(quiz?.grading?.totalPoints) ? Number(quiz?.grading?.totalPoints) : 100;
    return { enabled, showScoreToStudent, totalPoints };
  }, [quiz]);

  const validateBeforeSubmit = () => {
    if (!quiz) return 'Kuis tidak ditemukan';
    if (quiz.questions.length === 0) return 'Kuis tidak valid';
    for (const q of quiz.questions) {
      const ans = answersByQuestionId[q.id];
      if (q.answerType === 'multiple_choice') {
        if (!Number.isInteger(ans)) return 'Masih ada soal pilihan ganda yang belum dijawab';
      } else {
        if (!normalizeString(ans)) return 'Masih ada soal yang belum dijawab';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/kuis/${kuisId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answersByQuestionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal mengirim jawaban');
        return;
      }
      setAttempt({
        submittedAt: data?.attempt?.submittedAt || null,
        score: data?.attempt?.score ?? null,
        totalPoints: data?.attempt?.totalPoints ?? null,
        showScoreToStudent: Boolean(data?.attempt?.showScoreToStudent),
        answersByQuestionId,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengirim jawaban');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 md:p-8 text-purple-200">Memuat...</div>;
  }

  if (errorMessage) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-4">
          <Link href={`/dashboard/courses/${courseId}`} className="text-purple-200 hover:text-white underline">
            Kembali ke kursus
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!quiz) {
    return <div className="p-6 md:p-8 text-purple-200">Kuis tidak ditemukan.</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="text-purple-200 hover:text-white underline">
          â† Kembali ke kursus
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">{quiz.title || 'Kuis'}</h1>
        {quiz.description ? <div className="mt-1 text-sm text-purple-200">{quiz.description}</div> : null}
        {!isLocked ? (
          <div className="mt-3 rounded-lg border border-purple-600 bg-purple-900/20 px-4 py-3 text-xs text-purple-200">
            Kuis hanya bisa dikerjakan <span className="font-semibold text-purple-100">1 kali</span>. Setelah dikirim,
            kamu tidak bisa mengerjakan lagi.
          </div>
        ) : null}
      </div>

      {isLocked ? (
        <div className="mb-6 rounded-2xl border border-green-500/40 bg-green-500/10 p-5">
          <div className="text-sm font-semibold text-green-200">Jawaban sudah dikirim</div>
          <div className="mt-1 text-xs text-green-200/90">Dikirim: {formatDateTime(attempt?.submittedAt || null)}</div>
          {attempt?.showScoreToStudent && attempt?.score !== null && attempt?.totalPoints !== null ? (
            <div className="mt-3 text-white font-semibold">
              Nilai akhir: {attempt.score}/{attempt.totalPoints}
            </div>
          ) : gradingInfo.enabled ? (
            <div className="mt-3 text-xs text-green-200/90">Nilai tidak ditampilkan.</div>
          ) : (
            <div className="mt-3 text-xs text-green-200/90">Kuis ini tanpa penilaian.</div>
          )}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
            <div className="text-sm font-semibold text-purple-200">Soal #{idx + 1}</div>
            <div className="mt-2 text-white font-semibold whitespace-pre-wrap">{q.prompt}</div>

            <div className="mt-4">
              {q.answerType === 'multiple_choice' ? (
                <div className="grid gap-2">
                  {(q.options || []).map((opt, optIdx) => {
                    const checked = answersByQuestionId[q.id] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                          checked ? 'border-purple-400 bg-purple-800/30' : 'border-purple-700 bg-purple-950/20'
                        } ${isLocked ? 'opacity-80' : 'hover:bg-purple-900/40'}`}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          checked={checked}
                          disabled={isLocked}
                          onChange={() =>
                            setAnswersByQuestionId((prev) => ({
                              ...prev,
                              [q.id]: optIdx,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 accent-purple-600"
                        />
                        <div className="min-w-0">
                          <div className="text-purple-200 font-semibold">{optionLabel(optIdx)}</div>
                          <div className="text-white whitespace-pre-wrap">{opt}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : q.answerType === 'paragraph' ? (
                <textarea
                  value={answersByQuestionId[q.id] ?? ''}
                  disabled={isLocked}
                  onChange={(e) =>
                    setAnswersByQuestionId((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  className="w-full min-h-28 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
                  placeholder="Tulis jawaban..."
                  required
                />
              ) : (
                <input
                  value={answersByQuestionId[q.id] ?? ''}
                  disabled={isLocked}
                  onChange={(e) =>
                    setAnswersByQuestionId((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
                  placeholder="Tulis jawaban..."
                  required
                />
              )}
            </div>
          </div>
        ))}

        {errorMessage ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {!isLocked ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim jawaban'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/courses/${courseId}`)}
              className="px-6 py-2 rounded-lg border border-purple-600 bg-purple-900/20 text-purple-100 font-medium hover:bg-purple-900/50 transition"
            >
              Kembali ke kursus
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

