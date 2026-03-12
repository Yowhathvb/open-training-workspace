'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulasi login
    setTimeout(() => {
      setIsLoading(false);
      alert(`Login dengan email: ${email}`);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500 opacity-20 blur-[120px]" />
        <div className="absolute right-[-120px] top-24 h-[360px] w-[360px] rounded-full bg-purple-600 opacity-15 blur-[120px]" />
        <div className="absolute bottom-[-200px] left-1/3 h-[520px] w-[520px] rounded-full bg-purple-700 opacity-10 blur-[160px]" />
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:px-8">
        {/* Header */}
        <div className="w-full max-w-md mb-12 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-lg font-bold tracking-[0.2em] text-white">
              OTW
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs uppercase tracking-[0.3em] text-purple-300">
                Open Source LMS
              </span>
              <span className="text-sm font-semibold text-white">OTW Platform</span>
            </div>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Form Card with Header */}
          <div className="rounded-3xl border border-purple-600 bg-purple-900/30 p-8 shadow-2xl backdrop-blur">
            {/* Greeting */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white">Selamat Datang</h1>
              <p className="mt-2 text-sm text-purple-200">
                Masuk ke akun Anda untuk melanjutkan
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@contoh.com"
                  className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-purple-600 bg-purple-900/40 px-4 py-3 text-white placeholder-purple-300 transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-200 transition"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM2 10a.967.967 0 01.052-.393A9.996 9.996 0 1117.948 10c-1.274-4.057-5.064-7-9.542-7C5.522 3 1.732 5.943.458 10zm9 4a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-purple-600 bg-purple-900/40 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-purple-200">Ingat saya</span>
                </label>
                <Link href="#" className="text-sm text-purple-400 hover:text-purple-300 transition">
                  Lupa password?
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 font-semibold text-white transition hover:shadow-lg hover:shadow-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Masuk...
                  </div>
                ) : (
                  'Masuk'
                )}
              </button>

              {/* Demo Credentials */}
              <div className="rounded-lg border border-purple-600 bg-purple-900/20 p-4">
                <p className="text-xs font-semibold text-purple-300 mb-2">Demo Test:</p>
                <div className="space-y-1 text-xs text-purple-200">
                  <p>📧 <span className="font-mono">demo@otw.com</span></p>
                  <p>🔒 <span className="font-mono">password123</span></p>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-md mt-8 text-center">
          <p className="text-sm text-purple-200">
            Belum punya akun?{' '}
            <Link href="#" className="font-semibold text-purple-400 hover:text-purple-300 transition">
              Daftar sekarang
            </Link>
          </p>
          <p className="text-xs text-purple-300 mt-4">
            <Link href="/" className="hover:text-purple-200 transition">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
