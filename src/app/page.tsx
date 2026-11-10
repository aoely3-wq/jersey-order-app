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
  Building2,
  UserCheck,
} from 'lucide-react';
import {
  JerseySize,
  SleeveType,
  GenderCut,
  SIZES,
  DIVISIONS,
  SIZE_CHART_DATA,
  calculatePrice,
  formatRupiah,
  Order,
} from '@/lib/types';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function OrderPage() {
  const [name, setName] = useState('');
  const [division, setDivision] = useState<string>('Bagian Umum');
  const [genderCut, setGenderCut] = useState<GenderCut>('men');
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

  const currentChart = SIZE_CHART_DATA[genderCut];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Harap masukkan Nama Lengkap Anda');
      return;
    }
    if (!division) {
      setError('Harap pilih Bidang / Bagian Anda');
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
          division: division.trim(),
          genderCut,
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white shadow-xl mb-8 p-6 sm:p-10 border border-blue-800/50">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none hidden md:block">
          <Shirt className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
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
            Pemesanan resmi jersey kantor dengan pilihan potongan <b>Size Reguler (Men)</b> &amp; <b>Size Ladies</b>, pilihan lengan pendek/panjang, serta pembayaran mandiri QRIS otomatis terkoneksi ke Google Sheets.
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
              <span className="text-[11px] opacity-80">(Rp 130rb)</span>
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
              <span className="text-[11px] opacity-80">(Rp 140rb)</span>
            </button>
          </div>
        </div>

        {/* Big Preview Image Container */}
        <div className="mt-6 relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 p-3 sm:p-6 overflow-hidden group shadow-inner border border-slate-800">
          <div className="relative aspect-[16/10] sm:aspect-[2/1] w-full max-h-[500px]">
            <Image
              src={currentJerseyImage}
              alt={currentJerseyTitle}
              fill
              priority
              className="object-contain transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </div>

          {/* Hover Zoom Overlay Action */}
          <button
            type="button"
            onClick={() => setLightboxImage(currentJerseyImage)}
            className="absolute bottom-4 right-4 bg-black/75 hover:bg-black text-white text-xs font-semibold px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
          >
            <Maximize2 className="w-4 h-4 text-amber-300" />
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
                Logo resmi InTress di dada kiri &amp; DJPb Babel di kedua lengan.
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
                Warna biru &amp; emas tajam tahan lama, tidak mudah luntur dicuci berulang.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Nama Lengkap */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Contoh: Aulia Rahim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all font-medium"
              />
            </div>

            {/* 2. Bidang / Bagian (Dropdown) */}
            <div>
              <label htmlFor="division" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bidang / Bagian <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all font-medium cursor-pointer appearance-none"
                >
                  {DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 3. Nomor WhatsApp */}
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Digunakan untuk notifikasi pembagian jersey saat produksi konveksi selesai.
              </p>
            </div>

            {/* 4. Model Potongan Baju (Reguler Men vs Ladies) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilihan Model Potongan Baju <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGenderCut('men')}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    genderCut === 'men'
                      ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Size Reguler (Men)</span>
                    {genderCut === 'men' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pola potongan lurus standar pria / unisex
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGenderCut('ladies')}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    genderCut === 'ladies'
                      ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Size Ladies</span>
                    {genderCut === 'ladies' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Pola potongan lekuk pinggang khusus wanita
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Tipe Lengan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilihan Model Lengan <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSleeve('pendek')}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    sleeve === 'pendek'
                      ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Lengan Pendek</span>
                    {sleeve === 'pendek' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <span className="text-xs font-extrabold text-blue-900">Rp 130.000</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSleeve('panjang')}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                    sleeve === 'panjang'
                      ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">Lengan Panjang</span>
                    {sleeve === 'panjang' && <Check className="w-4 h-4 text-blue-900" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-blue-900">Rp 140.000</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md">
                      +Rp 10.000
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 6. Ukuran Jersey */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ukuran Baju ({genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'}) <span className="text-red-500">*</span>
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

              {/* Panduan Size Chart Collapsible & Gambar Resmi */}
              {showSizeChart && (
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Panduan Ukuran Resmi Vendor ({genderCut === 'ladies' ? 'Size Ladies' : 'Size Reguler Men'})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Lebar dari ketiak kanan ke kiri &bull; Tinggi dari bahu ke bawah &bull; Toleransi &plusmn; 1-2 cm
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLightboxImage('/size-chart.jpg')}
                      className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs hover:scale-105 transition-all"
                    >
                      <Eye className="w-3 h-3 text-blue-900" />
                      <span>Lihat Poster Chart HD</span>
                    </button>
                  </div>

                  {/* Interactive Measurement Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-slate-700 font-medium">
                    {currentChart.map((m) => (
                      <div
                        key={m.size}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          size === m.size
                            ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-black">{m.size}</div>
                        <div className={`text-[11px] mt-0.5 ${size === m.size ? 'text-blue-100' : 'text-slate-500'}`}>
                          L: <b>{m.width}</b> cm
                        </div>
                        <div className={`text-[11px] ${size === m.size ? 'text-blue-100' : 'text-slate-500'}`}>
                          T: <b>{m.height}</b> cm
                        </div>
                        {m.extraFee > 0 && (
                          <div className={`text-[9px] font-bold mt-1 px-1 rounded ${
                            size === m.size ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                          }`}>
                            +{formatRupiah(m.extraFee)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Buttons Grid (S sampai XXXL) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SIZES.map((item) => {
                  const isSelected = size === item.value;
                  const isExtra = item.value === 'XXXL';

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
                      {isExtra && (
                        <span
                          className={`text-[9px] font-bold mt-0.5 px-1 rounded ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          +5rb
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                *Ukuran XXXL (3XL) dikenakan biaya tambahan Rp 5.000 untuk konsumsi kain ekstra konveksi.
              </p>
            </div>

            {/* 7. Catatan Tambahan (Opsional) */}
            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Khusus (Opsional)
              </label>
              <input
                id="notes"
                type="text"
                placeholder="Contoh: Request nama panggilan / titip di meja kerja"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-900/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-base cursor-pointer"
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
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
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
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  {genderCut === 'ladies' ? 'Size Ladies' : 'Size Reguler Men'} &bull; Ukuran <b>{size}</b>
                </p>
                <p className="text-[11px] text-blue-900 font-semibold">
                  Lengan {sleeve === 'panjang' ? 'Panjang (+10rb)' : 'Pendek'}
                </p>
                <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-md mt-1">
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
            <div className="pt-4 flex items-baseline justify-between mb-5">
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Total Pembayaran
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  QRIS DANA Bisnis Auto-Amount
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
                Setelah pembayaran QRIS berhasil, pesanan Anda otomatis tersimpan di Google Sheets Panitia.
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-2 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 text-white border-b border-slate-800 mb-2">
              <div className="text-xs sm:text-sm font-bold text-amber-300">
                {lightboxImage.includes('size-chart')
                  ? 'Panduan Ukuran Resmi (Size Chart Vendor Konveksi)'
                  : currentJerseyTitle}
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full max-h-[80vh]">
              <Image
                src={lightboxImage}
                alt="Zoom HD"
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
