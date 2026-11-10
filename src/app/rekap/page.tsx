'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  Clock,
  Shirt,
  Download,
  Copy,
  Check,
  Search,
  RefreshCw,
  Trash2,
  DollarSign,
  PlusCircle,
  ExternalLink,
  Filter,
  Building2,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Order, JerseySize, DIVISIONS, formatRupiah } from '@/lib/types';
import { getWhatsAppDirectLink } from '@/lib/whatsapp';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function RekapPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [cutFilter, setCutFilter] = useState<'ALL' | 'men' | 'ladies'>('ALL');
  const [copiedVendor, setCopiedVendor] = useState(false);
  const [activeModalOrder, setActiveModalOrder] = useState<Order | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Cek sesi login admin di sessionStorage
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('jersey_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim().toLowerCase();
    const validPins = ['djpb2026', 'admin123', 'aulia2026', 'kanwil2026'];

    if (validPins.includes(cleanPin)) {
      setIsAuthenticated(true);
      sessionStorage.setItem('jersey_admin_auth', 'true');
      setPinError('');
    } else {
      setPinError('PIN / Password Admin salah. Silakan periksa kembali.');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('jersey_admin_auth');
    setPinInput('');
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetch('/api/sheets/sync')
        .then((r) => r.json())
        .then((d) => setSheetConfigured(Boolean(d.configured)))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleSyncToSheets = async () => {
    setSyncingSheet(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/sheets/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(data.message || (data.success ? 'Sinkronisasi berhasil!' : 'Gagal sinkron'));
      if (data.success) fetchOrders();
    } catch {
      setSyncMessage('Terjadi kesalahan koneksi');
    } finally {
      setSyncingSheet(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone.includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.division && order.division.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ? true : order.status === statusFilter;

      const matchDivision =
        divisionFilter === 'ALL' ? true : (order.division || 'Bagian Umum') === divisionFilter;

      const matchCut =
        cutFilter === 'ALL' ? true : (order.genderCut || 'men') === cutFilter;

      return matchSearch && matchStatus && matchDivision && matchCut;
    });
  }, [orders, searchTerm, statusFilter, divisionFilter, cutFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const pendingOrders = orders.filter((o) => o.status === 'PENDING');
    const totalRevenuePaid = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalRevenuePotential = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      totalOrders,
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      totalRevenuePaid,
      totalRevenuePotential,
    };
  }, [orders]);

  // Rekap Matrix for Vendor Konveksi (Men vs Ladies & Pendek vs Panjang)
  const sizeMatrix = useMemo(() => {
    const allSizes: JerseySize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

    type MatrixRow = Record<JerseySize, number>;
    const initRow = (): MatrixRow => ({
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
      XXXL: 0,
      XXXXL: 0,
      '3XL': 0,
      '4XL': 0,
    });

    const menPendek = initRow();
    const menPanjang = initRow();
    const ladiesPendek = initRow();
    const ladiesPanjang = initRow();

    orders.forEach((o) => {
      const items =
        o.items && o.items.length > 0
          ? o.items
          : [
              {
                genderCut: o.genderCut || 'men',
                size: o.size || 'L',
                sleeve: o.sleeve || 'pendek',
                quantity: 1,
              },
            ];

      items.forEach((it) => {
        const isLadies = it.genderCut === 'ladies';
        const isPanjang = it.sleeve === 'panjang';
        let sizeStr = it.size as string;
        if (sizeStr === '3XL') sizeStr = 'XXXL';
        if (sizeStr === '4XL') sizeStr = 'XXXXL';
        const sizeKey = sizeStr as JerseySize;
        const qty = it.quantity || 1;

        if (isLadies) {
          if (isPanjang) ladiesPanjang[sizeKey] = (ladiesPanjang[sizeKey] || 0) + qty;
          else ladiesPendek[sizeKey] = (ladiesPendek[sizeKey] || 0) + qty;
        } else {
          if (isPanjang) menPanjang[sizeKey] = (menPanjang[sizeKey] || 0) + qty;
          else menPendek[sizeKey] = (menPendek[sizeKey] || 0) + qty;
        }
      });
    });

    const totalPerSize: Record<JerseySize, number> = {
      XS: (menPendek.XS || 0) + (menPanjang.XS || 0) + (ladiesPendek.XS || 0) + (ladiesPanjang.XS || 0),
      S: (menPendek.S || 0) + (menPanjang.S || 0) + (ladiesPendek.S || 0) + (ladiesPanjang.S || 0),
      M: (menPendek.M || 0) + (menPanjang.M || 0) + (ladiesPendek.M || 0) + (ladiesPanjang.M || 0),
      L: (menPendek.L || 0) + (menPanjang.L || 0) + (ladiesPendek.L || 0) + (ladiesPanjang.L || 0),
      XL: (menPendek.XL || 0) + (menPanjang.XL || 0) + (ladiesPendek.XL || 0) + (ladiesPanjang.XL || 0),
      XXL: (menPendek.XXL || 0) + (menPanjang.XXL || 0) + (ladiesPendek.XXL || 0) + (ladiesPanjang.XXL || 0),
      XXXL: (menPendek.XXXL || 0) + (menPanjang.XXXL || 0) + (ladiesPendek.XXXL || 0) + (ladiesPanjang.XXXL || 0),
      XXXXL: (menPendek.XXXXL || 0) + (menPanjang.XXXXL || 0) + (ladiesPendek.XXXXL || 0) + (ladiesPanjang.XXXXL || 0),
      '3XL': 0,
      '4XL': 0,
    };

    const sumRow = (r: MatrixRow) => allSizes.reduce((sum, s) => sum + (r[s] || 0), 0);

    const totalMenPendek = sumRow(menPendek);
    const totalMenPanjang = sumRow(menPanjang);
    const totalLadiesPendek = sumRow(ladiesPendek);
    const totalLadiesPanjang = sumRow(ladiesPanjang);

    return {
      allSizes,
      menPendek,
      menPanjang,
      ladiesPendek,
      ladiesPanjang,
      totalPerSize,
      totalMenPendek,
      totalMenPanjang,
      totalLadiesPendek,
      totalLadiesPanjang,
      grandTotal: totalMenPendek + totalMenPanjang + totalLadiesPendek + totalLadiesPanjang,
    };
  }, [orders]);

  // Copy vendor summary to clipboard
  const handleCopyVendorSummary = () => {
    const text = `*REKAP PESANAN JERSEY KANTOR UNTUK VENDOR KONVEKSI*
Total Keseluruhan: ${sizeMatrix.grandTotal} Pcs
(Lunas: ${metrics.paidCount} pcs | Menunggu: ${metrics.pendingCount} pcs)

📋 *DETAIL POTONGAN:*

*1. SIZE REGULER (MEN)*
• Lengan Pendek: ${sizeMatrix.totalMenPendek} pcs
  - XS: ${sizeMatrix.menPendek.XS || 0} | S: ${sizeMatrix.menPendek.S} | M: ${sizeMatrix.menPendek.M} | L: ${sizeMatrix.menPendek.L} | XL: ${sizeMatrix.menPendek.XL} | 2XL: ${sizeMatrix.menPendek.XXL} | 3XL: ${sizeMatrix.menPendek.XXXL} | 4XL: ${sizeMatrix.menPendek.XXXXL || 0}
• Lengan Panjang: ${sizeMatrix.totalMenPanjang} pcs
  - XS: ${sizeMatrix.menPanjang.XS || 0} | S: ${sizeMatrix.menPanjang.S} | M: ${sizeMatrix.menPanjang.M} | L: ${sizeMatrix.menPanjang.L} | XL: ${sizeMatrix.menPanjang.XL} | 2XL: ${sizeMatrix.menPanjang.XXL} | 3XL: ${sizeMatrix.menPanjang.XXXL} | 4XL: ${sizeMatrix.menPanjang.XXXXL || 0}

*2. SIZE LADIES*
• Lengan Pendek: ${sizeMatrix.totalLadiesPendek} pcs
  - XS: ${sizeMatrix.ladiesPendek.XS || 0} | S: ${sizeMatrix.ladiesPendek.S} | M: ${sizeMatrix.ladiesPendek.M} | L: ${sizeMatrix.ladiesPendek.L} | XL: ${sizeMatrix.ladiesPendek.XL} | 2XL: ${sizeMatrix.ladiesPendek.XXL} | 3XL: ${sizeMatrix.ladiesPendek.XXXL} | 4XL: ${sizeMatrix.ladiesPendek.XXXXL || 0}
• Lengan Panjang: ${sizeMatrix.totalLadiesPanjang} pcs
  - XS: ${sizeMatrix.ladiesPanjang.XS || 0} | S: ${sizeMatrix.ladiesPanjang.S} | M: ${sizeMatrix.ladiesPanjang.M} | L: ${sizeMatrix.ladiesPanjang.L} | XL: ${sizeMatrix.ladiesPanjang.XL} | 2XL: ${sizeMatrix.ladiesPanjang.XXL} | 3XL: ${sizeMatrix.ladiesPanjang.XXXL} | 4XL: ${sizeMatrix.ladiesPanjang.XXXXL || 0}

*TOTAL PER UKURAN:*
XS: ${sizeMatrix.totalPerSize.XS || 0} | S: ${sizeMatrix.totalPerSize.S} | M: ${sizeMatrix.totalPerSize.M} | L: ${sizeMatrix.totalPerSize.L} | XL: ${sizeMatrix.totalPerSize.XL} | 2XL: ${sizeMatrix.totalPerSize.XXL} | 3XL: ${sizeMatrix.totalPerSize.XXXL} | 4XL: ${sizeMatrix.totalPerSize.XXXXL || 0}
*GRAND TOTAL: ${sizeMatrix.grandTotal} PCS*`;

    navigator.clipboard.writeText(text);
    setCopiedVendor(true);
    setTimeout(() => setCopiedVendor(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Pesanan',
      'Nama Pemesan',
      'Bidang / Bagian',
      'Model Potongan',
      'Nomor WA',
      'Ukuran',
      'Tipe Lengan',
      'Total Harga',
      'Status',
      'Waktu Pesan',
      'Waktu Lunas',
      'Catatan',
    ];
    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${o.name}"`,
      `"${o.division || 'Bagian Umum'}"`,
      `"${o.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'}"`,
      `"'${o.phone}"`,
      `"${o.size}"`,
      `"${o.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'}"`,
      o.totalPrice,
      `"${o.status}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : ''}"`,
      `"${o.paidAt ? new Date(o.paidAt).toLocaleString('id-ID') : ''}"`,
      `"${o.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_jersey_nawasena_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JIKA BELUM LOGIN SEBAGAI ADMIN -> TAMPILKAN LAYAR LOGIN ADMIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-amber-300 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">Portal Panitia &amp; Admin</h1>
            <p className="text-xs text-blue-200 mt-1">
              Kanwil Ditjen Perbendaharaan Provinsi Kepulauan Bangka Belitung
            </p>
          </div>

          {/* Form Login PIN */}
          <div className="p-6 sm:p-8 space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
              <p className="font-bold text-amber-900 mb-1">Area Terproteksi:</p>
              Halaman ini memuat rekapitulasi lengkap vendor konveksi dan data pemesan kantor. Masukkan PIN Admin Anda untuk melanjutkan.
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  PIN / Password Admin:
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN Admin (djpb2026)"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition-all"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pinError && (
                  <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-sm transition-all shadow-md shadow-blue-950/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4 text-amber-300" />
                <span>Buka Panel Rekapitulasi</span>
              </button>
            </form>

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium hover:underline"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Kembali ke Halaman Pemesanan</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN DASHBOARD PENUH JIKA SUDAH AUTHENTICATED
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Admin Notice Bar */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white px-4 py-2.5 rounded-2xl mb-6 shadow-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">Mode Administrator Aktif:</span>
          <span className="text-blue-200 hidden sm:inline">
            Akses Penuh Panitia Pengadaan Jersey Kanwil DJPb Babel
          </span>
        </div>
        <button
          onClick={handleAdminLogout}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3 h-3" />
          <span>Keluar Admin</span>
        </button>
      </div>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200">
              <Shirt className="w-3.5 h-3.5 text-blue-700" />
              Panitia Pengadaan Seragam
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              Kanwil DJPb Babel
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Rekapitulasi Pesanan Jersey
          </h1>

          {/* Database indicator */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {sheetConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Database: Google Sheets (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Database: File Lokal JSON
              </span>
            )}

            {sheetConfigured && (
              <button
                type="button"
                onClick={handleSyncToSheets}
                disabled={syncingSheet}
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${syncingSheet ? 'animate-spin' : ''}`} />
                <span>{syncingSheet ? 'Menyinkronkan...' : 'Sinkronkan Data ke Google Sheets'}</span>
              </button>
            )}

            {syncMessage && (
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {syncMessage}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Pesanan Baru</span>
          </Link>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Jersey</span>
            <Shirt className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalOrders} Pcs</div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics.paidCount} lunas &bull; {metrics.pendingCount} belum
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Dana Masuk (Lunas)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatRupiah(metrics.totalRevenuePaid)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Terkonfirmasi via DOKU QRIS &amp; VA</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Bayar</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.pendingCount} Orang</div>
          <div className="text-xs text-slate-500 mt-1">Belum menyelesaikan transaksi</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimasi Total Nilai</span>
            <DollarSign className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatRupiah(metrics.totalRevenuePotential)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Jika seluruh pesanan lunas</div>
        </div>
      </div>

      {/* REKAPITULASI VENDOR KONVEKSI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shirt className="w-5 h-5 text-blue-600" />
              <span>Rekap Ukuran untuk Vendor Konveksi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian potongan <b>Reguler (Men)</b> &amp; <b>Ladies</b> (Lengan Pendek &amp; Panjang) sesuai gambar panduan ukuran vendor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyVendorSummary}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {copiedVendor ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedVendor ? 'Tersalin!' : 'Salin Rekap Teks WA'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV / Excel</span>
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                <th className="py-3 px-4 rounded-l-xl">Kategori &amp; Tipe Lengan</th>
                {sizeMatrix.allSizes.map((s) => (
                  <th key={s} className="py-3 px-3 text-center">
                    {s}
                  </th>
                ))}
                <th className="py-3 px-4 text-center rounded-r-xl bg-blue-50 text-blue-900">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 1. Men Pendek */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  Reguler (Men) - Lengan Pendek
                </td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.menPendek[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/50">
                  {sizeMatrix.totalMenPendek} pcs
                </td>
              </tr>

              {/* 2. Men Panjang */}
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">
                  Reguler (Men) - Lengan Panjang
                </td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.menPanjang[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/50">
                  {sizeMatrix.totalMenPanjang} pcs
                </td>
              </tr>

              {/* 3. Ladies Pendek */}
              <tr className="bg-rose-50/20">
                <td className="py-3 px-4 font-semibold text-rose-950">
                  Ladies - Lengan Pendek
                </td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.ladiesPendek[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-rose-800 bg-rose-50/50">
                  {sizeMatrix.totalLadiesPendek} pcs
                </td>
              </tr>

              {/* 4. Ladies Panjang */}
              <tr className="bg-rose-50/20">
                <td className="py-3 px-4 font-semibold text-rose-950">
                  Ladies - Lengan Panjang
                </td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.ladiesPanjang[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-rose-800 bg-rose-50/50">
                  {sizeMatrix.totalLadiesPanjang} pcs
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/90">
                <td className="py-3 px-4 text-slate-900">Total Semua Ukuran</td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                    {sizeMatrix.totalPerSize[s]}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-black bg-blue-100 text-blue-900">
                  {sizeMatrix.grandTotal} pcs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* FILTER & PENCARIAN DAFTAR PESANAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Daftar Pesanan Pegawai ({filteredOrders.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola status pembayaran dan rincian ukuran tiap pemesan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, WA, atau ID..."
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 w-48 sm:w-56"
              />
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="PAID">Lunas</option>
              <option value="PENDING">Menunggu Bayar</option>
            </select>

            {/* Filter Bidang */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Bidang</option>
              {DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Filter Potongan */}
            <select
              value={cutFilter}
              onChange={(e) => setCutFilter(e.target.value as any)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">Semua Model</option>
              <option value="men">Reguler Men</option>
              <option value="ladies">Ladies</option>
            </select>
          </div>
        </div>

        {/* Tabel Data Pesanan */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                <th className="py-3 px-3">No. Order</th>
                <th className="py-3 px-3">Nama &amp; Bidang</th>
                <th className="py-3 px-3">WhatsApp</th>
                <th className="py-3 px-3">Model</th>
                <th className="py-3 px-3 text-center">Ukuran</th>
                <th className="py-3 px-3">Lengan</th>
                <th className="py-3 px-3 text-right">Total Bayar</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Tidak ada pesanan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.status === 'PAID';
                  const waUrl = getWhatsAppDirectLink(order);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{order.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{order.name}</div>
                        <div className="text-[11px] text-blue-800 font-medium">
                          {order.division || 'Bagian Umum'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 text-slate-700 hover:text-emerald-700"
                        >
                          <span>{order.phone}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>
                      <td className="py-3 px-3">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-1">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-[11px]">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    it.color === 'maroon'
                                      ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                      : 'bg-blue-100 text-blue-900 border border-blue-200'
                                  }`}
                                >
                                  {it.color === 'maroon' ? 'Maroon' : 'Putih'}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {it.quantity}x {it.genderCut === 'ladies' ? 'Ladies' : 'Men'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.genderCut === 'ladies'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {order.genderCut === 'ladies' ? 'Ladies' : 'Reguler'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {order.items && order.items.length > 0
                          ? order.items.map((it) => `${it.size} (${it.quantity})`).join(', ')
                          : order.size}
                      </td>
                      <td className="py-3 px-3">
                        {order.items && order.items.length > 0 ? (
                          <span className="text-[11px] text-slate-600">
                            {order.items
                              .map((it) => (it.sleeve === 'panjang' ? 'Pjg' : 'Pdk'))
                              .join(', ')}
                          </span>
                        ) : (
                          <span className="capitalize text-slate-600">
                            {order.sleeve === 'panjang' ? 'Panjang (+10rb)' : 'Pendek'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatRupiah(order.totalPrice)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Lunas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Menunggu</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveModalOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs"
                          >
                            Kelola
                          </button>
                          <Link
                            href={`/invoice/${order.id}`}
                            target="_blank"
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                            title="Buka Invoice PDF"
                          >
                            PDF
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop-up Modal untuk Admin (dengan hak akses manual lunas) */}
      {activeModalOrder && (
        <QrisPaymentModal
          order={activeModalOrder}
          isOpen={!!activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onPaymentSuccess={(updated) => {
            fetchOrders();
            setActiveModalOrder(updated);
          }}
          isAdmin={true}
        />
      )}
    </div>
  );
}
