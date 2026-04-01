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
  status?: string;
  createdAt: string;
}

const DEFAULT_PASSWORDS: { [key: string]: string } = {
  'administrator': 'Admin123!',
  'guru': 'Guru123!',
  'siswa': 'Siswa123!',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [useDefaultPassword, setUseDefaultPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    namaLengkap: '',
    username: '',
    nis: '',
    email: '',
    password: '',
    confirmPassword: '',
    noHp: '',
    emailPemulihan: '',
    role: 'siswa',
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchMe();
    fetchUsers();
  }, []);

  const fetchMe = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setMyRole(data?.user?.role || null);
      }
    } catch {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.namaLengkap || !formData.username || !formData.email) {
      alert('Harap isi semua field yang diperlukan');
      return;
    }

    let password = formData.password;
    if (useDefaultPassword) {
      password = DEFAULT_PASSWORDS[formData.role] || 'Default123!';
    }

    if (myRole === 'administrator' && (formData.role === 'root' || formData.role === 'administrator')) {
      alert('Administrator tidak boleh membuat akun root/administrator');
      return;
    }

    if (!useDefaultPassword && !formData.password) {
      alert('Harap masukkan password atau pilih password default');
      return;
    }

    if (!useDefaultPassword && formData.password !== formData.confirmPassword) {
      alert('Password tidak cocok');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal menambah user');
      }

      alert('User berhasil ditambahkan');
      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    if (myRole === 'administrator' && (selectedUser.role === 'root' || selectedUser.role === 'administrator')) {
      alert('Administrator tidak boleh mengubah akun root/administrator');
      return;
    }
    if (myRole === 'administrator' && (formData.role === 'root' || formData.role === 'administrator')) {
      alert('Administrator tidak boleh menetapkan role root/administrator');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaLengkap: formData.namaLengkap,
          username: formData.username,
          nis: formData.nis,
          noHp: formData.noHp,
          emailPemulihan: formData.emailPemulihan,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal mengubah user');
      }

      alert('User berhasil diperbarui');
      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus user');
      }

      alert('User berhasil dihapus');
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      namaLengkap: user.namaLengkap,
      username: user.username,
      nis: user.nis,
      email: user.email,
      password: '',
      confirmPassword: '',
      noHp: user.noHp,
      emailPemulihan: user.emailPemulihan,
      role: user.role,
    });
    setShowEditModal(true);
  };

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      namaLengkap: '',
      username: '',
      nis: '',
      email: '',
      password: '',
      confirmPassword: '',
      noHp: '',
      emailPemulihan: '',
      role: 'siswa',
    });
    setUseDefaultPassword(false);
  };

  const filteredUsers = users.filter(user =>
    user.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Manajemen User</h1>
          <p className="text-purple-200">Kelola pengguna sistem</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition w-full md:w-auto"
        >
          + Tambah User
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari pengguna..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-purple-200">Memuat data...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-purple-200">Tidak ada data pengguna</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-600 bg-purple-900/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Nama</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-purple-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-purple-600/30 hover:bg-purple-900/20 transition">
                    <td className="px-6 py-4 text-white">{user.namaLengkap}</td>
                    <td className="px-6 py-4 text-purple-300">{user.username}</td>
                    <td className="px-6 py-4 text-purple-300 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-purple-100">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'pending' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                          ⏳ Tertunda
                        </span>
                      )}
                      {user.status === 'approved' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                          ✓ Disetujui
                        </span>
                      )}
                      {user.status === 'rejected' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                          ✗ Ditolak
                        </span>
                      )}
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
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded hover:bg-purple-900/50 text-yellow-400 transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 rounded hover:bg-purple-900/50 text-red-400 transition"
                          title="Hapus"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 rounded-lg border border-purple-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-purple-900 border-b border-purple-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Tambah User Baru</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-purple-300 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Nama Lengkap *</label>
                  <input
                    type="text"
                    name="namaLengkap"
                    value={formData.namaLengkap}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">NIS</label>
                  <input
                    type="text"
                    name="nis"
                    value={formData.nis}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Password Section */}
              <div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDefaultPassword}
                      onChange={(e) => setUseDefaultPassword(e.target.checked)}
                      className="w-4 h-4 rounded accent-purple-500"
                    />
                    <span className="text-purple-200">Gunakan Password Default</span>
                  </label>
                  {useDefaultPassword && (
                    <div className="mt-2 p-3 rounded bg-purple-900/50 border border-purple-600">
                      <p className="text-sm text-purple-200">
                        <span className="font-semibold">Administrator:</span> {DEFAULT_PASSWORDS.administrator}
                      </p>
                      <p className="text-sm text-purple-200">
                        <span className="font-semibold">Guru:</span> {DEFAULT_PASSWORDS.guru}
                      </p>
                      <p className="text-sm text-purple-200">
                        <span className="font-semibold">Siswa:</span> {DEFAULT_PASSWORDS.siswa}
                      </p>
                    </div>
                  )}
                </div>

                {!useDefaultPassword && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required={!useDefaultPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-2">Konfirmasi Password *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required={!useDefaultPassword}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">No. HP</label>
                  <input
                    type="tel"
                    name="noHp"
                    value={formData.noHp}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Email Pemulihan</label>
                  <input
                    type="email"
                    name="emailPemulihan"
                    value={formData.emailPemulihan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {myRole === 'root' && <option value="root">Root</option>}
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  {myRole === 'root' && <option value="administrator">Administrator</option>}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t border-purple-600">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition"
                >
                  Tambah User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 rounded-lg border border-purple-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-purple-900 border-b border-purple-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-purple-300 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    name="namaLengkap"
                    value={formData.namaLengkap}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">NIS</label>
                  <input
                    type="text"
                    name="nis"
                    value={formData.nis}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Email (Tidak dapat diubah)</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-purple-600/50 bg-purple-900/20 text-purple-300 opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">No. HP</label>
                  <input
                    type="tel"
                    name="noHp"
                    value={formData.noHp}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Email Pemulihan</label>
                  <input
                    type="email"
                    name="emailPemulihan"
                    value={formData.emailPemulihan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={myRole === 'administrator' && (selectedUser.role === 'root' || selectedUser.role === 'administrator')}
                  className="w-full px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {myRole === 'root' && <option value="root">Root</option>}
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  {myRole === 'root' && <option value="administrator">Administrator</option>}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-purple-600">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL USER MODAL */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 rounded-lg border border-purple-600 max-w-2xl w-full">
            <div className="border-b border-purple-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Detail User</h2>
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
              <div>
                <p className="text-sm text-purple-300 mb-1">Nama Lengkap</p>
                <p className="text-lg text-white font-medium">{selectedUser.namaLengkap}</p>
              </div>
              <div>
                <p className="text-sm text-purple-300 mb-1">Username</p>
                <p className="text-lg text-white font-medium">{selectedUser.username}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">NIS</p>
                  <p className="text-white">{selectedUser.nis || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">Role</p>
                  <p className="text-white"><span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-600 text-purple-100">{selectedUser.role}</span></p>
                </div>
              </div>
              <div>
                <p className="text-sm text-purple-300 mb-1">Email</p>
                <p className="text-white">{selectedUser.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-300 mb-1">No. HP</p>
                  <p className="text-white">{selectedUser.noHp || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-300 mb-1">Email Pemulihan</p>
                  <p className="text-white text-sm">{selectedUser.emailPemulihan || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-purple-300 mb-1">Tanggal Dibuat</p>
                <p className="text-white">{new Date(selectedUser.createdAt).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="border-t border-purple-600 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 rounded-lg border border-red-600/50 max-w-md w-full">
            <div className="border-b border-red-600/50 p-6">
              <h2 className="text-2xl font-bold text-red-400">Hapus User</h2>
            </div>

            <div className="p-6">
              <p className="text-white mb-2">Apakah Anda yakin ingin menghapus user berikut?</p>
              <p className="text-lg font-semibold text-white mb-6">{selectedUser.namaLengkap}</p>
              <p className="text-sm text-red-400/70">Tindakan ini tidak dapat dibatalkan.</p>
            </div>

            <div className="border-t border-red-600/50 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2 rounded-lg border border-purple-600 hover:bg-purple-900/30 text-white font-medium transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
