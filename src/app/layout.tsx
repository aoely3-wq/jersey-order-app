import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Aulia NAWASENA - Platform Digital Pemesanan Jersey Olahraga',
  description:
    'Aulia NAWASENA: Platform digital pemesanan jersey olahraga resmi motif Cual Kanwil DJPb Kepulauan Bangka Belitung dengan pembayaran mandiri via QRIS & Virtual Account Multi-Bank.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="font-sans min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Suspense fallback={<div className="h-18 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-4xl mx-auto px-4 space-y-1">
            <p className="font-bold text-slate-800">
              Aulia NAWASENA &bull; Platform Digital Pemesanan Jersey Olahraga
            </p>
            <p className="text-[11px] text-slate-400">
              Pemesanan Jersey Resmi Kanwil Ditjen Perbendaharaan Provinsi Kepulauan Bangka Belitung &bull; InTress
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
