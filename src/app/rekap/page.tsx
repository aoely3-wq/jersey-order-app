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
  QrCode,
  DollarSign,
  PlusCircle,
  MessageCircle,
  ExternalLink,
  Filter,
  Building2,
} from 'lucide-react';
import { Order, JerseySize, DIVISIONS, formatRupiah } from '@/lib/types';
import { getWhatsAppDirectLink } from '@/lib/whatsapp';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function RekapPage() {
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
    fetchOrders();
    fetch('/api/sheets/sync')
      .then((r) => r.json())
      .then((d) => setSheetConfigured(Boolean(d.configured)))
      .catch(() => {});
  }, []);

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
    const allSizes: JerseySize[] = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

    type MatrixRow = Record<JerseySize, number>;
    const initRow = (): MatrixRow => ({
      S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0, XS: 0, '4XL': 0
    });

    const menPendek = initRow();
    const menPanjang = initRow();
    const ladiesPendek = initRow();
    const ladiesPanjang = initRow();

    orders.forEach((o) => {
      const isLadies = o.genderCut === 'ladies';
      const isPanjang = o.sleeve === 'panjang';
      const sizeKey = ((o.size as string) === '3XL' ? 'XXXL' : o.size) as JerseySize;

      if (isLadies) {
        if (isPanjang) ladiesPanjang[sizeKey] = (ladiesPanjang[sizeKey] || 0) + 1;
        else ladiesPendek[sizeKey] = (ladiesPendek[sizeKey] || 0) + 1;
      } else {
        if (isPanjang) menPanjang[sizeKey] = (menPanjang[sizeKey] || 0) + 1;
        else menPendek[sizeKey] = (menPendek[sizeKey] || 0) + 1;
      }
    });

    const totalPerSize: Record<JerseySize, number> = {
      S: (menPendek.S || 0) + (menPanjang.S || 0) + (ladiesPendek.S || 0) + (ladiesPanjang.S || 0),
      M: (menPendek.M || 0) + (menPanjang.M || 0) + (ladiesPendek.M || 0) + (ladiesPanjang.M || 0),
      L: (menPendek.L || 0) + (menPanjang.L || 0) + (ladiesPendek.L || 0) + (ladiesPanjang.L || 0),
      XL: (menPendek.XL || 0) + (menPanjang.XL || 0) + (ladiesPendek.XL || 0) + (ladiesPanjang.XL || 0),
      XXL: (menPendek.XXL || 0) + (menPanjang.XXL || 0) + (ladiesPendek.XXL || 0) + (ladiesPanjang.XXL || 0),
      XXXL: (menPendek.XXXL || 0) + (menPanjang.XXXL || 0) + (ladiesPendek.XXXL || 0) + (ladiesPanjang.XXXL || 0),
      XS: 0,
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
  - S: ${sizeMatrix.menPendek.S} | M: ${sizeMatrix.menPendek.M} | L: ${sizeMatrix.menPendek.L} | XL: ${sizeMatrix.menPendek.XL} | 2XL: ${sizeMatrix.menPendek.XXL} | 3XL: ${sizeMatrix.menPendek.XXXL}
• Lengan Panjang: ${sizeMatrix.totalMenPanjang} pcs
  - S: ${sizeMatrix.menPanjang.S} | M: ${sizeMatrix.menPanjang.M} | L: ${sizeMatrix.menPanjang.L} | XL: ${sizeMatrix.menPanjang.XL} | 2XL: ${sizeMatrix.menPanjang.XXL} | 3XL: ${sizeMatrix.menPanjang.XXXL}

*2. SIZE LADIES*
• Lengan Pendek: ${sizeMatrix.totalLadiesPendek} pcs
  - S: ${sizeMatrix.ladiesPendek.S} | M: ${sizeMatrix.ladiesPendek.M} | L: ${sizeMatrix.ladiesPendek.L} | XL: ${sizeMatrix.ladiesPendek.XL} | 2XL: ${sizeMatrix.ladiesPendek.XXL} | 3XL: ${sizeMatrix.ladiesPendek.XXXL}
• Lengan Panjang: ${sizeMatrix.totalLadiesPanjang} pcs
  - S: ${sizeMatrix.ladiesPanjang.S} | M: ${sizeMatrix.ladiesPanjang.M} | L: ${sizeMatrix.ladiesPanjang.L} | XL: ${sizeMatrix.ladiesPanjang.XL} | 2XL: ${sizeMatrix.ladiesPanjang.XXL} | 3XL: ${sizeMatrix.ladiesPanjang.XXXL}

*TOTAL PER UKURAN:*
S: ${sizeMatrix.totalPerSize.S} | M: ${sizeMatrix.totalPerSize.M} | L: ${sizeMatrix.totalPerSize.L} | XL: ${sizeMatrix.totalPerSize.XL} | 2XL: ${sizeMatrix.totalPerSize.XXL} | 3XL: ${sizeMatrix.totalPerSize.XXXL}
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

  // Toggle order status
  const handleToggleStatus = async (order: Order) => {
    const nextStatus = order.status === 'PAID' ? 'PENDING' : 'PAID';
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? data.data : o)));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete order
  const handleDeleteOrder = async (id: string, name: string) => {
    if (!confirm(`Hapus pesanan atas nama "${name}"? Data di database akan ikut terhapus.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 tracking-tight">
              Rekapitulasi Pesanan &bull; Aulia NAWASENA
            </h1>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
              Admin / Panitia
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Pantau status pembayaran per bidang/bagian Kanwil DJPb Babel, dan rekap otomatis ukuran untuk vendor konveksi.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {sheetConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Database: Google Sheets (Online &amp; Terkoneksi)
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
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-full font-semibold transition-colors disabled:opacity-50"
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
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition-colors"
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
          <div className="text-xs text-slate-500 mt-1">Terkonfirmasi via QRIS / Virtual Account</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Bayar</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.pendingCount} Orang</div>
          <div className="text-xs text-slate-500 mt-1">
            Belum menyelesaikan transaksi
          </div>
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
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
            >
              {copiedVendor ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedVendor ? 'Tersalin!' : 'Salin Rekap Teks WA'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl text-xs transition-colors"
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
                <td className="py-3 px-4 text-center font-black text-slate-900 bg-blue-100 text-blue-900">
                  {sizeMatrix.grandTotal} pcs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* FILTER & DATA TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, bidang, WA, atau order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Bidang / Bagian */}
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Bidang ({orders.length})</option>
                {DIVISIONS.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Model Potongan */}
            <select
              value={cutFilter}
              onChange={(e) => setCutFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Model</option>
              <option value="men">Reguler Men</option>
              <option value="ladies">Ladies</option>
            </select>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'PAID'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Lunas ({metrics.paidCount})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Belum ({metrics.pendingCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Nama &amp; Bidang / Bagian</th>
                <th className="py-3 px-3">Model &amp; Ukuran</th>
                <th className="py-3 px-3">Total Biaya</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi &amp; Notifikasi WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada pesanan yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPaid = order.status === 'PAID';
                  const waUrl = getWhatsAppDirectLink(order);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nama & Bidang */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{order.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
                            {order.division || 'Bagian Umum'}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-xs text-slate-500 font-mono">{order.phone}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-[10px] text-slate-400 font-mono">{order.id}</span>
                        </div>
                        {order.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-1">
                            Catatan: {order.notes}
                          </div>
                        )}
                      </td>

                      {/* Model & Ukuran */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {order.genderCut === 'ladies' ? (
                            <span className="text-rose-700 font-bold">Ladies</span>
                          ) : (
                            <span className="text-blue-950 font-bold">Reguler Men</span>
                          )}{' '}
                          &bull; <b>{order.size}</b>
                        </div>
                        <div className="text-xs text-slate-500 capitalize mt-0.5">
                          Lengan {order.sleeve === 'panjang' ? 'Panjang' : 'Pendek'}
                        </div>
                      </td>

                      {/* Total Biaya */}
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {formatRupiah(order.totalPrice)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lunas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Menunggu</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Direct Chat Button */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Kirim Pesan Konfirmasi WA ke ${order.name}`}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors border border-emerald-200"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Kirim WA</span>
                          </a>

                          {/* Open QRIS Modal button if needed */}
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => setActiveModalOrder(order)}
                              title="Tampilkan QRIS"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}

                          {/* Manual Toggle Status (Lunas / Batal) */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(order)}
                            title={isPaid ? 'Ubah status ke Menunggu' : 'Tandai LUNAS (Uang Masuk)'}
                            className={`p-1.5 rounded-lg transition-colors border ${
                              isPaid
                                ? 'text-amber-600 hover:bg-amber-50 border-amber-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border-emerald-300 bg-emerald-50/50'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          {/* Delete Order Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id, order.name)}
                            title="Hapus Pesanan"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* MODAL QRIS JIKA ADMIN INGIN MENAMPILKAN ULANG */}
      {activeModalOrder && (
        <QrisPaymentModal
          order={activeModalOrder}
          isOpen={!!activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onPaymentSuccess={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setActiveModalOrder(updated);
          }}
        />
      )}
    </div>
  );
}
