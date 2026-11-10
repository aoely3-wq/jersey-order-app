'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shirt, PlusCircle, Search, ShieldCheck, Sparkles, Lock, FileText } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-xl bg-[#002B5B] text-white flex items-center justify-center shadow-sm shadow-[#002B5B]/25 transition-all border border-[#D4AF37]/50">
            <Shirt className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              <span className="tracking-tight text-base sm:text-lg text-[#002B5B] font-black">
                Aulia NAWASENA
              </span>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-full border border-[#D4AF37]/50 hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                Edisi Resmi 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block font-medium">
              Jersey Resmi Kanwil DJPb Bangka Belitung &bull; InTress
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {/* Menu Pemesan: Pesan Jersey */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              pathname === '/'
                ? 'bg-[#002B5B] text-white shadow-sm shadow-[#002B5B]/30'
                : 'text-slate-600 hover:text-[#002B5B] hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>Pesan Jersey</span>
          </Link>

          {/* Menu Pemesan: Cek Status & Download Bukti Bayar PDF */}
          <Link
            href="/status"
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
              pathname === '/status' || pathname?.startsWith('/invoice')
                ? 'bg-[#002B5B] text-white shadow-sm shadow-[#002B5B]/30'
                : 'text-slate-600 hover:text-[#002B5B] hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            <span>Cek Status &amp; Unduh PDF</span>
          </Link>

          {/* Menu Khusus Admin (Diberi Gembok) */}
          <Link
            href="/rekap"
            title="Khusus Admin / Rekap"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all border ${
              pathname === '/rekap'
                ? 'bg-[#D4AF37]/20 text-[#002B5B] border-[#D4AF37] shadow-xs'
                : 'text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
