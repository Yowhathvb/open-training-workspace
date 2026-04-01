'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardShell({
  children,
  role,
  displayName,
}: {
  children: React.ReactNode;
  role: string;
  displayName: string;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isGuru = role === 'guru';
  const isAdminLike = role === 'root' || role === 'administrator';

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 16l4-4m0 0l4 4m-4-4V5" />
        </svg>
      ),
    },
    ...(isAdminLike
      ? [
          {
            name: 'Menunggu Persetujuan',
            href: '/dashboard/pending-approval',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            name: 'Manajemen User',
            href: '/dashboard/users',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            ),
          },
          {
            name: 'Persetujuan Kursus',
            href: '/dashboard/pending-courses',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
        ]
      : []),
    ...(isGuru || isAdminLike
      ? [
          {
            name: 'Manajemen Kursus',
            href: '/dashboard/courses',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      name: 'Kursus Saya',
      href: '/dashboard/my-courses',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
        </svg>
      ),
    },
    {
      name: 'Profil',
      href: '/dashboard/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    ...(role === 'root'
      ? [
          {
            name: 'Pengaturan Website',
            href: '/dashboard/settings',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1.724 1.724 0 002.573 1.01c.837-.49 1.87.544 1.38 1.38a1.724 1.724 0 001.01 2.573c.921.3.921 1.603 0 1.902a1.724 1.724 0 00-1.01 2.573c.49.837-.544 1.87-1.38 1.38a1.724 1.724 0 00-2.573 1.01c-.3.921-1.603.921-1.902 0a1.724 1.724 0 00-2.573-1.01c-.837.49-1.87-.544-1.38-1.38a1.724 1.724 0 00-1.01-2.573c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 001.01-2.573c-.49-.837.544-1.87 1.38-1.38a1.724 1.724 0 002.573-1.01z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setIsLoggingOut(false);
      router.push('/login');
    }
  };

  return (
    <div className="relative flex min-h-screen bg-purple-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:flex-col md:transition-all md:duration-300 md:ease-in-out ${
          sidebarOpen ? 'md:w-72' : 'md:w-20'
        } bg-gradient-to-b from-purple-900 to-purple-950 border-r border-purple-800`}
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-between p-6 border-b border-purple-800">
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white font-bold text-sm">
                OTW
              </div>
              <div className="leading-tight">
                <div className="text-white font-semibold">OTW</div>
                {displayName && (
                  <div className="mt-1 text-xs text-purple-200">
                    Halo, <span className="font-semibold text-white">{displayName}</span>.
                    <div className="text-purple-300">Selamat datang di OTW.</div>
                  </div>
                )}
              </div>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-purple-800 transition text-purple-300 hover:text-white"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition group"
              title={!sidebarOpen ? item.name : ''}
            >
              <span className="flex-shrink-0 text-purple-400 group-hover:text-purple-300">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-purple-800 p-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="flex-shrink-0 text-purple-400 group-hover:text-purple-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            {sidebarOpen && <span className="text-sm font-medium">{isLoggingOut ? 'Logout...' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-900 to-purple-950 border-b border-purple-800 p-4 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-purple-800 transition text-purple-300 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white font-bold text-sm">
            OTW
          </div>
        </Link>
        <div className="w-10" />
      </div>

      {/* Mobile Sidebar Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-purple-900 to-purple-950 border-r border-purple-800 pt-20 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="px-4 py-6 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex-shrink-0 text-purple-400">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
            <div className="border-t border-purple-800 p-4 m-4">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="flex-shrink-0 text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
                <span className="text-sm font-medium">{isLoggingOut ? 'Logout...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 w-full md:transition-all md:duration-300 ${
          sidebarOpen ? 'md:ml-72' : 'md:ml-20'
        }`}
      >
        <div className="md:pt-0 pt-20 bg-purple-950 min-h-screen">
          {displayName && (
            <div className="md:hidden px-6 pt-4 text-sm text-purple-200">
              Halo, <span className="font-semibold text-white">{displayName}</span>. Selamat datang di OTW.
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}