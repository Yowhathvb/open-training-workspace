'use client';

export default function MyCoursesPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Kursus Saya</h1>
        <p className="text-purple-200">Kursus yang sedang Anda ikuti</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Cari kursus..."
          className="flex-1 px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select className="px-4 py-2 rounded-lg border border-purple-600 bg-purple-900/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option>Semua Status</option>
          <option>Sedang Belajar</option>
          <option>Selesai</option>
        </select>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-purple-600 bg-purple-900/30 overflow-hidden hover:bg-purple-900/50 transition">
            <div className="h-40 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <svg className="w-16 h-16 text-blue-300 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-2">JavaScript Advanced {i}</h3>
              <p className="text-sm text-purple-300 mb-4">Oleh Jane Smith</p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-200">Progres</span>
                  <span className="text-xs text-purple-200 font-medium">{45 + i * 5}%</span>
                </div>
                <div className="h-2 bg-purple-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-blue-500" style={{ width: `${45 + i * 5}%` }}></div>
                </div>
              </div>

              <button className="w-full px-3 py-2 rounded bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-lg hover:shadow-purple-600/50 text-white text-sm font-medium transition">
                Lanjutkan Belajar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
