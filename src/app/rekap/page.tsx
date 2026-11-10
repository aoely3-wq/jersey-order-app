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
} from 'lucide-react';
import { Order, JerseySize, formatRupiah } from '@/lib/types';
import { getWhatsAppDirectLink } from '@/lib/whatsapp';
import QrisPaymentModal from '@/components/QrisPaymentModal';

export default function RekapPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
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
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ? true : order.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

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

  // Rekap Matrix for Vendor Konveksi
  const sizeMatrix = useMemo(() => {
    const allSizes: JerseySize[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    const matrix: Record<'pendek' | 'panjang', Record<JerseySize, number>> = {
      pendek: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0, '4XL': 0 },
      panjang: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0, '4XL': 0 },
    };

    orders.forEach((o) => {
      if (matrix[o.sleeve] && matrix[o.sleeve][o.size] !== undefined) {
        matrix[o.sleeve][o.size]++;
      }
    });

    const totalPerSize: Record<JerseySize, number> = {
      S: matrix.pendek.S + matrix.panjang.S,
      M: matrix.pendek.M + matrix.panjang.M,
      L: matrix.pendek.L + matrix.panjang.L,
      XL: matrix.pendek.XL + matrix.panjang.XL,
      XXL: matrix.pendek.XXL + matrix.panjang.XXL,
      '3XL': matrix.pendek['3XL'] + matrix.panjang['3XL'],
      '4XL': matrix.pendek['4XL'] + matrix.panjang['4XL'],
    };

    const totalPendek = Object.values(matrix.pendek).reduce((a, b) => a + b, 0);
    const totalPanjang = Object.values(matrix.panjang).reduce((a, b) => a + b, 0);

    return {
      allSizes,
      matrix,
      totalPerSize,
      totalPendek,
      totalPanjang,
      grandTotal: totalPendek + totalPanjang,
    };
  }, [orders]);

  // Copy vendor summary to clipboard
  const handleCopyVendorSummary = () => {
    const text = `*REKAP PESANAN JERSEY KANTOR UNTUK VENDOR*
Total Keseluruhan: ${sizeMatrix.grandTotal} Pcs
(Lunas: ${metrics.paidCount} pcs | Menunggu: ${metrics.pendingCount} pcs)

👕 *LENGAN PENDEK (Total: ${sizeMatrix.totalPendek} Pcs):*
- S: ${sizeMatrix.matrix.pendek.S} pcs
- M: ${sizeMatrix.matrix.pendek.M} pcs
- L: ${sizeMatrix.matrix.pendek.L} pcs
- XL: ${sizeMatrix.matrix.pendek.XL} pcs
- XXL: ${sizeMatrix.matrix.pendek.XXL} pcs
- 3XL: ${sizeMatrix.matrix.pendek['3XL']} pcs
- 4XL: ${sizeMatrix.matrix.pendek['4XL']} pcs

👕 *LENGAN PANJANG (Total: ${sizeMatrix.totalPanjang} Pcs):*
- S: ${sizeMatrix.matrix.panjang.S} pcs
- M: ${sizeMatrix.matrix.panjang.M} pcs
- L: ${sizeMatrix.matrix.panjang.L} pcs
- XL: ${sizeMatrix.matrix.panjang.XL} pcs
- XXL: ${sizeMatrix.matrix.panjang.XXL} pcs
- 3XL: ${sizeMatrix.matrix.panjang['3XL']} pcs
- 4XL: ${sizeMatrix.matrix.panjang['4XL']} pcs

_Diperbarui pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}_`;

    navigator.clipboard.writeText(text);
    setCopiedVendor(true);
    setTimeout(() => setCopiedVendor(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID Pesanan', 'Nama', 'Nomor WA', 'Ukuran', 'Lengan', 'Total Harga', 'Status', 'Waktu Order', 'Catatan'];
    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${o.name}"`,
      `"'${o.phone}"`,
      `"${o.size}"`,
      `"${o.sleeve}"`,
      o.totalPrice,
      `"${o.status}"`,
      `"${new Date(o.createdAt).toLocaleString('id-ID')}"`,
      `"${o.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_jersey_kantor_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle order status (e.g. manually mark paid for cash)
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
    if (!confirm(`Hapus pesanan atas nama "${name}"?`)) return;
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
            Pantau status pembayaran pegawai Kanwil DJPb Kepulauan Bangka Belitung, kirim notifikasi WhatsApp, dan rekap otomatis ukuran untuk vendor konveksi.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {sheetConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Database: Google Sheets (Online & Terkoneksi)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Database: File Lokal JSON (Belum terhubung ke Google Sheets)
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
          <div className="text-xs text-slate-500 mt-1">Terkonfirmasi via QRIS / Tunai</div>
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
              Rincian jumlah potong per ukuran & jenis lengan untuk diserahkan ke pihak penjahit/vendor.
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
                <th className="py-3 px-4 rounded-l-xl">Tipe Lengan</th>
                {sizeMatrix.allSizes.map((s) => (
                  <th key={s} className="py-3 px-3 text-center">
                    {s}
                  </th>
                ))}
                <th className="py-3 px-4 text-center rounded-r-xl bg-blue-50 text-blue-900">
                  Subtotal Pcs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">Lengan Pendek (Rp 100k)</td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.matrix.pendek[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/50">
                  {sizeMatrix.totalPendek} pcs
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800">Lengan Panjang (Rp 120k)</td>
                {sizeMatrix.allSizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                    {sizeMatrix.matrix.panjang[s] || '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-center font-bold text-blue-700 bg-blue-50/50">
                  {sizeMatrix.totalPanjang} pcs
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold bg-slate-50/80">
                <td className="py-3 px-4 text-slate-900">Total Semua</td>
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

      {/* DETAIL PESANAN KAWAN KANTOR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, nomor WA, atau ID pesanan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Lunas ({metrics.paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Belum Bayar ({metrics.pendingCount})
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Nama & Kontak</th>
                <th className="py-3 px-3">Ukuran & Lengan</th>
                <th className="py-3 px-3">Total Biaya</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi & Notifikasi WA</th>
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
                      {/* Nama & Kontak */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                          <span>{order.phone}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-[11px] text-slate-400">{order.id}</span>
                        </div>
                        {order.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Catatan: {order.notes}
                          </div>
                        )}
                      </td>

                      {/* Ukuran & Lengan */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {order.size}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          Lengan {order.sleeve}
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

                          {/* Toggle status (Tandai Lunas / Belum) */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(order)}
                            title={isPaid ? 'Ubah jadi Menunggu' : 'Tandai Lunas (Cash/Transfer)'}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                              isPaid
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {isPaid ? 'Batal Lunas' : 'Tandai Lunas'}
                          </button>

                          {/* Delete order */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order.id, order.name)}
                            title="Hapus Pesanan"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* QRIS MODAL IF OPENED FROM REKAP */}
      {activeModalOrder && (
        <QrisPaymentModal
          order={activeModalOrder}
          isOpen={!!activeModalOrder}
          onClose={() => setActiveModalOrder(null)}
          onPaymentSuccess={(updated) => {
            setActiveModalOrder(updated);
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }}
        />
      )}
    </div>
  );
}
