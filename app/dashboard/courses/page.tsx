'use client';

export default function CoursesPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Manajemen Kursus</h1>
        <p className="text-purple-200">Kelola semua kursus di platform</p>
      </div>

      {/* Add Course Button */}
      <div className="mb-6">
        <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium hover:shadow-lg hover:shadow-purple-600/50 transition">
          + Buat Kursus Baru
        </button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden hover:bg-purple-900/50 transition">
            <div className="h-40 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
              <svg className="w-16 h-16 text-purple-300 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-2">Kursus React {i}</h3>
              <p className="text-sm text-purple-300 mb-4">Oleh John Doe</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs bg-purple-700/50 text-purple-200 px-2 py-1 rounded">
                  {25 * i} Siswa
                </span>
                <span className="text-xs bg-green-700/50 text-green-200 px-2 py-1 rounded">
                  Aktif
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition">
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 rounded border border-purple-600 hover:bg-purple-800 text-purple-200 text-sm font-medium transition">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
