'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  QrCode,
  X,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  Smartphone,
  Eye,
  Building2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Printer,
  FileText,
} from 'lucide-react';
import { Order, formatRupiah } from '@/lib/types';
import {
  generateDynamicQris,
  QRIS_MERCHANT_NAME,
  QRIS_NMID,
} from '@/lib/qris';
import {
  getWhatsAppDirectLink,
  getAdminWhatsAppConfirmationLink,
} from '@/lib/whatsapp';

interface QrisPaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
  isAdmin?: boolean;
}

export default function QrisPaymentModal({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
  isAdmin = false,
}: QrisPaymentModalProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 menit
  const [errorMsg, setErrorMsg] = useState('');
  const [dokuUrl, setDokuUrl] = useState<string | null>(null);
  const [isLoadingDoku, setIsLoadingDoku] = useState(false);
  const [dokuError, setDokuError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qris' | 'va'>('qris');
  const [qrMode, setQrMode] = useState<'dynamic' | 'poster'>('dynamic');

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Muat URL pembayaran DOKU Checkout untuk Virtual Account Multi-Bank
  const loadDokuPayment = async () => {
    if (currentOrder.status === 'PAID') return;
    setIsLoadingDoku(true);
    setDokuError(null);
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/doku`, { method: 'POST' });
      const data = await res.json();
      if (data.success && (data.data?.payment_url || data.data?.redirect_url)) {
        setDokuUrl(data.data.payment_url || data.data.redirect_url);
        setDokuError(null);
      } else {
        setDokuError(data.message || 'Koneksi DOKU belum tersedia.');
      }
    } catch (err) {
      console.error('DOKU fetch error:', err);
      setDokuError('Terjadi gangguan jaringan saat menghubungkan ke DOKU.');
    } finally {
      setIsLoadingDoku(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentOrder.status !== 'PAID') {
      loadDokuPayment();
    }
  }, [isOpen, currentOrder.id, currentOrder.status]);

  // Polling otomatis setiap 4 detik untuk update status real-time saat dibayar oleh pembeli
  useEffect(() => {
    if (!isOpen || currentOrder.status === 'PAID') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${currentOrder.id}`);
        const data = await res.json();
        if (data.success && data.data?.status === 'PAID') {
          setCurrentOrder(data.data);
          onPaymentSuccess(data.data);
        }
      } catch {
        // silent catch
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, currentOrder.id, currentOrder.status, onPaymentSuccess]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || currentOrder.status === 'PAID') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentOrder.status]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Khusus mode Admin jika admin ingin menandai lunas secara manual
  const handleAdminMarkPaid = async () => {
    setIsSimulating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/pay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentOrder(data.data);
        onPaymentSuccess(data.data);
      } else {
        setErrorMsg(data.message || 'Gagal memproses verifikasi');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Koneksi terputus saat verifikasi');
    } finally {
      setIsSimulating(false);
    }
  };

  const copyInvoice = () => {
    const text = `Halo, saya sudah memesan jersey!\nNo Order: ${currentOrder.id}\nNama: ${currentOrder.name}\nBidang/Bagian: ${currentOrder.division || 'Bagian Umum'}\nModel: ${currentOrder.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'}\nUkuran: ${currentOrder.size}\nLengan: ${currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'}\nTotal: ${formatRupiah(currentOrder.totalPrice)}\nStatus: ${currentOrder.status === 'PAID' ? 'LUNAS' : 'Menunggu Bayar'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isPaid = currentOrder.status === 'PAID';
  const dynamicQrisPayload = generateDynamicQris(currentOrder.totalPrice);
  const waUserUrl = getWhatsAppDirectLink(currentOrder);
  const waAdminUrl = getAdminWhatsAppConfirmationLink(currentOrder);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transition-all my-4">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm sm:text-base leading-tight">
                {isPaid ? 'Bukti Pembayaran Lunas' : 'Pembayaran Resmi DOKU'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">{QRIS_MERCHANT_NAME}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          {/* Status Header */}
          {isPaid ? (
            <div className="text-center py-4 px-4 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-emerald-800">PEMBAYARAN LUNAS</h4>
              <p className="text-xs text-emerald-600 mt-0.5">
                Pesanan Anda telah tercatat otomatis di Google Sheets rekapitulasi vendor!
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2 mb-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs font-semibold text-amber-800">Menunggu Pembayaran</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB SWITCHER: QRIS RESMI DOKU VS VIRTUAL ACCOUNT DOKU */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('qris')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'qris'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QRIS DOKU (Scan)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('va')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'va'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Virtual Account (VA)</span>
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: QRIS RESMI DOKU (JERSEY KANWIL DJPB BABEL) */}
          {/* ============================================================== */}
          {!isPaid && activeTab === 'qris' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-4 animate-in fade-in duration-200">
              {/* Top Banner QRIS */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-2 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-widest text-lg font-sans">QRIS</span>
                  <span className="text-[10px] tracking-tight bg-white/20 px-2 py-0.5 rounded font-medium">
                    DOKU Merchant
                  </span>
                </div>
                <div className="text-[10px] tracking-tight font-semibold bg-red-950/40 px-2 py-0.5 rounded text-white border border-white/20">
                  GPN &bull; Bank Indonesia
                </div>
              </div>

              {/* Merchant Details */}
              <div className="px-4 pt-2.5 pb-2 text-center border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs uppercase font-black tracking-wider text-blue-950">
                  {QRIS_MERCHANT_NAME}
                </p>
                <p className="text-[11px] font-mono font-medium text-slate-500">
                  NMID: {QRIS_NMID} &bull; A01
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  {currentOrder.division || 'Bagian Umum'} &bull;{' '}
                  {currentOrder.items && currentOrder.items.length > 0
                    ? `${currentOrder.totalQty || currentOrder.items.length} pcs Jersey (${currentOrder.items.length} Varian)`
                    : `${currentOrder.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'} • Size ${currentOrder.size} (${currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'})`}
                </p>
              </div>

              {/* Mode Tampilan Switcher (Dinamis Otomatis vs Poster Asli) */}
              <div className="flex items-center justify-center p-1.5 bg-slate-100/80 border-b border-slate-100 gap-1">
                <button
                  type="button"
                  onClick={() => setQrMode('dynamic')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    qrMode === 'dynamic'
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ QR Otomatis (Nominal Pas)
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('poster')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    qrMode === 'poster'
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Poster Asli DOKU
                </button>
              </div>

              {/* QR Code Canvas */}
              <div className="p-4 flex flex-col items-center justify-center bg-white">
                {qrMode === 'dynamic' ? (
                  <>
                    <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-inner">
                      <QRCodeSVG
                        value={dynamicQrisPayload}
                        size={195}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="mt-2.5 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Nominal Terkunci Otomatis Saat Scan</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Total Nominal Transfer:</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {formatRupiah(currentOrder.totalPrice)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-52 h-72 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                      <Image
                        src="/qris-doku.png"
                        alt="Poster QRIS DOKU Jersey Kanwil DJPb Babel"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <a
                        href="/qris-doku.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Poster HD Ukuran Penuh &rarr;</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Instructions */}
              <div className="bg-slate-50 px-4 py-2.5 text-center border-t border-slate-100">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Scan via <b>BCA, Mandiri Livin&apos;, BRImo, BNI, GoPay, OVO, ShopeePay, DANA, LinkAja</b> &amp; semua aplikasi m-Banking berlogo QRIS. Pembayaran otomatis terverifikasi <b>LUNAS</b> begitu selesai!
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: VIRTUAL ACCOUNT (VA) MULTI-BANK VIA DOKU */}
          {/* ============================================================== */}
          {!isPaid && activeTab === 'va' && (
            <div className="border border-blue-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-4 animate-in fade-in duration-200">
              {/* Header VA */}
              <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-300" />
                    Virtual Account (VA) Bank
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                    DOKU Gateway Resmi
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/90 mt-1">
                  Pilih bank Anda untuk mendapatkan nomor Virtual Account khusus pesanan ini.
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Daftar Bank yang Didukung */}
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Bank yang Didukung:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-xs font-bold text-slate-800">BCA VA</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-slate-800">Mandiri VA</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-800" />
                      <span className="text-xs font-bold text-slate-800">BRI (BRIVA)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-600" />
                      <span className="text-xs font-bold text-slate-800">BNI VA</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">BSI VA</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <span className="text-xs font-bold text-slate-800">Permata &amp; CIMB</span>
                    </div>
                  </div>
                </div>

                {/* Total Bayar Box */}
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Total Tagihan Jersey
                    </span>
                    <p className="text-xs text-slate-600 font-medium">
                      {currentOrder.items && currentOrder.items.length > 0
                        ? `${currentOrder.totalQty || currentOrder.items.length} Pcs Jersey`
                        : `${currentOrder.size} • Lengan ${currentOrder.sleeve === 'panjang' ? 'Panjang' : 'Pendek'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-blue-950">
                      {formatRupiah(currentOrder.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Tombol Buka DOKU Checkout VA */}
                {isLoadingDoku ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
                    <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                    <span className="font-semibold text-slate-700">Menyiapkan Virtual Account Bank via DOKU...</span>
                  </div>
                ) : dokuUrl ? (
                  <a
                    href={dokuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md text-xs sm:text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span>Pilih Bank &amp; Bayar via Virtual Account &rarr;</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                  </a>
                ) : (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 leading-relaxed">
                        <p className="font-bold">
                          {dokuError ? dokuError : 'Koneksi Virtual Account DOKU belum aktif.'}
                        </p>
                        {dokuError?.includes('belum dikonfigurasi') && (
                          <p className="text-[11px] text-amber-800 mt-1">
                            Environment Variables DOKU (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono text-[10px]">DOKU_CLIENT_ID</code> &amp; <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono text-[10px]">DOKU_SECRET_KEY</code>) perlu ditambahkan di Settings Vercel.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={loadDokuPayment}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Muat Ulang Virtual Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('qris')}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Bayar via QRIS DOKU (Bisa Semua Bank &amp; E-Wallet)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Petunjuk Penggunaan VA */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Cara Pembayaran via Virtual Account:</p>
                  <p>1. Klik tombol biru di atas untuk membuka gerbang DOKU.</p>
                  <p>2. Pilih bank Anda (misal BCA / Mandiri / BRI / BNI / BSI).</p>
                  <p>3. Salin nomor Virtual Account yang tampil dan bayar via m-Banking atau ATM.</p>
                  <p>4. Pembayaran langsung terverifikasi otomatis tanpa konfirmasi manual!</p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* DIGITAL RECEIPT CARD (Ketika LUNAS) */}
          {/* ============================================================== */}
          {isPaid && (
            <div className="space-y-4 mb-4">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">No. Pesanan</span>
                  <span className="font-mono font-bold text-slate-800">{currentOrder.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Nama Pemesan</span>
                  <span className="font-semibold text-slate-800">{currentOrder.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Bidang / Bagian</span>
                  <span className="font-semibold text-blue-900">{currentOrder.division || 'Bagian Umum'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Nomor WhatsApp</span>
                  <span className="font-mono text-slate-800">{currentOrder.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Rincian Item</span>
                  <div className="font-medium text-slate-800 text-right text-xs">
                    {currentOrder.items && currentOrder.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {currentOrder.items.map((it, idx) => (
                          <div key={idx}>
                            {it.quantity}x {it.color === 'maroon' ? 'Maroon' : 'Putih'} (
                            {it.genderCut === 'ladies' ? 'Ladies' : 'Men'} {it.size} -{' '}
                            {it.sleeve === 'panjang' ? 'Pjg' : 'Pdk'})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>
                        {currentOrder.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'} &bull; Size{' '}
                        {currentOrder.size} (
                        {currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Total Pembayaran</span>
                  <span className="font-bold text-blue-900 text-base">
                    {formatRupiah(currentOrder.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 text-xs">Waktu Lunas</span>
                  <span className="text-xs text-slate-600">
                    {currentOrder.paidAt ? new Date(currentOrder.paidAt).toLocaleTimeString('id-ID') : '-'}
                  </span>
                </div>
              </div>

              {/* Tombol Cetak PDF Bukti Pembayaran */}
              <a
                href={`/invoice/${currentOrder.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-950 to-blue-900 hover:from-blue-900 hover:to-indigo-950 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-950/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Buka &amp; Cetak Bukti Pembayaran PDF Resmi</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              {/* Kirim Nota ke Pemesan & Admin */}
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Simpan / Kirim Invoice ke WhatsApp
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={waUserUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Ke WA Pemesan</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                  <a
                    href={waAdminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 px-2.5 rounded-xl text-xs transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Ke WA Admin</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* KHUSUS MODE ADMIN (Hanya Muncul Jika Akses dari Panel Admin) */}
          {/* ============================================================== */}
          {isAdmin && !isPaid && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 mb-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Aksi Khusus Admin
                  </h5>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Tandai pesanan ini lunas secara manual jika pemesan membayar tunai langsung ke panitia:
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleAdminMarkPaid}
                disabled={isSimulating}
                className="mt-2.5 w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white font-bold py-2 px-4 rounded-xl shadow-xs transition-all text-xs cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Tandai Lunas Manual (Admin)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={copyInvoice}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Detail Pesanan'}</span>
            </button>

            {isPaid ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Selesai &amp; Tutup
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup Sementara
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
