'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Printer,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Shirt,
  ShieldCheck,
  Building2,
  Calendar,
  Phone,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Order, formatRupiah } from '@/lib/types';
import { getWhatsAppDirectLink } from '@/lib/whatsapp';

function InvoiceContent() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setOrder(data.data);
        } else {
          setError(data.message || 'Pesanan tidak ditemukan.');
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data invoice.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Memuat Bukti Pembayaran Resmi...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invoice Tidak Ditemukan</h2>
          <p className="text-xs text-slate-600">{error || 'Nomor order tidak terdaftar dalam sistem.'}</p>
          <div className="pt-2">
            <Link
              href="/status"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Status</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';
  const waUrl = getWhatsAppDirectLink(order);

  const formattedDate = new Date(order.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedPaidTime = order.paidAt
    ? new Date(order.paidAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Normalisasi items
  const items =
    order.items && order.items.length > 0
      ? order.items
      : [
          {
            id: 'item-1',
            color: order.color || 'putih',
            genderCut: order.genderCut || 'men',
            size: order.size || 'L',
            sleeve: order.sleeve || 'pendek',
            quantity: 1,
            basePrice: order.basePrice || 130000,
            sleeveExtra: order.sleeveExtra || 0,
            sizeExtra: order.sizeExtra || 0,
            unitPrice: order.totalPrice,
            subtotal: order.totalPrice,
          },
        ];

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-100/80 py-6 sm:py-10 px-3 sm:px-6">
      {/* Top Floating Action Bar (Hidden on Print) */}
      <div className="max-w-3xl mx-auto mb-6 print:hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/status"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Monitor Status</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan ke WA</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black transition-all shadow-md shadow-blue-950/20 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Cetak / Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* INVOICE PAPER (A4 Document Layout) */}
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0">
        {/* Document Header & Kop Instansi */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white border-b-4 border-amber-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Kementerian Keuangan Republik Indonesia
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                KANWIL DJPb PROVINSI BANGKA BELITUNG
              </h1>
              <p className="text-xs text-blue-200 mt-0.5">
                Indonesian Treasury (InTress) &bull; Panitia Pengadaan Jersey Kantor 2026
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200 block">
                BUKTI PEMBAYARAN RESMI
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
                {order.id}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Status & Timestamp Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Status Pembayaran:
              </span>
              {isPaid ? (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs mt-1 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LUNAS / VERIFIED</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs mt-1 border border-amber-300">
                  <span>MENUNGGU PEMBAYARAN</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tanggal Pemesanan:
              </span>
              <p className="font-semibold text-slate-800 mt-1">{formattedDate}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Waktu Pelunasan:
              </span>
              <p className="font-semibold text-slate-800 mt-1">
                {formattedPaidTime || 'Menunggu Verifikasi'}
              </p>
            </div>
          </div>

          {/* Customer / Employee Information */}
          <div className="border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-900" />
              <span>Data Pegawai / Pemesan:</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Nama Lengkap</span>
                <span className="font-bold text-slate-900 text-sm">{order.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Bidang / Bagian</span>
                <span className="font-semibold text-blue-900 text-sm">
                  {order.division || 'Bagian Umum'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Nomor WhatsApp</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">
                  {order.phone}
                </span>
              </div>
            </div>
            {order.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 text-[11px] block">Catatan Khusus:</span>
                <p className="text-slate-700 italic font-medium">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-blue-900" />
              <span>Rincian Item Jersey Dipesan:</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3">Varian &amp; Deskripsi Jersey</th>
                    <th className="py-3 px-3 text-center">Ukuran</th>
                    <th className="py-3 px-3 text-center">Lengan</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Harga Satuan</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const isMaroon = item.color === 'maroon';
                    const isLong = item.sleeve === 'panjang';
                    return (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            Jersey Cual DJPb Babel
                          </div>
                          <div className="text-[11px] font-semibold flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isMaroon
                                  ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {isMaroon ? 'Merah Maroon' : 'Putih (Biru Kemenkeu)'}
                            </span>
                            <span className="text-slate-500">
                              ({item.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'})
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {item.size}
                          {item.sizeExtra > 0 && (
                            <span className="block text-[9px] text-amber-700 font-semibold">
                              (+{formatRupiah(item.sizeExtra)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-slate-700 font-medium">
                            {isLong ? 'Panjang' : 'Pendek'}
                          </span>
                          {item.sleeveExtra > 0 && (
                            <span className="block text-[9px] text-blue-700 font-semibold">
                              (+{formatRupiah(item.sleeveExtra)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right uppercase text-[11px] text-slate-600">
                      Total Jumlah ({totalQuantity} pcs) :
                    </td>
                    <td className="py-3 px-3 text-center font-black text-blue-950">
                      {totalQuantity}
                    </td>
                    <td className="py-3 px-3 text-right uppercase text-[11px] text-slate-600">
                      Total Bayar:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-blue-950 text-sm">
                      {formatRupiah(order.totalPrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Method & Guarantee Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-1.5">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                Metode Pembayaran
              </span>
              <p className="font-extrabold text-blue-950">
                QRIS DANA Bisnis / DOKU Virtual Account Bank
              </p>
              <p className="text-[11px] text-slate-600">
                Acquirer: Bank Indonesia GPN &bull; Merchant: Aulia Nawasena, Pakaian &bull; NMID: ID1026635931953
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status Rekap Vendor:
                </span>
                <p className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tersinkronisasi ke Google Sheets</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Faktur resmi sah diterbitkan oleh sistem digital panitia.
                </p>
              </div>

              {/* Digital Stamp Indicator */}
              {isPaid && (
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-emerald-600 text-emerald-700 flex flex-col items-center justify-center -rotate-12 select-none pointer-events-none opacity-90 p-1">
                  <span className="text-[9px] font-black uppercase tracking-tight">DJPB BABEL</span>
                  <span className="text-xs font-black tracking-widest text-emerald-800">LUNAS</span>
                  <span className="text-[8px] font-bold">2026</span>
                </div>
              )}
            </div>
          </div>

          {/* Official Signoff Footer */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">Panitia Pengadaan Jersey Cual 2026</p>
              <p className="text-[11px]">Kanwil Ditjen Perbendaharaan Provinsi Kepulauan Bangka Belitung</p>
              <p className="text-[10px] mt-1 text-slate-400">
                Dokumen ini merupakan bukti sah transaksi digital dan dapat disimpan sebagai arsip pribadi.
              </p>
            </div>
            <div className="sm:text-right font-mono text-[10px] text-slate-400">
              Generated: {new Date().toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Memuat Bukti Pembayaran Resmi...</p>
          </div>
        </div>
      }
    >
      <InvoiceContent />
    </Suspense>
  );
}

