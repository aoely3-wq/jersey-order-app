'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Shirt,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Users,
  Info,
  Sparkles,
  ShieldCheck,
  Check,
  Maximize2,
  X,
  Layers,
  Award,
  Zap,
  Eye,
} from 'lucide-react';
import {
  JerseySize,
  SleeveType,
  SIZES,
  calculatePrice,
  formatRupiah,
  Order,
} from '@/lib/types';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function OrderPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [size, setSize] = useState<JerseySize>('L');
  const [sleeve, setSleeve] = useState<SleeveType>('pendek');
  const [notes, setNotes] = useState('');
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Live price calculation
  const price = useMemo(() => calculatePrice(sleeve, size), [sleeve, size]);

  const currentJerseyImage =
    sleeve === 'pendek' ? '/jersey-pendek.jpg' : '/jersey-panjang.jpg';
  const currentJerseyTitle =
    sleeve === 'pendek'
      ? 'Jersey Cual DJPb Babel (Lengan Pendek) – Varian B: Biru Kemenkeu'
      : 'Jersey Cual DJPb Babel (Lengan Panjang) – Varian B: Biru Kemenkeu';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Harap masukkan nama lengkap & bidang/bagian Anda');
      return;
    }
    if (!phone.trim()) {
      setError('Harap masukkan nomor WhatsApp aktif');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          size,
          sleeve,
          notes: notes.trim(),
        }),
      });

      const result = await res.json();
      if (result.success && result.data) {
        setActiveOrder(result.data);
      } else {
        setError(result.message || 'Gagal menyimpan pesanan');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kendala koneksi server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* HERO BANNER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white p-6 sm:p-10 mb-8 sm:mb-10 shadow-xl border border-blue-800/60">
        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Edisi Resmi 2026
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-medium backdrop-blur-xs">
              Kanwil DJPb Kepulauan Bangka Belitung
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600/40 text-blue-200 text-xs font-medium">
              Indonesian Treasury (InTress)
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Jersey Cual DJPb Babel
          </h1>
          <p className="text-base sm:text-lg font-medium text-amber-300 mt-1">
            Varian B: Biru Kemenkeu &bull; Motif Serpihan Cual Modern
          </p>
          <p className="mt-3 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            Perpaduan keanggunan motif kain Cual khas Bangka Belitung berpadu dengan wibawa warna Biru Kemenkeu dan aksen emas. Silakan pilih tipe lengan, tentukan ukuran Anda, dan bayar mandiri secara otomatis melalui QRIS.
          </p>
        </div>
      </div>

      {/* JERSEY SHOWCASE & GALLERY CARD */}
      <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/90 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Preview Desain Jersey
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tampak Depan & Belakang &bull; Model {sleeve === 'pendek' ? 'Lengan Pendek' : 'Lengan Panjang'}
            </p>
          </div>

          {/* Model Switcher Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSleeve('pendek')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                sleeve === 'pendek'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Lengan Pendek</span>
              <span className="text-[11px] opacity-80">(Rp 100rb)</span>
            </button>
            <button
              type="button"
              onClick={() => setSleeve('panjang')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                sleeve === 'panjang'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Lengan Panjang</span>
              <span className="text-[11px] opacity-80">(Rp 120rb)</span>
            </button>
          </div>
        </div>

        {/* Main Image Viewport */}
        <div className="mt-6 relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner">
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full max-h-[520px]">
            <Image
              src={currentJerseyImage}
              alt={currentJerseyTitle}
              fill
              className="object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-[1.01]"
              priority
            />
          </div>

          {/* Overlay Click-to-Zoom Button */}
          <button
            type="button"
            onClick={() => setLightboxImage(currentJerseyImage)}
            className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2 transition-transform hover:scale-105 border border-white/20"
          >
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <span>Perbesar Gambar HD</span>
          </button>

          {/* Model Badge on Top Left */}
          <div className="absolute top-4 left-4 flex flex-col gap-1">
            <span className="bg-blue-950/90 text-white text-[11px] font-bold px-3 py-1 rounded-lg backdrop-blur-md border border-blue-500/40">
              {sleeve === 'pendek' ? 'LENGAN PENDEK' : 'LENGAN PANJANG'}
            </span>
            <span className="bg-amber-500/90 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-md self-start">
              VARIAN B &bull; BIRU KEMENKEU
            </span>
          </div>
        </div>

        {/* Detail Specifications Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 font-bold">
              <Layers className="w-4 h-4 text-blue-900" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Motif Cual Serpihan</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kearifan lokal motif Cual Bangka Belitung dengan geometri modern.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Identitas Kemenkeu</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Logo resmi InTress di dada kiri & DJPb Babel di kedua lengan.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Bahan Dry-Fit Milano</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ringan, adem, berpori mikro, cepat menyerap keringat untuk kenyamanan.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Full Printing Sublim</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Warna biru & emas tajam tahan lama, tidak mudah luntur dicuci berulang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ORDER FORM & SUMMARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Input */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Formulir Pemesanan Jersey
              </h3>
              <p className="text-xs text-slate-500">
                Isi data pemesan dan tentukan spesifikasi jersey Anda.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Nama Lengkap */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap & Bidang / Bagian <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Contoh: Dimas Aditya (Bidang PPA I)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
              />
            </div>

            {/* 2. Nomor WhatsApp */}
            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                No. WhatsApp / HP Aktif <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="Contoh: 081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Digunakan untuk notifikasi pembagian jersey saat produksi selesai.
              </p>
            </div>

            {/* 3. Tipe Lengan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilihan Model Lengan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setSleeve('pendek')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    sleeve === 'pendek'
                      ? 'border-blue-900 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Lengan Pendek</span>
                    {sleeve === 'pendek' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <span className="text-xs font-bold text-blue-900">Rp 100.000</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSleeve('panjang')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    sleeve === 'panjang'
                      ? 'border-blue-900 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Lengan Panjang</span>
                    {sleeve === 'panjang' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-900">Rp 120.000</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md">
                      +Rp 20.000
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Ukuran Jersey */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ukuran Baju <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSizeChart(!showSizeChart)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{showSizeChart ? 'Tutup Panduan Size' : 'Lihat Panduan Ukuran'}</span>
                </button>
              </div>

              {/* Panduan Size Chart Collapsible */}
              {showSizeChart && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Tabel Ukuran Jersey (Lebar Dada x Panjang Badan):</span>
                    <span className="text-[10px] text-slate-500 font-normal">Toleransi &plusmn; 1-2 cm</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-medium">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">S:</b> 48 x 68 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">M:</b> 50 x 70 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">L:</b> 52 x 72 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">XL:</b> 54 x 74 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">XXL:</b> 56 x 76 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">3XL:</b> 58 x 78 cm
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <b className="text-blue-900">4XL:</b> 60 x 80 cm
                    </div>
                  </div>
                </div>
              )}

              {/* Size Buttons Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {SIZES.map((item) => {
                  const isSelected = size === item.value;
                  const isJumbo =
                    item.value === 'XXL' || item.value === '3XL' || item.value === '4XL';

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSize(item.value)}
                      className={`py-3 px-1 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-blue-900 bg-blue-900 text-white font-bold shadow-md shadow-blue-900/20 scale-[1.02]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <span className="text-sm font-bold">{item.value}</span>
                      {isJumbo && (
                        <span
                          className={`text-[9px] font-bold mt-0.5 px-1 rounded ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          +10rb
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                *Ukuran di atas XL (XXL, 3XL, 4XL) dikenakan biaya tambahan Rp 10.000 untuk konsumsi kain ekstra konveksi.
              </p>
            </div>

            {/* 5. Catatan Tambahan (Opsional) */}
            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Khusus (Opsional)
              </label>
              <input
                id="notes"
                type="text"
                placeholder="Contoh: Titip ke meja Bidang PPA I / Request khusus"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-900/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-base"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5 text-amber-300" />
                  <span>Lanjut Pembayaran QRIS ({formatRupiah(price.totalPrice)})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Sticky Live Price & Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Shirt className="w-5 h-5 text-blue-900" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Rincian Pesanan Anda
              </h3>
            </div>

            {/* Selected Item Thumbnail */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
              <div className="relative w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                <Image
                  src={currentJerseyImage}
                  alt={currentJerseyTitle}
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  Jersey Cual DJPb Babel
                </h4>
                <p className="text-[11px] text-slate-500 capitalize">
                  Lengan {sleeve} &bull; Ukuran {size}
                </p>
                <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md mt-0.5">
                  Varian B: Biru Kemenkeu
                </span>
              </div>
            </div>

            {/* Breakdown Items */}
            <div className="space-y-2.5 text-xs sm:text-sm border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center text-slate-600">
                <span>Jersey Lengan Pendek (Dasar)</span>
                <span className="font-semibold text-slate-800">{formatRupiah(price.basePrice)}</span>
              </div>

              {price.sleeveExtra > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tambahan Lengan Panjang</span>
                  <span className="font-semibold text-blue-900">+{formatRupiah(price.sleeveExtra)}</span>
                </div>
              )}

              {price.sizeExtra > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Ukuran Ekstra ({size})</span>
                  <span className="font-semibold text-amber-700">+{formatRupiah(price.sizeExtra)}</span>
                </div>
              )}
            </div>

            {/* Total Price Display */}
            <div className="pt-4 flex items-baseline justify-between mb-6">
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Total Pembayaran
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  QRIS Mandiri Instant
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
                  {formatRupiah(price.totalPrice)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-blue-900 shrink-0" />
              <span>
                Setelah pembayaran QRIS berhasil, pesanan Anda langsung tercatat otomatis di Rekap Panitia.
              </span>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <Link
                href="/rekap"
                className="text-xs text-slate-600 hover:text-blue-900 inline-flex items-center gap-1.5 font-bold transition-colors"
              >
                <Users className="w-4 h-4 text-blue-900" />
                <span>Lihat Rekap Pesanan Teman Kantor &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL (ZOOM IMAGE) */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 text-white border-b border-slate-800 mb-2">
              <div className="text-xs sm:text-sm font-bold text-amber-300">
                {currentJerseyTitle}
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-[16/10] w-full max-h-[80vh]">
              <Image
                src={lightboxImage}
                alt="Jersey HD"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* QRIS PAYMENT POPUP MODAL */}
      {activeOrder && (
        <QrisPaymentModal
          order={activeOrder}
          isOpen={!!activeOrder}
          onClose={() => setActiveOrder(null)}
          onPaymentSuccess={(updated) => setActiveOrder(updated)}
        />
      )}
    </div>
  );
}
