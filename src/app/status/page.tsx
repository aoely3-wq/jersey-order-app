'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Shirt,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Phone,
  Sparkles,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Order, formatRupiah } from '@/lib/types';
import QrisPaymentModal from '@/components/QrisPaymentModal';
import { getWhatsAppDirectLink } from '@/lib/whatsapp';

export default function StatusPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Order[]>([]);
  const [activeModalOrder, setActiveModalOrder] = useState<Order | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Normalisasi input nomor (hapus spasi, tanda hubung, atau ubah 08xx ke 8xx)
        const normalizedInput = cleanQuery.replace(/[\s-+]/g, '').toLowerCase();
        const inputWithoutLeadingZero = normalizedInput.startsWith('0')
          ? normalizedInput.slice(1)
          : normalizedInput;

        const matched = data.data.filter((order: Order) => {
          const orderIdMatch = order.id.toLowerCase().includes(normalizedInput);
          const rawPhone = (order.phone || '').replace(/[\s-+]/g, '');
          const phoneMatch =
            rawPhone.includes(normalizedInput) ||
            rawPhone.includes(inputWithoutLeadingZero) ||
            inputWithoutLeadingZero.includes(rawPhone);
          const nameMatch = order.name.toLowerCase().includes(normalizedInput);

          return orderIdMatch || phoneMatch || nameMatch;
        });

        setResults(matched);
      }
    } catch (err) {
      console.error('Failed to search orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    setResults((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    setActiveModalOrder(updatedOrder);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
            <Search className="w-3.5 h-3.5 text-blue-700" />
            <span>Layanan Mandiri Pemesan</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
            Cek &amp; Monitor Status Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Masukkan <b>Nomor WhatsApp</b> atau <b>ID Pesanan</b> Anda untuk mengecek status pesanan atau melanjutkan pembayaran via QRIS / Virtual Account.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cari Pesanan Saya:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Contoh: 082136105904 atau ORD-373066"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="py-3 px-6 rounded-2xl bg-blue-900 hover:bg-blue-950 active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-md shadow-blue-950/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Cari Pesanan</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Tips: Anda bisa memasukkan nomor handphone yang digunakan saat memesan (bisa dengan awalan 08 atau 62).
            </p>
          </form>
        </div>

        {/* Hasil Pencarian */}
        {searched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Hasil Pencarian ({results.length})
              </h2>
              {results.length > 0 && (
                <button
                  onClick={() => handleSearch()}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Segarkan</span>
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Pesanan Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tidak ditemukan pesanan dengan kata kunci &quot;<span className="font-semibold text-slate-700">{query}</span>&quot;. Pastikan nomor handphone atau ID pesanan sudah benar.
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <span>Pesan Jersey Baru Sekarang</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {results.map((order) => {
                  const isPaid = order.status === 'PAID';
                  const waUrl = getWhatsAppDirectLink(order);

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300 space-y-4"
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-950 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {order.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {order.division || 'Bagian Umum'}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isPaid ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>LUNAS</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span>Menunggu Pembayaran</span>
                          </div>
                        )}
                      </div>

                      {/* Detail Pesanan */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400 text-[11px] font-medium">Nama Pemesan:</p>
                          <p className="font-bold text-slate-800 text-sm">{order.name}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">WhatsApp: {order.phone}</p>
                        </div>

                        <div>
                          <p className="text-slate-400 text-[11px] font-medium">Spesifikasi Jersey:</p>
                          <p className="font-bold text-slate-800 text-sm">
                            {order.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'} &bull; Size {order.size}
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Lengan {order.sleeve === 'panjang' ? 'Panjang' : 'Pendek'}
                          </p>
                        </div>
                      </div>

                      {/* Box Total Tagihan & Tombol Aksi */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                            Total Tagihan:
                          </span>
                          <p className="text-lg font-black text-blue-950">
                            {formatRupiah(order.totalPrice)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid ? (
                            <button
                              type="button"
                              onClick={() => setActiveModalOrder(order)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-blue-950/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4 text-amber-300" />
                              <span>Bayar Sekarang (QRIS / VA) &rarr;</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setActiveModalOrder(order)}
                                className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Lihat Bukti Lunas</span>
                              </button>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-all"
                              >
                                <span>Kirim WA</span>
                                <ExternalLink className="w-3 h-3 opacity-80" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Informasi Bantuan */}
        <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-blue-950">Informasi Pemesanan &amp; Pembayaran:</p>
          <p>
            &bull; Seluruh pembayaran diproses otomatis melalui <b>DOKU Gateway</b> (QRIS Dinamis &amp; Virtual Account Bank).
          </p>
          <p>
            &bull; Begitu pembayaran berhasil dilakukan di m-Banking atau E-Wallet, status pesanan otomatis berubah menjadi <b>LUNAS</b> di sistem dan Google Sheets.
          </p>
          <p>
            &bull; Ingin memesan jersey tambahan?{' '}
            <Link href="/" className="text-blue-700 hover:text-blue-900 font-bold underline">
              Klik di sini untuk mengisi form pemesanan &rarr;
            </Link>
          </p>
        </div>
      </div>

      {/* Pop-up Modal Pembayaran DOKU jika diklik */}
      {activeModalOrder && (
        <QrisPaymentModal
          order={activeModalOrder}
          isOpen={!!activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onPaymentSuccess={handleOrderUpdated}
        />
      )}
    </div>
  );
}
