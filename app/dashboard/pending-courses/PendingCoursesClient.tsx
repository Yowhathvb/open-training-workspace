'use client';

import { useEffect, useState } from 'react';

type PendingCourse = {
  id: string;
  title: string;
  courseKey: string;
  createdBy: string;
  createdAt?: string | null;
  status: string;
};

export default function PendingCoursesClient() {
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPending = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/courses/pending-approval');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat data');
        return;
      }
      setCourses(data?.courses || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const updateStatus = async (courseId: string, status: 'approved' | 'rejected') => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/courses/pending-approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal update status');
        return;
      }
      await fetchPending();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal update status');
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Persetujuan Kursus</h1>
        <p className="text-purple-200">Setujui atau tolak kursus baru dari guru.</p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-purple-200">Memuat data...</div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center text-purple-200">Tidak ada kursus pending</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-600 bg-purple-900/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Nama</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Kunci</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Dibuat Oleh</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-purple-600/30 hover:bg-purple-900/20 transition">
                    <td className="px-6 py-4 text-white">{c.title}</td>
                    <td className="px-6 py-4 text-purple-300 font-mono">{c.courseKey}</td>
                    <td className="px-6 py-4 text-purple-300 text-sm">{c.createdBy}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(c.id, 'approved')}
                          className="px-3 py-2 rounded bg-green-700/60 hover:bg-green-700 text-white text-sm font-medium transition"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => updateStatus(c.id, 'rejected')}
                          className="px-3 py-2 rounded bg-red-700/60 hover:bg-red-700 text-white text-sm font-medium transition"
                        >
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

