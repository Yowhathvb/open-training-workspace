'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = {
  id: string;
  type: 'materi' | 'tugas' | 'kuis' | 'absensi';
  title: string;
  description?: string;
};

export default function TugasSubmitClient({ courseId, itemId }: { courseId: string; itemId: string }) {
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/courses/${courseId}/items/${itemId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data?.error || 'Gagal memuat tugas');
          return;
        }
        const fetched = data?.item as Item;
        if (!fetched || fetched.type !== 'tugas') {
          setErrorMessage('Item bukan tugas');
          return;
        }
        setItem(fetched);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memuat tugas');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [courseId, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('link', link);
      if (file) form.append('file', file);

      const res = await fetch(`/api/courses/${courseId}/items/${itemId}/submissions`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal mengumpulkan tugas');
        return;
      }
      router.push(`/dashboard/courses/${courseId}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mengumpulkan tugas');
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

  if (!item) {
    return <div className="p-6 md:p-8 text-purple-200">Tugas tidak ditemukan.</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="text-purple-200 hover:text-white underline">
          ← Kembali ke kursus
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">Pengumpulan Tugas</h1>
        <div className="mt-1 text-sm text-purple-200">
          {item.title}
          {item.description ? ` • ${item.description}` : ''}
        </div>
      </div>

      <div className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Nama tugas</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Contoh: Tugas 1 - React"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Deskripsi (opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-24 rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Catatan untuk guru..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Link (opsional)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">File (opsional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-700 file:px-3 file:py-2 file:text-white hover:file:bg-purple-600"
            />
            {file && <div className="mt-2 text-xs text-purple-200">Dipilih: {file.name}</div>}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Mengirim...' : 'Kumpulkan'}
          </button>
        </form>
      </div>
    </div>
  );
}

