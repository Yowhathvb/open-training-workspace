'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  namaLengkap: string;
  username: string;
  nis: string;
  email: string;
  noHp: string;
  emailPemulihan: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function PendingApprovalPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/pending-approval');
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      alert('Gagal mengambil data pengguna menunggu persetujuan');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('Approve user ini?')) return;

    try {
      setActionInProgress(true);
      const response = await fetch('/api/users/pending-approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Gagal approve user');
      }

      alert('User berhasil disetujui!');
      setShowDetailModal(false);
      fetchPendingUsers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Reject user ini?')) return;

    try {
      setActionInProgress(true);
      const response = await fetch('/api/users/pending-approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: 'rejected' }),
      });

      if (!response.ok) {
        throw new Error('Gagal reject user');
      }

      alert('User ditolak!');
      setShowDetailModal(false);
      fetchPendingUsers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Menunggu Persetujuan</h1>
        <p className="text-purple-200">Persetujuan pendaftaran pengguna baru</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-4">
          <p className="text-purple-300 text-sm mb-1">Menunggu Persetujuan</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-4">
          <p className="text-purple-300 text-sm mb-1">Timeline</p>
          <p className="text-sm text-purple-200">Terima/Tolak dalam 24 jam</p>
        </div>
        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-4">
          <p className="text-purple-300 text-sm mb-1">Status</p>
          <p className="text-sm text-yellow-400 font-medium">⏳ Sedang Diproses</p>
        </div>
      </div>

      {/* Users Waiting for Approval */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-purple-200">Memuat data...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-purple-200">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tidak ada pengguna yang menunggu persetujuan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-600 bg-purple-900/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Nama</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Bergabung</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-purple-600/30 hover:bg-purple-900/20 transition">
                    <td className="px-6 py-4 text-white font-medium">{user.namaLengkap}</td>
                    <td className="px-6 py-4 text-purple-300 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-purple-100">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-purple-300 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(user)}
                          className="p-2 rounded hover:bg-purple-900/50 text-blue-400 transition"
                          title="Lihat detail"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionInProgress}
                          className="p-2 rounded hover:bg-green-900/50 text-green-400 transition disabled:opacity-50"
                          title="Setujui"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          disabled={actionInProgress}
                          className="p-2 rounded hover:bg-red-900/50 text-red-400 transition disabled:opacity-50"
                          title="Tolak"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
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

      {/* DETAIL MODAL */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 rounded-lg border border-purple-600 max-w-2xl w-full">
            <div className="border-b border-purple-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Detail Permohonan</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-purple-300 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">Nama Lengkap</p>
                  <p className="text-lg text-white font-medium">{selectedUser.namaLengkap}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">Username</p>
                  <p className="text-white">{selectedUser.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">Email</p>
                  <p className="text-white break-all">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">NIS</p>
                  <p className="text-white">{selectedUser.nis || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">No. HP</p>
                  <p className="text-white">{selectedUser.noHp || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">Email Pemulihan</p>
                  <p className="text-white text-sm break-all">{selectedUser.emailPemulihan || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">Role</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-purple-100">
                    {selectedUser.role}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">Tanggal Daftar</p>
                  <p className="text-white">{new Date(selectedUser.createdAt).toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-purple-600 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
              >
                Tutup
              </button>
              <button
                onClick={() => handleReject(selectedUser.id)}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
              >
                Tolak
              </button>
              <button
                onClick={() => handleApprove(selectedUser.id)}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition disabled:opacity-50"
              >
                Setujui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
