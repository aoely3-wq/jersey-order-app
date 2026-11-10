'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shirt, PlusCircle, Search, ShieldCheck, Sparkles, Lock } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-all border border-blue-700/50">
            <Shirt className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              <span className="tracking-tight text-base sm:text-lg text-blue-950 font-black">
                Aulia NAWASENA
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300/60 hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                Store Resmi
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">
              Jersey Resmi Kanwil DJPb Bangka Belitung
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Menu Pemesan: Pesan Jersey */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              pathname === '/'
                ? 'bg-blue-900 text-white shadow-sm shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pesan Jersey</span>
          </Link>

          {/* Menu Pemesan: Cek Status Pembayaran */}
          <Link
            href="/status"
            className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              pathname === '/status'
                ? 'bg-blue-900 text-white shadow-sm shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Cek Status</span>
          </Link>

          {/* Menu Khusus Admin (Diberi Gembok) */}
          <Link
            href="/rekap"
            title="Khusus Panitia / Admin"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              pathname === '/rekap'
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
