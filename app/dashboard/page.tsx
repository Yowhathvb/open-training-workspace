'use client';

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Selamat Datang</h1>
        <p className="text-purple-200">Dashboard OTW Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Total Kursus</p>
              <p className="text-3xl font-bold text-white mt-2">12</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/20">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Total User</p>
              <p className="text-3xl font-bold text-white mt-2">45</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/20">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Kursus Aktif</p>
              <p className="text-3xl font-bold text-white mt-2">8</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">Perolehan</p>
              <p className="text-3xl font-bold text-white mt-2">92%</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/20">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kursus Terbaru */}
        <div className="lg:col-span-2 rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Kursus Terbaru</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-purple-800/20 hover:bg-purple-800/40 transition">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <div>
                    <p className="font-semibold text-white">React Basics Course</p>
                    <p className="text-sm text-purple-300">By John Doe</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-400">Aktif</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Aktivitas</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                <div className="text-sm">
                  <p className="font-medium text-white">User baru terdaftar</p>
                  <p className="text-xs text-purple-300">2 jam yang lalu</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
