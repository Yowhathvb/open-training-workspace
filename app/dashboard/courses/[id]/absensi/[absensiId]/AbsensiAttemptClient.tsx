'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type AttendanceStatus = 'hadir' | 'izin' | 'sakit';

type Absensi = {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: string | null;
  endAt: string | null;
};

type Attempt = {
  submittedAt: string | null;
  status: string;
  evidence: {
    fileUrl?: string;
    fileName?: string;
  } | null;
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

function parseStatus(input: unknown): AttendanceStatus | null {
  const value = normalizeString(input).toLowerCase();
  if (value === 'hadir' || value === 'izin' || value === 'sakit') return value;
  return null;
}

export default function AbsensiAttemptClient({ courseId, absensiId }: { courseId: string; absensiId: string }) {
  const router = useRouter();

  const [absensi, setAbsensi] = useState<Absensi | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [isNotStarted, setIsNotStarted] = useState(false);

  const [status, setStatus] = useState<AttendanceStatus>('hadir');
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [absensiRes, attemptRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/absensi/${absensiId}`),
        fetch(`/api/courses/${courseId}/absensi/${absensiId}/attempt`),
      ]);

      const absensiData = await absensiRes.json().catch(() => ({}));
      if (!absensiRes.ok) {
        setErrorMessage(absensiData?.error || 'Gagal memuat absensi');
        return;
      }
      setAbsensi(absensiData?.absensi as Absensi);

      const attemptData = await attemptRes.json().catch(() => ({}));
      if (!attemptRes.ok) {
        setErrorMessage(attemptData?.error || 'Gagal memuat status absensi');
        return;
      }
      setIsClosed(Boolean(attemptData?.isClosed));
      setIsNotStarted(Boolean(attemptData?.isNotStarted));
      setAttempt((attemptData?.attempt as Attempt | null) || null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat absensi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, absensiId]);

  const isLocked = Boolean(attempt?.submittedAt);

  const requiresEvidence = useMemo(() => status === 'izin' || status === 'sakit', [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (isClosed) {
      setErrorMessage('Batas waktu absensi sudah lewat');
      return;
    }
    if (isNotStarted) {
      setErrorMessage('Absensi belum dibuka');
      return;
    }
    if (requiresEvidence && !file) {
      setErrorMessage('Bukti file wajib diunggah untuk izin/sakit');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const form = new FormData();
      form.append('status', status);
      if (file) form.append('file', file);

      const res = await fetch(`/api/courses/${courseId}/absensi/${absensiId}/attempt`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal absen');
        return;
      }

      setAttempt({
        submittedAt: data?.attempt?.submittedAt || null,
        status: data?.attempt?.status || status,
        evidence: data?.attempt?.evidence || null,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal absen');
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

  if (!absensi) {
    return <div className="p-6 md:p-8 text-purple-200">Absensi tidak ditemukan.</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href={`/dashboard/courses/${courseId}`} className="text-purple-200 hover:text-white underline">
          â† Kembali ke kursus
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-white">{absensi.title || 'Absensi'}</h1>
        {absensi.description ? <div className="mt-1 text-sm text-purple-200">{absensi.description}</div> : null}
        <div className="mt-3 rounded-lg border border-purple-600 bg-purple-900/20 px-4 py-3 text-xs text-purple-200">
          Tanggal: <span className="font-semibold text-purple-100">{absensi.date}</span> â€¢ Batas jam:{' '}
          <span className="font-semibold text-purple-100">
            {absensi.startTime} - {absensi.endTime}
          </span>
        </div>
      </div>

      {isLocked ? (
        <div className="mb-6 rounded-2xl border border-green-500/40 bg-green-500/10 p-5">
          <div className="text-sm font-semibold text-green-200">Absensi sudah terkirim</div>
          <div className="mt-1 text-xs text-green-200/90">Dikirim: {formatDateTime(attempt?.submittedAt || null)}</div>
          <div className="mt-3 text-white font-semibold">
            Status: {attempt?.status || '-'}
          </div>
          {attempt?.evidence?.fileUrl ? (
            <a
              href={attempt.evidence.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs text-green-100 underline hover:text-white"
              title={attempt.evidence.fileName || 'Bukti'}
            >
              Lihat bukti file
            </a>
          ) : null}
        </div>
      ) : isClosed ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
          <div className="text-sm font-semibold text-red-200">Batas waktu absensi sudah lewat</div>
          <div className="mt-1 text-xs text-red-200/90">
            Kamu tidak bisa absen untuk sesi ini.
          </div>
        </div>
      ) : null}

      {!isLocked && !isClosed ? (
        <div className="rounded-2xl border border-purple-600 bg-purple-900/30 p-6">
          <form onSubmit={handleSubmit} className="grid gap-4">
            {isNotStarted ? (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
                Absensi belum dibuka.
              </div>
            ) : null}
            <div>
              <div className="text-sm font-semibold text-white mb-2">Pilih status</div>
              <div className="grid gap-2 md:grid-cols-3">
                {(['hadir', 'izin', 'sakit'] as AttendanceStatus[]).map((s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                      status === s ? 'border-purple-400 bg-purple-800/30' : 'border-purple-700 bg-purple-950/20'
                    } hover:bg-purple-900/40`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === s}
                      onChange={() => {
                        const next = parseStatus(s) || 'hadir';
                        setStatus(next);
                        setFile(null);
                      }}
                      className="h-4 w-4 accent-purple-600"
                    />
                    <span className="text-white font-semibold capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {(status === 'izin' || status === 'sakit') ? (
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Bukti file (wajib untuk izin/sakit)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white file:mr-3 file:rounded-md file:border-0 file:bg-purple-700 file:px-3 file:py-2 file:text-white hover:file:bg-purple-600"
                  required
                />
                {file ? <div className="mt-2 text-xs text-purple-200">Dipilih: {file.name}</div> : null}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isNotStarted}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim absensi'}
            </button>
          </form>
        </div>
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
  );
}
