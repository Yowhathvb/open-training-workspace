'use client';

import { useEffect, useMemo, useState } from 'react';

type SiteSettings = {
  siteName: string;
  logoUrl: string;
};

export default function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>({ siteName: '', logoUrl: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const previewInitials = useMemo(() => {
    const name = settings.siteName.trim();
    if (!name) return 'OTW';
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return initials.toUpperCase().slice(0, 3) || 'OTW';
  }, [settings.siteName]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await fetch('/api/settings/site');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setErrorMessage(data?.error || 'Gagal memuat pengaturan');
          return;
        }
        if (!cancelled) {
          setSettings(data?.settings || { siteName: '', logoUrl: '' });
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Gagal memuat pengaturan');
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error || 'Gagal menyimpan');
        return;
      }

      setSettings(data.settings);
      setSuccessMessage('Tersimpan');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-600 bg-purple-900/30 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-semibold tracking-[0.2em] text-white">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              previewInitials
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-purple-300">
              Preview
            </div>
            <div className="text-lg font-semibold text-white">{settings.siteName || 'OTW Platform'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-purple-600 bg-purple-900/30 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-white">Pengaturan Website</h1>
        <p className="mt-1 text-sm text-purple-200">
          Ubah nama website dan URL logo untuk ditampilkan di landing page.
        </p>

        {isLoading ? (
          <div className="mt-6 text-sm text-purple-200">Memuat...</div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            {errorMessage && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                {successMessage}
              </div>
            )}

            <div>
              <label htmlFor="siteName" className="block text-sm font-semibold text-white mb-2">
                Nama Website
              </label>
              <input
                id="siteName"
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="OTW Platform"
                required
              />
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-sm font-semibold text-white mb-2">
                URL Logo (opsional)
              </label>
              <input
                id="logoUrl"
                type="url"
                value={settings.logoUrl}
                onChange={(e) => setSettings((s) => ({ ...s, logoUrl: e.target.value }))}
                className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="https://..."
              />
              <p className="mt-2 text-xs text-purple-300">
                Tip: pakai URL publik (mis. dari Firebase Storage) supaya bisa tampil di semua perangkat.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.3)] transition hover:shadow-[0_15px_35px_rgba(124,58,237,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

