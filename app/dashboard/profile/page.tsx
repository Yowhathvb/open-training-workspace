'use client';

import { useEffect, useMemo, useState } from 'react';

type MeUser = {
  id: string;
  username: string;
  namaLengkap: string;
  email: string;
  noHp: string;
  nis: string;
  emailPemulihan: string;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function roleLabel(role: string) {
  if (role === 'root') return 'Root';
  if (role === 'administrator') return 'Administrator';
  if (role === 'guru') return 'Guru';
  if (role === 'siswa') return 'Siswa';
  return role || '-';
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [namaLengkap, setNamaLengkap] = useState('');
  const [noHp, setNoHp] = useState('');
  const [emailPemulihan, setEmailPemulihan] = useState('');

  const joinDate = useMemo(() => {
    if (!user?.createdAt) return '-';
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }, [user?.createdAt]);

  const fetchMe = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/users/me');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal memuat profil');
        return;
      }
      setUser(data.user);
      setNamaLengkap(data.user?.namaLengkap || '');
      setNoHp(data.user?.noHp || '');
      setEmailPemulihan(data.user?.emailPemulihan || '');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memuat profil');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaLengkap, noHp, emailPemulihan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data?.error || 'Gagal menyimpan profil');
        return;
      }
      setUser(data.user);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan profil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Profil Saya</h1>
          <p className="text-purple-200">Kelola informasi akun Anda</p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null);
            setIsEditing(!isEditing);
            setNamaLengkap(user?.namaLengkap || '');
            setNoHp(user?.noHp || '');
            setEmailPemulihan(user?.emailPemulihan || '');
          }}
          disabled={isLoading || !user}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white text-sm font-medium transition"
        >
          {isEditing ? 'Batal' : 'Edit Profil'}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Profile Picture Section */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6 mb-6">
        <div className="flex items-end gap-6 mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          {isEditing && (
            <div className="text-sm text-purple-200">
              Foto profil belum tersedia.
            </div>
          )}
        </div>
        <p className="text-purple-200 text-sm">
          {isLoading ? 'Memuat...' : user ? `@${user.username || '-'}` : '-'}
        </p>
      </div>

      {/* Information Section */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-6">Informasi Pribadi</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Nama Lengkap</label>
            {isEditing ? (
              <input
                type="text"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{isLoading ? 'Memuat...' : (user?.namaLengkap || '-')}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
            <p className="text-white">{isLoading ? 'Memuat...' : (user?.email || '-')}</p>
            {isEditing && (
              <p className="mt-2 text-xs text-purple-300">Email tidak bisa diubah dari halaman ini.</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Nomor Telepon</label>
            {isEditing ? (
              <input
                type="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{isLoading ? 'Memuat...' : (user?.noHp || '-')}</p>
            )}
          </div>

          {/* Email Pemulihan */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email Pemulihan</label>
            {isEditing ? (
              <input
                type="text"
                value={emailPemulihan}
                onChange={(e) => setEmailPemulihan(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{isLoading ? 'Memuat...' : (user?.emailPemulihan || '-')}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
            <p className="text-white">{isLoading ? 'Memuat...' : roleLabel(user?.role || '')}</p>
            {user?.status && !isLoading && (
              <p className="mt-2 text-xs text-purple-300">Status: {user.status}</p>
            )}
          </div>

          {/* Join Date */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Tanggal Bergabung</label>
            <p className="text-white">{isLoading ? 'Memuat...' : joinDate}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-6">Keamanan</h2>

        <div className="space-y-4">
          <button
            disabled
            className="w-full text-left px-4 py-3 rounded-lg border border-purple-600/50 bg-purple-950/20 text-purple-300 font-medium transition cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <span>Ubah Kata Sandi</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            disabled
            className="w-full text-left px-4 py-3 rounded-lg border border-purple-600/50 bg-purple-950/20 text-purple-300 font-medium transition cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <span>Kelola Sesi Login</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            disabled
            className="w-full text-left px-4 py-3 rounded-lg border border-purple-600/50 bg-purple-950/20 text-purple-300 font-medium transition cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <span>Verifikasi Dua Faktor</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
        <p className="mt-3 text-xs text-purple-300">Fitur keamanan lanjutan masih OTW.</p>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-600/50 bg-red-900/10 p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-3">Zona Berbahaya</h2>
        <p className="text-xs text-red-300/80">
          Penghapusan akun belum tersedia dari halaman ini.
        </p>
      </div>
    </div>
  );
}
