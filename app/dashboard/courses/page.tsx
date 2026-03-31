'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Course = {
  id: string;
  title: string;
  courseKey: string;
  createdAt?: string | null;
  status?: string;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [courseKey, setCourseKey] = useState('');
  const [password, setPassword] = useState('');

  const keyError = useMemo(() => {
    const key = courseKey.trim();
    if (!key) return null;
    if (/\s/.test(key)) return 'Kunci kursus tidak boleh ada spasi.';
    return null;
  }, [courseKey]);

  const fetchMine = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/courses/mine');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || 'Gagal memuat kursus');
        return;
      }
      setCourses(data?.courses || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat kursus');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (keyError) {
      setErrorMessage(keyError);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          courseKey,
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || 'Gagal membuat kursus');
        return;
      }
      setTitle('');
      setCourseKey('');
      setPassword('');
      setShowCreate(false);
      await fetchMine();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membuat kursus');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Manajemen Kursus</h1>
        <p className="text-purple-200">Kelola kursus yang Anda buat</p>
      </div>

      {/* Add Course Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition"
        >
          + Buat Kursus Baru
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {showCreate && (
        <div className="mb-8 rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Buat Kursus Baru</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-purple-300 hover:text-white transition"
            >
              Tutup
            </button>
          </div>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-white mb-2">
                Nama Kursus
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Contoh: React Dasar"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Kunci Kursus (tanpa spasi)
              </label>
              <input
                value={courseKey}
                onChange={(e) => setCourseKey(e.target.value)}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="reactdasar"
                required
              />
              {keyError && <p className="mt-2 text-xs text-red-200">{keyError}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Password Kursus
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Minimal 4 karakter"
                required
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Membuat...' : 'Buat Kursus'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-6 py-2 rounded-lg border border-purple-600 text-purple-200 hover:bg-purple-800 transition"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses Grid */}
      {isLoading ? (
        <div className="text-purple-200">Memuat...</div>
      ) : courses.length === 0 ? (
        <div className="text-purple-200">Belum ada kursus. Buat kursus pertama Anda.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden hover:bg-purple-900/50 transition">
            <div className="h-40 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
              <svg className="w-16 h-16 text-purple-300 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-2">{course.title}</h3>
              <p className="text-sm text-purple-300 mb-4">
                Kunci: <span className="font-mono">{course.courseKey}</span>
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs bg-purple-700/50 text-purple-200 px-2 py-1 rounded">
                  Aktif
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/courses/${course.id}`}
                  className="flex-1 px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition text-center"
                >
                  Kelola
                </Link>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}
