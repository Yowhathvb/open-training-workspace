'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Ahmad Rahman',
    email: 'ahmad.rahman@example.com',
    phone: '08123456789',
    institution: 'Universitas Indonesia',
    role: 'Student',
    joinDate: '15 Januari 2024',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsEditing(false);
    // TODO: Send to API
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Profil Saya</h1>
          <p className="text-purple-200">Kelola informasi akun Anda</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white text-sm font-medium transition"
        >
          {isEditing ? 'Batal' : 'Edit Profil'}
        </button>
      </div>

      {/* Profile Picture Section */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6 mb-6">
        <div className="flex items-end gap-6 mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          {isEditing && (
            <button className="px-4 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white text-sm font-medium transition">
              Ubah Foto
            </button>
          )}
        </div>
        <p className="text-purple-200 text-sm">File format: JPG, PNG, GIF. Max ukuran: 2MB</p>
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
                name="name"
                value={profile.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{profile.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{profile.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Nomor Telepon</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{profile.phone}</p>
            )}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Institusi</label>
            {isEditing ? (
              <input
                type="text"
                name="institution"
                value={profile.institution}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-white">{profile.institution}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
            {isEditing ? (
              <select
                name="role"
                value={profile.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option>Student</option>
                <option>Mentor</option>
                <option>Instructor</option>
              </select>
            ) : (
              <p className="text-white">{profile.role}</p>
            )}
          </div>

          {/* Join Date */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Tanggal Bergabung</label>
            <p className="text-white">{profile.joinDate}</p>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition"
            >
              Simpan Perubahan
            </button>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-6">Keamanan</h2>

        <div className="space-y-4">
          <button className="w-full text-left px-4 py-3 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition">
            <div className="flex items-center justify-between">
              <span>Ubah Kata Sandi</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button className="w-full text-left px-4 py-3 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition">
            <div className="flex items-center justify-between">
              <span>Kelola Sesi Login</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button className="w-full text-left px-4 py-3 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition">
            <div className="flex items-center justify-between">
              <span>Verifikasi Dua Faktor</span>
              <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-600/50 bg-red-900/10 p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-6">Zona Berbahaya</h2>

        <button className="w-full px-4 py-3 rounded-lg border border-red-600/50 hover:bg-red-900/20 text-red-400 font-medium transition">
          Hapus Akun
        </button>
        <p className="text-xs text-red-400/70 mt-2">Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.</p>
      </div>
    </div>
  );
}
