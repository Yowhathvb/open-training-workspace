'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: 'Fitur', href: '#fitur' },
    { label: 'Role', href: '#role' },
    { label: 'Alur', href: '#alur' },
    { label: 'Instalasi', href: '#install' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-purple-900/90 backdrop-blur-md border-b border-purple-700">
      <div className="mx-auto flex items-center justify-between w-full max-w-6xl px-6 py-4 md:px-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-semibold tracking-[0.2em] text-white">
            OTW
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.3em] text-purple-300">
              Open Source LMS
            </span>
            <span className="text-base font-semibold text-white">OTW Platform</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-purple-200 transition hover:text-purple-400 font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col gap-1.5 focus:outline-none"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile Navigation Slide Menu */}
      <div
        className={`fixed top-0 right-0 h-screen w-64 bg-purple-900 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button area */}
        <div className="p-6 border-b border-purple-700">
          <button
            onClick={() => setIsOpen(false)}
            className="text-purple-300 hover:text-white transition"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Menu items */}
        <nav className="flex flex-col p-6 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-purple-200 hover:text-purple-400 transition font-medium py-2 px-4 rounded-lg hover:bg-purple-800"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div className="mt-6 border-t border-purple-700 pt-6">
            <Link
              href="#install"
              className="block text-center rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-purple-600/50 mb-3"
              onClick={() => setIsOpen(false)}
            >
              Mulai Instalasi
            </Link>
            <Link
              href="#fitur"
              className="block text-center rounded-full border border-purple-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-800"
              onClick={() => setIsOpen(false)}
            >
              Lihat Fitur
            </Link>
          </div>
        </nav>
      </div>

      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </header>
  );
}

