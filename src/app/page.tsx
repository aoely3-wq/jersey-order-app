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
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Palette,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import {
  JerseySize,
  SleeveType,
  GenderCut,
  JerseyColor,
  CartItem,
  SIZES,
  DIVISIONS,
  SIZE_CHART_DATA,
  calculatePrice,
  formatRupiah,
  Order,
} from '@/lib/types';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function OrderPage() {
  // Data Pemesan
  const [name, setName] = useState('');
  const [division, setDivision] = useState<string>('Bagian Umum');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Pilihan Item Jersey Aktif
  const [color, setColor] = useState<JerseyColor>('putih');
  const [genderCut, setGenderCut] = useState<GenderCut>('men');
  const [size, setSize] = useState<JerseySize>('L');
  const [sleeve, setSleeve] = useState<SleeveType>('pendek');
  const [quantity, setQuantity] = useState<number>(1);

  // Keranjang Belanja (Cart)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemAddedToast, setItemAddedToast] = useState(false);

  // Modal State
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Perhitungan Harga Item yang sedang dipilih di form
  const currentItemPricing = useMemo(() => calculatePrice(sleeve, size), [sleeve, size]);
  const currentItemSubtotal = currentItemPricing.totalPrice * quantity;

  // Perhitungan Total Seluruh Keranjang
  const cartTotalPrice = useMemo(() => {
    if (cart.length === 0) return currentItemSubtotal;
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart, currentItemSubtotal]);

  const cartTotalQty = useMemo(() => {
    if (cart.length === 0) return quantity;
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart, quantity]);

  // Gambar preview jersey aktif berdasarkan warna dan lengan
  const currentJerseyImage =
    color === 'maroon'
      ? '/jersey-maroon.jpg'
      : sleeve === 'pendek'
      ? '/jersey-pendek.jpg'
      : '/jersey-panjang.jpg';

  const currentJerseyTitle =
    color === 'maroon'
      ? 'Jersey Cual DJPb Babel – Gradasi Merah Maroon'
      : sleeve === 'pendek'
      ? 'Jersey Cual DJPb Babel (Lengan Pendek) – Putih / Biru Kemenkeu'
      : 'Jersey Cual DJPb Babel (Lengan Panjang) – Putih / Biru Kemenkeu';

  const currentChart = SIZE_CHART_DATA[genderCut];

  // Aksi Tambah ke Keranjang
  const handleAddToCart = () => {
    const pricing = calculatePrice(sleeve, size);
    const unitPrice = pricing.totalPrice;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (it) =>
          it.color === color &&
          it.genderCut === genderCut &&
          it.size === size &&
          it.sleeve === sleeve
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        const exist = updated[existingIndex];
        const newQty = exist.quantity + quantity;
        updated[existingIndex] = {
          ...exist,
          quantity: newQty,
          subtotal: unitPrice * newQty,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          color,
          genderCut,
          size,
          sleeve,
          quantity,
          basePrice: pricing.basePrice,
          sleeveExtra: pricing.sleeveExtra,
          sizeExtra: pricing.sizeExtra,
          unitPrice,
          subtotal: unitPrice * quantity,
        };
        return [...prev, newItem];
      }
    });

    // Reset qty selector ke 1
    setQuantity(1);
    setItemAddedToast(true);
    setTimeout(() => setItemAddedToast(false), 3000);
  };

  // Ubah kuantitas item di keranjang
  const handleUpdateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const newQty = it.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...it,
              quantity: newQty,
              subtotal: it.unitPrice * newQty,
            };
          }
          return it;
        })
        .filter((it): it is CartItem => it !== null)
    );
  };

  // Hapus item dari keranjang
  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
  };

  // Submit Final Pesanan
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

    // Jika keranjang masih kosong, otomatis gunakan item yang saat ini dipilih di form
    let itemsToSubmit: CartItem[] = [...cart];
    if (itemsToSubmit.length === 0) {
      const pricing = calculatePrice(sleeve, size);
      itemsToSubmit = [
        {
          id: `item-${Date.now()}`,
          color,
          genderCut,
          size,
          sleeve,
          quantity,
          basePrice: pricing.basePrice,
          sleeveExtra: pricing.sleeveExtra,
          sizeExtra: pricing.sizeExtra,
          unitPrice: pricing.totalPrice,
          subtotal: pricing.totalPrice * quantity,
        },
      ];
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          division: division.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
          items: itemsToSubmit,
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
            2 Pilihan Warna: Varian Putih (Biru Kemenkeu) &bull; Gradasi Merah Maroon
          </p>
          <p className="mt-3 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            Pemesanan resmi seragam jersey kantor. Anda dapat memesan <b>lebih dari satu jersey</b> (beda warna, ukuran, atau lengan) dalam <b>satu keranjang pembayaran sekaligus</b> via QRIS DANA Bisnis &amp; Virtual Account DOKU.
          </p>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-blue-200">Sudah memesan dan ingin cek status atau bayar?</span>
            <Link
              href="/status"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-blue-950 text-xs font-black transition-all shadow-sm shadow-black/10 hover:scale-[1.02]"
            >
              <Search className="w-3.5 h-3.5 text-blue-950" />
              <span>Cek Status &amp; Cetak Bukti PDF &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* JERSEY SHOWCASE & GALLERY CARD */}
      <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/90 mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Preview Desain Jersey
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilihan Warna: <b>{color === 'putih' ? 'Putih (Biru Kemenkeu)' : 'Gradasi Merah Maroon'}</b> &bull; {sleeve === 'pendek' ? 'Lengan Pendek' : 'Lengan Panjang'}
            </p>
          </div>

          {/* Switcher Warna & Lengan di Preview Banner */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Color Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setColor('putih')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  color === 'putih'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-white border border-slate-400 shrink-0" />
                <span>Putih (Biru)</span>
              </button>
              <button
                type="button"
                onClick={() => setColor('maroon')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  color === 'maroon'
                    ? 'bg-rose-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-700 border border-amber-300 shrink-0" />
                <span>Merah Maroon</span>
              </button>
            </div>

            {/* Sleeve Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSleeve('pendek')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sleeve === 'pendek'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Pendek</span>
              </button>
              <button
                type="button"
                onClick={() => setSleeve('panjang')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sleeve === 'panjang'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Panjang (+10rb)</span>
              </button>
            </div>
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
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span
              className={`text-white text-[11px] font-black px-3 py-1 rounded-lg backdrop-blur-md border ${
                color === 'maroon'
                  ? 'bg-rose-950/90 border-rose-500/50'
                  : 'bg-blue-950/90 border-blue-500/40'
              }`}
            >
              {color === 'maroon' ? 'VARIAN: MERAH MAROON' : 'VARIAN: PUTIH (BIRU KEMENKEU)'}
            </span>
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-md self-start">
              {sleeve === 'pendek' ? 'LENGAN PENDEK (Rp 130rb)' : 'LENGAN PANJANG (Rp 140rb)'}
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
                Warna cerah tajam tahan lama, tidak mudah luntur saat dicuci berulang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ORDER FORM & CART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Pemilihan Jersey & Data Pemesan */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Pilih Jersey &amp; Masukkan ke Keranjang
              </h3>
              <p className="text-xs text-slate-500">
                Tentukan warna, model, ukuran, dan jumlah jersey yang diinginkan.
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

            {/* A. DATA IDENTITAS PEMESAN */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-900" />
                <span>Data Pemesan:</span>
              </h4>

              {/* 1. Nama Lengkap */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Contoh: Aulia Rahim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-medium"
                />
              </div>

              {/* 2. Bidang / Bagian */}
              <div>
                <label htmlFor="division" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bidang / Bagian <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="division"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-medium cursor-pointer appearance-none"
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
                <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  No. WhatsApp Aktif <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Bukti invoice PDF &amp; notifikasi konfirmasi lunas akan dikirimkan otomatis ke nomor ini.
                </p>
              </div>
            </div>

            {/* B. SPESIFIKASI JERSEY YANG INGIN DITAMBAHKAN */}
            <div className="space-y-4 pt-1">
              {/* 1. Pilihan Desain / Warna Jersey */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-900" />
                  <span>Pilihan Desain &amp; Warna Jersey</span> <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setColor('putih')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      color === 'putih'
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden relative shrink-0 border border-slate-200">
                      <Image
                        src="/jersey-pendek.jpg"
                        alt="Putih"
                        fill
                        className="object-contain p-0.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">Varian Putih</span>
                        {color === 'putih' && <Check className="w-4 h-4 text-blue-900" />}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium truncate block">
                        Biru Kemenkeu &bull; Serpihan Cual
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setColor('maroon')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      color === 'maroon'
                        ? 'border-rose-900 bg-rose-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden relative shrink-0 border border-slate-200">
                      <Image
                        src="/jersey-maroon.jpg"
                        alt="Merah Maroon"
                        fill
                        className="object-contain p-0.5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-rose-950">Merah Maroon</span>
                        {color === 'maroon' && <Check className="w-4 h-4 text-rose-900" />}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium truncate block">
                        Gradasi Maroon &bull; Emas Cual
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Pilihan Potongan Baju (Men vs Ladies) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilihan Model Potongan Baju <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGenderCut('men')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      genderCut === 'men'
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">Size Reguler (Men)</span>
                      {genderCut === 'men' && <Check className="w-4 h-4 text-blue-900" />}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Pola potongan lurus standar pria / unisex
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenderCut('ladies')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      genderCut === 'ladies'
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">Size Ladies</span>
                      {genderCut === 'ladies' && <Check className="w-4 h-4 text-blue-900" />}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Pola potongan lekuk pinggang khusus wanita
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Pilihan Model Lengan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pilihan Model Lengan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSleeve('pendek')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      sleeve === 'pendek'
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">Lengan Pendek</span>
                      {sleeve === 'pendek' && <Check className="w-4 h-4 text-blue-900" />}
                    </div>
                    <span className="text-xs font-extrabold text-blue-900">Rp 130.000</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSleeve('panjang')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      sleeve === 'panjang'
                        ? 'border-blue-900 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">Lengan Panjang</span>
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

              {/* 4. Ukuran Jersey */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ukuran Baju ({genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'}) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(!showSizeChart)}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showSizeChart ? 'Tutup Panduan Size' : 'Panduan Ukuran'}</span>
                  </button>
                </div>

                {/* Panduan Size Chart Collapsible */}
                {showSizeChart && (
                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Panduan Ukuran ({genderCut === 'ladies' ? 'Size Ladies' : 'Size Reguler Men'})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Lebar dari ketiak ke ketiak &bull; Tinggi dari bahu ke bawah
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxImage('/size-chart.jpg')}
                        className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-lg font-bold text-slate-700 shadow-2xs hover:scale-105 transition-all cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-blue-900" />
                        <span>Poster HD</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-slate-700 font-medium">
                      {currentChart.map((m) => (
                        <div
                          key={m.size}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            size === m.size
                              ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="text-xs font-black">{m.size}</div>
                          <div className={`text-[10px] ${size === m.size ? 'text-blue-100' : 'text-slate-500'}`}>
                            L:{m.width} T:{m.height}
                          </div>
                          {m.extraFee > 0 && (
                            <div
                              className={`text-[9px] font-bold mt-0.5 px-1 rounded ${
                                size === m.size ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              +{formatRupiah(m.extraFee)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Buttons Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {SIZES.map((item) => {
                    const isSelected = size === item.value;
                    const is3XL = item.value === 'XXXL';
                    const is4XL = item.value === 'XXXXL';

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSize(item.value)}
                        className={`py-2.5 px-1 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'border-blue-900 bg-blue-900 text-white font-bold shadow-md shadow-blue-900/20 scale-[1.02]'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{item.value}</span>
                        {is3XL && (
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
                        {is4XL && (
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
              </div>

              {/* 5. Jumlah / Qty Selector & Tombol Tambah ke Keranjang */}
              <div className="pt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Jumlah (Qty):
                  </span>
                  <div className="flex items-center bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-slate-900 font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="p-2 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-blue-950">
                    = {formatRupiah(currentItemSubtotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-blue-950" />
                  <span>＋ Tambahkan ke Keranjang</span>
                </button>
              </div>

              {itemAddedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Jersey berhasil dimasukkan ke Keranjang Belanja!</span>
                  </div>
                  <span className="text-[11px] underline">Lihat di kolom kanan &rarr;</span>
                </div>
              )}
            </div>

            {/* 6. Catatan Tambahan (Opsional) */}
            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Khusus (Opsional)
              </label>
              <input
                id="notes"
                type="text"
                placeholder="Contoh: Request titip di meja kerja Pak Aulia / Tambahan bordir nama"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-extrabold py-4 px-6 rounded-2xl shadow-lg shadow-blue-900/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-base cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-5 h-5 text-amber-300" />
                  <span>
                    Lanjut Pembayaran ({formatRupiah(cartTotalPrice)} &bull; {cartTotalQty} pcs)
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Shopping Cart & Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-900" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Keranjang Belanja
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900">
                {cart.length > 0 ? `${cartTotalQty} Pcs Jersey` : '1 Item Dipilih'}
              </span>
            </div>

            {/* List Item di Keranjang */}
            <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center space-y-2">
                  <p className="font-semibold text-slate-700">
                    Belum ada jersey tambahan di keranjang.
                  </p>
                  <p className="text-[11px]">
                    Item yang sedang Anda tentukan di formulir kiri otomatis dihitung ({formatRupiah(currentItemSubtotal)}). Klik <b>[＋ Tambahkan ke Keranjang]</b> jika ingin memesan lebih dari satu jersey.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const isMaroon = item.color === 'maroon';
                  const itemImg =
                    isMaroon
                      ? '/jersey-maroon.jpg'
                      : item.sleeve === 'panjang'
                      ? '/jersey-panjang.jpg'
                      : '/jersey-pendek.jpg';

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 transition-all"
                    >
                      <div className="relative w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                        <Image
                          src={itemImg}
                          alt="Thumbnail"
                          fill
                          className="object-contain p-1"
                        />
                      </div>

                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 truncate">
                            {isMaroon ? 'Merah Maroon' : 'Putih (Biru)'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Hapus dari keranjang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">
                          {item.genderCut === 'ladies' ? 'Ladies' : 'Men'} &bull; Size <b>{item.size}</b> &bull; Lengan {item.sleeve === 'panjang' ? 'Panjang' : 'Pendek'}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60">
                          {/* Qty +/- Controls */}
                          <div className="flex items-center bg-white rounded-lg border border-slate-300">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, -1)}
                              className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-2 font-mono font-bold text-[11px] text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, 1)}
                              className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <span className="font-bold text-blue-950 text-xs">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Summary Box */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Total Pembayaran
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    QRIS DANA Bisnis &amp; VA DOKU
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-950 tracking-tight">
                    {formatRupiah(cartTotalPrice)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                <ShieldCheck className="w-5 h-5 text-blue-900 shrink-0" />
                <span>
                  Setelah pembayaran lunas, sistem otomatis menerbitkan <b>Bukti Faktur PDF Resmi</b> dan mengirim notifikasi WhatsApp ke nomor Anda.
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <Link
                  href="/status"
                  className="text-xs text-slate-600 hover:text-blue-900 inline-flex items-center gap-1.5 font-bold transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-blue-900" />
                  <span>Cek Status / Unduh Invoice PDF &rarr;</span>
                </Link>
              </div>
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
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
