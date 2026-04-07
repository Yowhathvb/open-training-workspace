'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AnswerType = 'multiple_choice' | 'short' | 'paragraph';

type QuestionDraft = {
  id: string;
  prompt: string;
  answerType: AnswerType;
  options: string[];
  answerKeyIndex: number | null;
  answerKeyText: string;
};

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return `${prefix}_${(crypto as any).randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function optionLabel(index: number) {
  if (index >= 0 && index < 26) return String.fromCharCode('A'.charCodeAt(0) + index);
  return String(index + 1);
}

function makeQuestion(): QuestionDraft {
  return {
    id: makeId('q'),
    prompt: '',
    answerType: 'multiple_choice',
    options: ['', ''],
    answerKeyIndex: null,
    answerKeyText: '',
  };
}

export default function KuisCreateClient({ courseId }: { courseId: string }) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([makeQuestion()]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return 'Judul kuis wajib diisi';
    if (questions.length === 0) return 'Minimal 1 soal';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Soal #${i + 1} wajib diisi`;

      if (q.answerType === 'multiple_choice') {
        if (q.options.length < 2) return `Soal #${i + 1}: minimal 2 pilihan`;
        if (q.options.length > 26) return `Soal #${i + 1}: maksimal 26 pilihan (A-Z)`;
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) return `Soal #${i + 1}: pilihan ${optionLabel(j)} wajib diisi`;
        }
        if (q.answerKeyIndex !== null) {
          if (!Number.isInteger(q.answerKeyIndex)) return `Soal #${i + 1}: kunci jawaban tidak valid`;
          if (q.answerKeyIndex < 0 || q.answerKeyIndex >= q.options.length) {
            return `Soal #${i + 1}: kunci jawaban di luar pilihan`;
          }
        }
      }
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map((q) => {
          if (q.answerType === 'multiple_choice') {
            return {
              id: q.id,
              prompt: q.prompt.trim(),
              answerType: q.answerType,
              options: q.options.map((opt) => opt.trim()),
              answerKeyIndex: q.answerKeyIndex,
            };
          }
          return {
            id: q.id,
            prompt: q.prompt.trim(),
            answerType: q.answerType,
            answerKeyText: q.answerKeyText.trim(),
          };
        }),
      };

      const res = await fetch(`/api/courses/${courseId}/kuis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal menyimpan kuis');
        return;
      }

      router.push(`/dashboard/courses/${courseId}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan kuis');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="text-purple-200 hover:text-white underline">
          â† Kembali ke kursus
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">Buat Kuis</h1>
        <p className="mt-1 text-sm text-purple-200">
          Tambahkan soal, jenis jawaban, dan kunci jawaban (opsional). Untuk pilihan ganda, kunci jawaban pilih salah
          satu opsi (A-Z).
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Judul kuis</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Contoh: Kuis Bab 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Deskripsi (opsional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Instruksi singkat..."
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {questions.map((q, index) => (
            <div key={q.id} className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-purple-200">Soal #{index + 1}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                  disabled={questions.length <= 1}
                  className="shrink-0 rounded-lg border border-purple-600 bg-purple-900/20 px-3 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hapus soal
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Soal</label>
                  <textarea
                    value={q.prompt}
                    onChange={(e) =>
                      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)))
                    }
                    className="w-full min-h-24 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Tulis pertanyaan..."
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Jenis jawaban</label>
                    <select
                      value={q.answerType}
                      onChange={(e) => {
                        const nextType = e.target.value as AnswerType;
                        setQuestions((prev) =>
                          prev.map((x) => {
                            if (x.id !== q.id) return x;
                            if (nextType === 'multiple_choice') {
                              return {
                                ...x,
                                answerType: nextType,
                                options: x.options.length >= 2 ? x.options : ['', ''],
                                answerKeyIndex: null,
                                answerKeyText: '',
                              };
                            }
                            return {
                              ...x,
                              answerType: nextType,
                              options: [],
                              answerKeyIndex: null,
                              answerKeyText: x.answerKeyText || '',
                            };
                          })
                        );
                      }}
                      className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="multiple_choice">Pilihan ganda</option>
                      <option value="short">Jawaban singkat</option>
                      <option value="paragraph">Paragraf</option>
                    </select>
                  </div>

                  {q.answerType === 'multiple_choice' ? (
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Kunci jawaban (opsional)</label>
                      <select
                        value={q.answerKeyIndex === null ? '' : String(q.answerKeyIndex)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQuestions((prev) =>
                            prev.map((x) =>
                              x.id === q.id
                                ? { ...x, answerKeyIndex: value === '' ? null : Number(value) }
                                : x
                            )
                          );
                        }}
                        className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Tidak ada</option>
                        {q.options.map((opt, optIndex) => (
                          <option key={optIndex} value={String(optIndex)}>
                            {optionLabel(optIndex)}
                            {opt.trim() ? ` - ${opt.trim().slice(0, 40)}` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs text-purple-200">
                        Jika pilihan belum lengkap, isi dulu opsi A-Z lalu pilih kuncinya.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Kunci jawaban (opsional)</label>
                      {q.answerType === 'paragraph' ? (
                        <textarea
                          value={q.answerKeyText}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((x) => (x.id === q.id ? { ...x, answerKeyText: e.target.value } : x))
                            )
                          }
                          className="w-full min-h-20 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          placeholder="Contoh jawaban / rubrik singkat..."
                        />
                      ) : (
                        <input
                          value={q.answerKeyText}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((x) => (x.id === q.id ? { ...x, answerKeyText: e.target.value } : x))
                            )
                          }
                          className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          placeholder="Jawaban yang benar (opsional)..."
                        />
                      )}
                    </div>
                  )}
                </div>

                {q.answerType === 'multiple_choice' && (
                  <div className="rounded-xl border border-purple-700 bg-purple-950/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-purple-100">Pilihan jawaban</div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((prev) =>
                            prev.map((x) =>
                              x.id === q.id
                                ? x.options.length >= 26
                                  ? x
                                  : { ...x, options: [...x.options, ''] }
                                : x
                            )
                          )
                        }
                        disabled={q.options.length >= 26}
                        className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tambah opsi
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <div className="w-7 shrink-0 text-center text-sm font-semibold text-purple-200">
                            {optionLabel(optIndex)}
                          </div>
                          <input
                            value={opt}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setQuestions((prev) =>
                                prev.map((x) => {
                                  if (x.id !== q.id) return x;
                                  const nextOptions = [...x.options];
                                  nextOptions[optIndex] = nextValue;
                                  return { ...x, options: nextOptions };
                                })
                              );
                            }}
                            className="flex-1 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            placeholder={`Opsi ${optionLabel(optIndex)}`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setQuestions((prev) =>
                                prev.map((x) => {
                                  if (x.id !== q.id) return x;
                                  if (x.options.length <= 2) return x;
                                  const nextOptions = x.options.filter((_, idx) => idx !== optIndex);
                                  let nextKey = x.answerKeyIndex;
                                  if (nextKey !== null) {
                                    if (nextKey === optIndex) nextKey = null;
                                    else if (nextKey > optIndex) nextKey = nextKey - 1;
                                  }
                                  return { ...x, options: nextOptions, answerKeyIndex: nextKey };
                                })
                              );
                            }}
                            disabled={q.options.length <= 2}
                            className="shrink-0 rounded-lg border border-purple-600 bg-purple-900/20 px-3 py-2 text-xs font-medium text-purple-100 hover:bg-purple-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-purple-200">
                      Minimal 2 opsi, maksimal 26 (A-Z).
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, makeQuestion()])}
              className="rounded-lg border border-purple-600 bg-purple-900/20 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-900/50 transition"
            >
              Tambah soal
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan kuis'}
          </button>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="px-6 py-2 rounded-lg border border-purple-600 bg-purple-900/20 text-purple-100 font-medium hover:bg-purple-900/50 transition"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
