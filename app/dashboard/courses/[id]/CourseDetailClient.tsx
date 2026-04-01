'use client';

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
  createdAt?: string;
};

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [items, setItems] = useState<CourseItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [type, setType] = useState<ItemType>('materi');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
      setItems(itemsData.items || []);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/items`, {
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
            Guru bisa menambahkan materi, tugas, kuis, atau absensi.
          </p>

          <form onSubmit={handleAdd} className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Tipe</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="materi">Materi</option>
                <option value="tugas">Tugas</option>
                <option value="kuis">Kuis</option>
                <option value="absensi">Absensi</option>
              </select>
            </div>
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
                    className="rounded-xl border border-purple-700 bg-purple-950/30 p-4"
                  >
                    <div className="text-white font-semibold">{item.title}</div>
                    {item.description && (
                      <div className="mt-2 text-sm text-purple-200">{item.description}</div>
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

