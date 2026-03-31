'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Course = {
  id: string;
  title: string;
  courseKey: string;
  createdBy?: string;
  createdAt?: string | null;
};

export default function MyCoursesPage() {
  const [enrolled, setEnrolled] = useState<Course[]>([]);
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [joinKey, setJoinKey] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const joinedIds = useMemo(() => new Set(enrolled.map((c) => c.id)), [enrolled]);

  const fetchEnrolled = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/courses/enrolled');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat kursus');
        return;
      }
      setEnrolled(data?.courses || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat kursus');
    } finally {
      setIsLoading(false);
    }
  };

  const doSearch = async (q: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal mencari kursus');
        return;
      }
      setSearchResults(data?.courses || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mencari kursus');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchEnrolled();
  }, []);

  useEffect(() => {
    const q = search.trim();
    const handle = setTimeout(() => {
      if (!q) {
        setSearchResults([]);
        return;
      }
      doSearch(q);
    }, 350);
    return () => clearTimeout(handle);
  }, [search]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/courses/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseKey: joinKey, password: joinPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal join kursus');
        return;
      }
      setJoinKey('');
      setJoinPassword('');
      await fetchEnrolled();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal join kursus');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Kursus Saya</h1>
        <p className="text-purple-200">Kursus yang sedang Anda ikuti</p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
          <h2 className="text-lg font-semibold text-white">Join Kursus</h2>
          <p className="mt-1 text-sm text-purple-200">
            Masukkan kunci kursus dan password (hanya sekali).
          </p>
          <form onSubmit={handleJoin} className="mt-5 grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Kunci Kursus
              </label>
              <input
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="contoh: reactdasar"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Password Kursus
              </label>
              <input
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isJoining}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Memproses...' : 'Join'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
          <h2 className="text-lg font-semibold text-white">Cari Kursus</h2>
          <p className="mt-1 text-sm text-purple-200">
            Cari lewat nama kursus atau kunci kursus.
          </p>
          <div className="mt-5 flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ketik untuk mencari..."
              className="flex-1 px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="mt-4">
            {isSearching ? (
              <div className="text-sm text-purple-200">Mencari...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-sm text-purple-300">
                {search.trim() ? 'Tidak ada hasil.' : 'Mulai ketik untuk mencari.'}
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.slice(0, 8).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-xl border border-purple-700 bg-purple-950/30 px-4 py-3"
                  >
                    <div>
                      <div className="text-white font-semibold">{course.title}</div>
                      <div className="text-xs text-purple-300">
                        kunci: <span className="font-mono">{course.courseKey}</span>
                      </div>
                    </div>
                    {joinedIds.has(course.id) ? (
                      <span className="text-xs text-green-300">Sudah join</span>
                    ) : (
                      <span className="text-xs text-purple-300">Join via form</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="text-purple-200">Memuat...</div>
      ) : enrolled.length === 0 ? (
        <div className="text-purple-200">Belum join kursus.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolled.map((course) => (
            <div
              key={course.id}
              className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden hover:bg-purple-900/50 transition"
            >
              <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-300 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
                </svg>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-2">{course.title}</h3>
                <p className="text-sm text-purple-300 mb-4">
                  kunci: <span className="font-mono">{course.courseKey}</span>
                </p>

                <Link
                  href={`/dashboard/courses/${course.id}`}
                  className="block w-full text-center px-3 py-2 rounded bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white text-sm font-medium transition"
                >
                  Buka Kursus
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
