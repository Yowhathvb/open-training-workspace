'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useMemo, useState } from 'react';

type Course = {
  id: string;
  title: string;
  courseKey: string;
  createdBy: string;
  createdAt?: string | null;
};

type ItemType = 'materi' | 'tugas' | 'kuis' | 'absensi';

type CourseItem = {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  createdAt?: string;
};

type Submission = {
  id: string;
  title: string;
  description?: string;
  link?: string;
  fileUrl?: string;
  fileName?: string;
  createdBy?: string;
  authorName?: string;
  createdAt?: string;
};

type Comment = {
  id: string;
  message: string;
  createdBy?: string;
  authorName?: string;
  createdAt?: string;
};

type QuizAttemptMeta = {
  submittedAt?: string | null;
  score?: number | null;
  totalPoints?: number | null;
  gradingEnabled?: boolean;
  showScoreToStudent?: boolean;
};

type AttendanceAttemptMeta = {
  submittedAt?: string | null;
  status?: string | null;
};

function formatLocalYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function showAlertError(message: string) {
  if (typeof window === 'undefined') return;
  const Swal = (window as any).Swal;
  if (Swal?.fire) {
    await Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: message,
      confirmButtonColor: '#7c3aed',
    });
    return;
  }
  window.alert(message);
}

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [items, setItems] = useState<CourseItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [type, setType] = useState<ItemType>('materi');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => formatLocalYYYYMMDD(new Date()));
  const [attendanceStartTime, setAttendanceStartTime] = useState('');
  const [attendanceEndTime, setAttendanceEndTime] = useState('');

  const [submissionsOpen, setSubmissionsOpen] = useState<Record<string, boolean>>({});
  const [submissionsByItem, setSubmissionsByItem] = useState<Record<string, Submission[]>>({});
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [submissionsError, setSubmissionsError] = useState<Record<string, string | null>>({});

  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByItem, setCommentsByItem] = useState<Record<string, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentsError, setCommentsError] = useState<Record<string, string | null>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const [quizAttemptsById, setQuizAttemptsById] = useState<Record<string, QuizAttemptMeta>>({});
  const [attendanceAttemptsById, setAttendanceAttemptsById] = useState<Record<string, AttendanceAttemptMeta>>({});

  const grouped = useMemo(() => {
    const map: Record<ItemType, CourseItem[]> = {
      materi: [],
      tugas: [],
      kuis: [],
      absensi: [],
    };
    for (const item of items) map[item.type]?.push(item);
    return map;
  }, [items]);

  const fetchAll = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const courseRes = await fetch(`/api/courses/${courseId}`);
      const courseData = await courseRes.json().catch(() => ({}));
      if (!courseRes.ok) {
        setErrorMessage(courseData?.error || 'Gagal memuat kursus');
        return;
      }
      setCourse(courseData.course);
      setCanManage(Boolean(courseData.canManage));

      const itemsRes = await fetch(`/api/courses/${courseId}/items`);
      const itemsData = await itemsRes.json().catch(() => ({}));
      if (!itemsRes.ok) {
        setErrorMessage(itemsData?.error || 'Gagal memuat konten');
        return;
      }
      const fetchedItems = itemsData.items || [];
      setItems(fetchedItems);

      const hasQuiz = Array.isArray(fetchedItems) && fetchedItems.some((it: any) => it?.type === 'kuis');
      const hasAbsensi = Array.isArray(fetchedItems) && fetchedItems.some((it: any) => it?.type === 'absensi');

      if (!hasQuiz) {
        setQuizAttemptsById({});
      } else {
        const attemptsRes = await fetch(`/api/courses/${courseId}/kuis/attempts`);
        const attemptsData = await attemptsRes.json().catch(() => ({}));
        setQuizAttemptsById(attemptsRes.ok ? (attemptsData?.attemptsByKuisId || {}) : {});
      }

      if (!hasAbsensi) {
        setAttendanceAttemptsById({});
      } else {
        const attemptsRes = await fetch(`/api/courses/${courseId}/absensi/attempts`);
        const attemptsData = await attemptsRes.json().catch(() => ({}));
        setAttendanceAttemptsById(attemptsRes.ok ? (attemptsData?.attemptsByAbsensiId || {}) : {});
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchSubmissions = async (itemId: string) => {
    setSubmissionsLoading((prev) => ({ ...prev, [itemId]: true }));
    setSubmissionsError((prev) => ({ ...prev, [itemId]: null }));
    try {
      const res = await fetch(`/api/courses/${courseId}/items/${itemId}/submissions`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmissionsError((prev) => ({
          ...prev,
          [itemId]: data?.error || 'Gagal memuat pengumpulan',
        }));
        return;
      }
      setSubmissionsByItem((prev) => ({ ...prev, [itemId]: data?.submissions || [] }));
    } catch (err: any) {
      setSubmissionsError((prev) => ({
        ...prev,
        [itemId]: err?.message || 'Gagal memuat pengumpulan',
      }));
    } finally {
      setSubmissionsLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const toggleSubmissions = async (itemId: string) => {
    const nextOpen = !Boolean(submissionsOpen[itemId]);
    setSubmissionsOpen((prev) => ({ ...prev, [itemId]: nextOpen }));
    if (nextOpen && submissionsByItem[itemId] === undefined) {
      await fetchSubmissions(itemId);
    }
  };

  const fetchComments = async (itemId: string) => {
    setCommentsLoading((prev) => ({ ...prev, [itemId]: true }));
    setCommentsError((prev) => ({ ...prev, [itemId]: null }));
    try {
      const res = await fetch(`/api/courses/${courseId}/items/${itemId}/comments`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentsError((prev) => ({
          ...prev,
          [itemId]: data?.error || 'Gagal memuat komentar',
        }));
        return;
      }
      setCommentsByItem((prev) => ({ ...prev, [itemId]: data?.comments || [] }));
    } catch (err: any) {
      setCommentsError((prev) => ({ ...prev, [itemId]: err?.message || 'Gagal memuat komentar' }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const toggleComments = async (itemId: string) => {
    const nextOpen = !Boolean(commentsOpen[itemId]);
    setCommentsOpen((prev) => ({ ...prev, [itemId]: nextOpen }));
    if (nextOpen && commentsByItem[itemId] === undefined) {
      await fetchComments(itemId);
    }
  };

  const handleAddComment = async (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    setCommentsLoading((prev) => ({ ...prev, [itemId]: true }));
    setCommentsError((prev) => ({ ...prev, [itemId]: null }));
    try {
      const message = (commentDraft[itemId] || '').trim();
      const res = await fetch(`/api/courses/${courseId}/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentsError((prev) => ({
          ...prev,
          [itemId]: data?.error || 'Gagal mengirim komentar',
        }));
        return;
      }

      setCommentDraft((prev) => ({ ...prev, [itemId]: '' }));
      await fetchComments(itemId);
      setCommentsOpen((prev) => ({ ...prev, [itemId]: true }));
    } catch (err: any) {
      setCommentsError((prev) => ({ ...prev, [itemId]: err?.message || 'Gagal mengirim komentar' }));
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setErrorMessage(null);
    try {
      if (type === 'absensi') {
        const date = attendanceDate;
        const startTime = attendanceStartTime;
        const endTime = attendanceEndTime;
        if (!date) {
          await showAlertError('Tanggal wajib diisi');
          return;
        }
        if (!startTime) {
          await showAlertError('Jam mulai wajib diisi');
          return;
        }
        if (!endTime) {
          await showAlertError('Jam selesai wajib diisi');
          return;
        }
        const startAtDate = new Date(`${date}T${startTime}:00`);
        const endAtDate = new Date(`${date}T${endTime}:00`);
        if (Number.isNaN(startAtDate.getTime()) || Number.isNaN(endAtDate.getTime())) {
          await showAlertError('Tanggal/jam tidak valid');
          return;
        }
        if (endAtDate.getTime() <= startAtDate.getTime()) {
          await showAlertError('Jam selesai harus lebih besar dari jam mulai');
          return;
        }
        if (endAtDate.getTime() <= Date.now()) {
          await showAlertError('Jam selesai harus di masa depan');
          return;
        }

        const res = await fetch(`/api/courses/${courseId}/absensi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            date,
            startTime,
            endTime,
            startAt: startAtDate.toISOString(),
            endAt: endAtDate.toISOString(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          await showAlertError(data?.error || 'Gagal membuat absensi');
          return;
        }

        setTitle('');
        setDescription('');
        setAttendanceDate(formatLocalYYYYMMDD(new Date()));
        setAttendanceStartTime('');
        setAttendanceEndTime('');
        await fetchAll();
        return;
      }

      const isWithFile = (type === 'materi' || type === 'tugas') && Boolean(file);
      const res = await fetch(`/api/courses/${courseId}/items`, isWithFile
        ? (() => {
            const form = new FormData();
            form.append('type', type);
            form.append('title', title);
            form.append('description', description);
            if (file) form.append('file', file);
            return { method: 'POST', body: form };
          })()
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, title, description }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal menambah konten');
        return;
      }
      setTitle('');
      setDescription('');
      setFile(null);
      await fetchAll();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menambah konten');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 md:p-8 text-purple-200">Memuat...</div>;
  }

  if (errorMessage) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="p-6 md:p-8 text-purple-200">Kursus tidak ditemukan.</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/sweetalert2@11"
        strategy="afterInteractive"
      />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
        <p className="text-purple-200">
          Kunci: <span className="font-mono">{course.courseKey}</span>
        </p>
      </div>

      {canManage && (
        <div className="mb-10 rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
           <h2 className="text-lg font-semibold text-white">Tambah Konten</h2>
           <p className="mt-1 text-sm text-purple-200">
            Guru bisa menambahkan materi, tugas, atau absensi (dengan tanggal & batas jam). Kuis dibuat lewat tombol khusus.
           </p>

           <form onSubmit={handleAdd} className="mt-5 grid gap-4 md:grid-cols-3">
             <div>
               <label className="block text-sm font-semibold text-white mb-2">Tipe</label>
              <select
                value={type}
                  onChange={(e) => {
                    const nextType = e.target.value as ItemType;
                    setType(nextType);
                    setFile(null);
                    if (nextType === 'absensi') {
                      setTitle('');
                    }
                    if (nextType !== 'absensi') {
                      setAttendanceStartTime('');
                      setAttendanceEndTime('');
                    }
                  }}
                 className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
               >
                 <option value="materi">Materi</option>
                 <option value="tugas">Tugas</option>
                 <option value="absensi">Absensi</option>
               </select>

              <div className="mt-3">
                <Link
                  href={`/dashboard/courses/${courseId}/kuis/new`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-purple-600 bg-purple-900/30 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-900/50 transition"
                >
                  Buat Kuis
                </Link>
              </div>
            </div>
            {type !== 'absensi' ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white mb-2">Judul</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="Judul konten"
                  required
                />
              </div>
            ) : (
              <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Tanggal</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setAttendanceDate(formatLocalYYYYMMDD(new Date()))}
                      className="shrink-0 rounded-lg border border-purple-600 bg-purple-900/30 px-3 py-3 text-xs font-medium text-purple-100 hover:bg-purple-900/50 transition"
                    >
                      Today
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Jam mulai</label>
                  <input
                    type="time"
                    value={attendanceStartTime}
                    onChange={(e) => setAttendanceStartTime(e.target.value)}
                    list="time-options"
                    className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Jam selesai</label>
                  <input
                    type="time"
                    value={attendanceEndTime}
                    onChange={(e) => setAttendanceEndTime(e.target.value)}
                    list="time-options"
                    className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-purple-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="md:col-span-2 text-xs text-purple-200">
                  Judul otomatis: <span className="font-semibold text-purple-100">{title || `Absensi ${attendanceDate}`}</span>
                </div>
                <datalist id="time-options">
                  {Array.from({ length: 24 * 2 }, (_, idx) => {
                    const totalMinutes = idx * 30;
                    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
                    const mm = String(totalMinutes % 60).padStart(2, '0');
                    const value = `${hh}:${mm}`;
                    return <option key={value} value={value} />;
                  })}
                </datalist>
              </div>
            )}
            {(type === 'materi' || type === 'tugas') && (
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-white mb-2">
                  File (opsional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-700 file:px-3 file:py-2 file:text-white hover:file:bg-purple-600"
                />
                {file && <div className="mt-2 text-xs text-purple-200">Dipilih: {file.name}</div>}
              </div>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-white mb-2">
                Deskripsi (opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-24 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Isi ringkas / instruksi"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={isAdding}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAdding ? 'Menambahkan...' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {(['materi', 'tugas', 'kuis', 'absensi'] as ItemType[]).map((t) => (
          <div key={t} className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {t === 'materi' && 'Materi'}
                {t === 'tugas' && 'Tugas'}
                {t === 'kuis' && 'Kuis'}
                {t === 'absensi' && 'Absensi'}
              </h2>
              <span className="text-xs text-purple-300">{grouped[t].length} item</span>
            </div>
            {grouped[t].length === 0 ? (
              <p className="mt-3 text-sm text-purple-200">Belum ada.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {grouped[t].map((item) => (
                  <div
                    key={item.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-purple-700 bg-purple-950/30 p-4"
                  >
                    <div className="text-white font-semibold">{item.title}</div>
                    {item.description && (
                      <div className="mt-2 text-sm text-purple-200">{item.description}</div>
                    )}
                    {item.fileUrl && (
                      <div className="mt-3">
                        <a
                          href={`/api/courses/${courseId}/items/${item.id}/download`}
                          title={item.fileName || 'Download file'}
                          className="flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-purple-600 bg-purple-900/30 px-3 py-2 text-sm text-purple-100 hover:bg-purple-900/50"
                        >
                          <span className="shrink-0">Download:</span>
                          <span className="min-w-0 flex-1 truncate">
                            {item.fileName || 'file'}
                          </span>
                        </a>
                      </div>
                    )}

                    {item.type === 'tugas' && (
                      <div className="mt-4 rounded-lg border border-purple-700 bg-purple-950/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-purple-100">
                            {canManage ? 'Pengumpulan' : 'Kumpulkan tugas'}
                          </div>
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/dashboard/courses/${courseId}/tugas/${item.id}/submit`}
                              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-600/30 transition"
                            >
                              Pengumpulan
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleSubmissions(item.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-purple-600 bg-purple-900/30 px-3 py-1.5 text-xs font-medium text-purple-100 hover:bg-purple-900/50 transition"
                            >
                              {submissionsOpen[item.id] ? 'Tutup' : 'Lihat'}
                            </button>
                          </div>
                        </div>

                        {submissionsOpen[item.id] && (
                          <div className="mt-3 space-y-2">
                            {submissionsLoading[item.id] ? (
                              <div className="text-xs text-purple-200">Memuat...</div>
                            ) : submissionsError[item.id] ? (
                              <div className="text-xs text-red-200">{submissionsError[item.id]}</div>
                            ) : (submissionsByItem[item.id] || []).length === 0 ? (
                              <div className="space-y-2">
                                <div className="text-xs text-purple-200">Belum ada pengumpulan.</div>
                                <Link
                                  href={`/dashboard/courses/${courseId}/tugas/${item.id}/submit`}
                                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2 text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-600/30 transition"
                                >
                                  Pengumpulan tugas
                                </Link>
                              </div>
                            ) : (
                              (submissionsByItem[item.id] || []).map((sub) => (
                                <div
                                  key={sub.id}
                                  className="min-w-0 overflow-hidden rounded-lg border border-purple-700 bg-purple-950/30 p-3"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-white">{sub.title}</div>
                                    <div className="text-xs text-purple-300">
                                      {(sub.authorName || 'User')}
                                      {sub.createdAt ? ` - ${new Date(sub.createdAt).toLocaleString()}` : ''}
                                    </div>
                                  </div>
                                  {sub.description && (
                                    <div className="mt-2 text-xs text-purple-200">{sub.description}</div>
                                  )}
                                  {sub.link && (
                                    <a
                                      href={sub.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-2 block truncate text-xs text-purple-200 underline hover:text-white"
                                      title={sub.link}
                                    >
                                      {sub.link}
                                    </a>
                                  )}
                                  {sub.fileUrl && (
                                    <a
                                      href={`/api/courses/${courseId}/items/${item.id}/submissions/${sub.id}/download`}
                                      title={sub.fileName || 'Download file'}
                                      className="mt-3 flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-purple-600 bg-purple-900/30 px-3 py-2 text-xs text-purple-100 hover:bg-purple-900/50"
                                    >
                                      <span className="shrink-0">Download:</span>
                                      <span className="min-w-0 flex-1 truncate">
                                        {sub.fileName || 'file'}
                                      </span>
                                    </a>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {item.type === 'kuis' && (
                      <div className="mt-4 rounded-lg border border-purple-700 bg-purple-950/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-purple-100">Pengerjaan kuis</div>
                          <Link
                            href={`/dashboard/courses/${courseId}/kuis/${item.id}`}
                            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-600/30 transition"
                          >
                            {quizAttemptsById[item.id]?.submittedAt ? 'Lihat hasil' : 'Kerjakan kuis'}
                          </Link>
                        </div>

                        <div className="mt-2 text-xs text-purple-200">
                          {quizAttemptsById[item.id]?.submittedAt ? (
                            quizAttemptsById[item.id]?.showScoreToStudent &&
                            quizAttemptsById[item.id]?.score !== null &&
                            quizAttemptsById[item.id]?.score !== undefined &&
                            quizAttemptsById[item.id]?.totalPoints !== null &&
                            quizAttemptsById[item.id]?.totalPoints !== undefined ? (
                              <>
                                Nilai akhir: {quizAttemptsById[item.id]?.score}/
                                {quizAttemptsById[item.id]?.totalPoints}
                              </>
                            ) : quizAttemptsById[item.id]?.gradingEnabled ? (
                              <>Sudah dikirim (nilai tidak ditampilkan).</>
                            ) : (
                              <>Sudah dikirim.</>
                            )
                          ) : (
                            <>Belum dikerjakan.</>
                          )}
                        </div>
                      </div>
                    )}

                    {item.type === 'absensi' && (
                      <div className="mt-4 rounded-lg border border-purple-700 bg-purple-950/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-purple-100">Absensi</div>
                          <Link
                            href={`/dashboard/courses/${courseId}/absensi/${item.id}`}
                            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:shadow-lg hover:shadow-purple-600/30 transition"
                          >
                            {attendanceAttemptsById[item.id]?.submittedAt ? 'Lihat' : 'Absen'}
                          </Link>
                        </div>

                        <div className="mt-2 text-xs text-purple-200">
                          {attendanceAttemptsById[item.id]?.submittedAt ? (
                            <>
                              Sudah absen
                              {attendanceAttemptsById[item.id]?.status
                                ? ` (${attendanceAttemptsById[item.id]?.status})`
                                : ''}
                              .
                            </>
                          ) : (
                            <>Belum absen.</>
                          )}
                        </div>
                      </div>
                    )}

                    {item.type === 'materi' && (
                      <div className="mt-4 rounded-lg border border-purple-700 bg-purple-950/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-purple-100">Komentar</div>
                          <button
                            type="button"
                            onClick={() => toggleComments(item.id)}
                            className="text-xs text-purple-200 hover:text-white"
                          >
                            {commentsOpen[item.id] ? 'Tutup' : 'Lihat'}
                          </button>
                        </div>

                        <form onSubmit={(e) => handleAddComment(e, item.id)} className="mt-3 grid gap-2">
                          <textarea
                            value={commentDraft[item.id] || ''}
                            onChange={(e) => setCommentDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full min-h-20 rounded-lg border border-purple-600 bg-purple-900/40 px-3 py-2 text-sm text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            placeholder="Tulis komentar..."
                            required
                          />
                          {commentsError[item.id] && (
                            <div className="text-xs text-red-200">{commentsError[item.id]}</div>
                          )}
                          <button
                            type="submit"
                            disabled={Boolean(commentsLoading[item.id])}
                            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {commentsLoading[item.id] ? 'Mengirim...' : 'Kirim komentar'}
                          </button>
                        </form>

                        {commentsOpen[item.id] && (
                          <div className="mt-3 space-y-2">
                            {commentsLoading[item.id] ? (
                              <div className="text-xs text-purple-200">Memuat...</div>
                            ) : commentsError[item.id] ? (
                              <div className="text-xs text-red-200">{commentsError[item.id]}</div>
                            ) : (commentsByItem[item.id] || []).length === 0 ? (
                              <div className="text-xs text-purple-200">Belum ada komentar.</div>
                            ) : (
                              (commentsByItem[item.id] || []).map((c) => (
                                <div
                                  key={c.id}
                                  className="min-w-0 overflow-hidden rounded-lg border border-purple-700 bg-purple-950/30 p-3"
                                >
                                  <div className="text-xs text-purple-300">
                                    {(c.authorName || 'User')}
                                    {c.createdAt ? ` - ${new Date(c.createdAt).toLocaleString()}` : ''}
                                  </div>
                                  <div className="mt-1 whitespace-pre-wrap text-sm text-purple-100">{c.message}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {item.createdAt && (
                      <div className="mt-3 text-xs text-purple-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
