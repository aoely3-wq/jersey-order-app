'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
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
  Download,
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
  const [dokuVaUrl, setDokuVaUrl] = useState<string | null>(null);
  const [isLoadingDoku, setIsLoadingDoku] = useState(false);
  const [dokuError, setDokuError] = useState<string | null>(null);
  const [dokuQrisString, setDokuQrisString] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qris' | 'va'>('qris');
  const [qrMode, setQrMode] = useState<'dynamic' | 'poster'>('dynamic');
  const [downloading, setDownloading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  const checkPaymentStatusNow = async () => {
    if (currentOrder.status === 'PAID') return;
    setIsCheckingStatus(true);
    setCheckFeedback(null);
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/check`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && (data.isPaid || data.data?.status === 'PAID')) {
        setCurrentOrder(data.data);
        onPaymentSuccess(data.data);
      } else {
        setCheckFeedback('Menunggu pelunasan di m-Banking. Sistem akan otomatis mengonfirmasi saat pembayaran diterima.');
        setTimeout(() => setCheckFeedback(null), 5000);
      }
    } catch (err) {
      console.error('Check status error:', err);
      setCheckFeedback('Gagal memeriksa status. Sistem tetap mengecek otomatis di background.');
      setTimeout(() => setCheckFeedback(null), 5000);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleDownloadQR = async (format: 'png' | 'jpeg' = 'png') => {
    try {
      setDownloading(true);
      // Ambil elemen canvas QR dinamis langsung
      const sourceCanvas = document.getElementById('dynamic-qris-canvas') as HTMLCanvasElement;
      if (!sourceCanvas) {
        console.error('Canvas dynamic-qris-canvas tidak ditemukan');
        setDownloading(false);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 840;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setDownloading(false);
        return;
      }

      // Background putih bersih
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Merah QRIS Resmi Bank Indonesia
      ctx.fillStyle = '#ED1C24';
      ctx.fillRect(0, 0, canvas.width, 76);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('QRIS - PEMBAYARAN NASIONAL (GPN)', canvas.width / 2, 48);

      // Merchant Name DOKU
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(QRIS_MERCHANT_NAME, canvas.width / 2, 120);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(`NMID: ${QRIS_NMID} • Acquirer: DOKU`, canvas.width / 2, 148);

      // Gambar QR Code Canvas langsung di tengah (400x400)
      ctx.drawImage(sourceCanvas, 120, 170, 400, 400);

      // Box Info Tagihan
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(40, 590, 560, 210);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 590, 560, 210);

      ctx.fillStyle = '#64748b';
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`No. Pesanan: ${currentOrder.id}`, canvas.width / 2, 626);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        `Pemesan: ${currentOrder.name} (${currentOrder.division || 'Bagian Umum'})`,
        canvas.width / 2,
        656
      );

      ctx.fillStyle = '#002B5B';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formatRupiah(currentOrder.totalPrice), canvas.width / 2, 706);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✓ Nominal Otomatis Terkunci Pas (DOKU Gateway)', canvas.width / 2, 742);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Scan via BCA, Mandiri Livin, BRImo, BNI, BSI, GoPay, OVO, DANA, ShopeePay', canvas.width / 2, 774);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `QRIS-Jersey-${currentOrder.id}.${ext}`;

      // 1. Mobile Native Share Sheet (Simpan langsung ke Photos iPhone / Galeri Android)
      if (typeof navigator !== 'undefined' && navigator.canShare && typeof window.File !== 'undefined') {
        try {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, mimeType, 0.95)
          );
          if (blob) {
            const file = new File([blob], filename, { type: mimeType });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `QRIS Jersey ${currentOrder.id}`,
              });
              setDownloading(false);
              return;
            }
          }
        } catch (shareErr) {
          // User membatalkan share sheet -> lanjutkan ke fallback download biasa
          console.log('Native share dismissed or not allowed:', shareErr);
        }
      }

      // 2. Direct Blob Download (Standar Desktop & Mobile Browser)
      if (canvas.toBlob) {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              }, 2000);
            } else {
              const dataUrl = canvas.toDataURL(mimeType, 0.95);
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
            setDownloading(false);
          },
          mimeType,
          0.95
        );
      } else {
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
      }
    } catch (err) {
      console.error('Download QR failed:', err);
      setDownloading(false);
    }
  };

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Muat URL pembayaran DOKU Checkout (langsung membuka QRIS dinamis secara default)
  const loadDokuPayment = async (method: 'qris' | 'va' = 'qris') => {
    if (currentOrder.status === 'PAID') return;
    setIsLoadingDoku(true);
    setDokuError(null);
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/doku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (data.success && (data.data?.payment_url || data.data?.redirect_url)) {
        const url = data.data.payment_url || data.data.redirect_url;
        if (method === 'qris') {
          setDokuUrl(url);
          if (data.data?.qr_code) {
            setDokuQrisString(data.data.qr_code);
          }
        } else {
          setDokuVaUrl(url);
        }
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
      loadDokuPayment('qris');
    }
  }, [isOpen, currentOrder.id, currentOrder.status]);

  // Ketika tab berpindah ke VA, muat link VA jika belum ada
  const handleTabChange = (tab: 'qris' | 'va') => {
    setActiveTab(tab);
    if (tab === 'va' && !dokuVaUrl) {
      loadDokuPayment('va');
    }
  };

  // Polling otomatis setiap 3 detik untuk update status real-time saat dibayar oleh pembeli
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
    }, 3000);

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
  const dynamicQrisPayload =
    dokuQrisString || generateDynamicQris(currentOrder.totalPrice, currentOrder.id);
  const waUserUrl = getWhatsAppDirectLink(currentOrder);
  const waAdminUrl = getAdminWhatsAppConfirmationLink(currentOrder);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transition-all my-4">
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
            <div className="space-y-3 mb-4 animate-in fade-in zoom-in-95 duration-300">
              {/* ✅ Banner Pembayaran Berhasil */}
              <div className="text-center py-5 px-4 rounded-2xl bg-gradient-to-b from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
                <div className="relative mx-auto w-14 h-14 mb-3">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-lg animate-bounce">✅</span>
                </div>
                <h4 className="text-lg font-black text-emerald-800 tracking-tight">PEMBAYARAN DITERIMA!</h4>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Transaksi telah terverifikasi &amp; tercatat otomatis
                </p>
              </div>

              {/* 📲 Notifikasi WA + PDF */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm tracking-tight">Invoice PDF dikirim ke WhatsApp Anda!</p>
                    <p className="text-[11px] text-green-100 leading-relaxed mt-1">
                      Dokumen bukti pembayaran resmi (PDF) telah dikirimkan ke nomor WhatsApp yang terdaftar:
                    </p>
                    <p className="font-mono text-sm font-black text-amber-300 mt-1.5 tracking-wide">
                      {currentOrder.phone}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="text-[11px] text-green-50 leading-tight">
                        Buka WhatsApp → Cek pesan dari sistem → Tap file untuk membuka PDF invoice Anda
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info tambahan: belum terima? */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Belum menerima PDF di WA?</span> Invoice juga tersedia di bawah — klik tombol
                  &quot;Download Bukti Bayar PDF&quot; untuk mengunduh langsung.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-amber-800">Menunggu Pembayaran</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={checkPaymentStatusNow}
                    disabled={isCheckingStatus}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-[11px] font-bold text-amber-900 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin text-blue-900' : 'text-amber-700'}`} />
                    <span>{isCheckingStatus ? 'Mengecek...' : 'Cek Status'}</span>
                  </button>
                  <div className="flex items-center gap-1 text-xs font-mono font-medium text-amber-700">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                </div>
              </div>

              {checkFeedback && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin shrink-0" />
                  <span className="font-medium text-[11px] leading-tight">{checkFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB SWITCHER: QRIS DOKU RESMI VS VIRTUAL ACCOUNT DOKU */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-4 gap-1">
              <button
                type="button"
                onClick={() => handleTabChange('qris')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'qris'
                    ? 'bg-[#002B5B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate">QRIS DOKU Resmi</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('va')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'va'
                    ? 'bg-[#002B5B] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">VA Bank &amp; E-Wallet</span>
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: QRIS DINAMIS DOKU RESMI (LANGSUNG TAMPIL DI DEPAN)     */}
          {/* ============================================================== */}
          {!isPaid && activeTab === 'qris' && (
            <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-md bg-white mb-4 animate-in fade-in duration-200">
              {/* Header Bar QRIS Resmi Bank Indonesia */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-5 py-3 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-black tracking-widest text-lg font-sans">QRIS</span>
                  <div className="h-4 w-[1px] bg-white/30" />
                  <span className="text-[11px] tracking-tight bg-white/20 px-2 py-0.5 rounded font-medium">
                    Pembayaran Nasional (GPN)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-black text-amber-200">
                    {formatRupiah(currentOrder.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Sub-info Merchant DOKU & Pesanan */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">{QRIS_MERCHANT_NAME}</span>
                  <span className="text-[10px] text-slate-500 font-mono">NMID: {QRIS_NMID} &bull; Acquirer: DOKU</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] text-slate-500 block">No. Pesanan:</span>
                  <span className="font-mono text-blue-900 font-bold">{currentOrder.id}</span>
                </div>
              </div>

              {/* TAMPILAN UTAMA: BARCODE QRIS DINAMIS LANGSUNG DI DEPAN */}
              <div className="p-5 flex flex-col items-center justify-center bg-white">
                <div className="relative p-4 bg-white border-2 border-slate-200 rounded-3xl shadow-inner flex flex-col items-center">
                  <QRCodeCanvas
                    id="dynamic-qris-canvas"
                    value={dynamicQrisPayload}
                    size={240}
                    level="M"
                    includeMargin={false}
                    style={{ width: '220px', height: '220px' }}
                  />
                  <div className="mt-2 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider text-center">
                    SCAN DENGAN APLIKASI PEMBAYARAN APAPUN
                  </div>
                </div>

                {/* Box Nominal Terkunci */}
                <div className="mt-3.5 text-center w-full max-w-sm">
                  <span className="text-[11px] text-slate-500 font-medium block">Total Nominal Transfer:</span>
                  <p className="text-2xl sm:text-3xl font-black text-[#002B5B] tracking-tight">
                    {formatRupiah(currentOrder.totalPrice)}
                  </p>
                  <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Nominal Otomatis Terkunci Pas (DOKU Gateway)</span>
                  </div>
                </div>

                {/* Aksi Barcode: Download Gambar QRIS untuk bayar dari Galeri HP */}
                <div className="w-full space-y-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadQR('png')}
                      disabled={downloading}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-900" />
                      <span>{downloading ? 'Memproses...' : 'Unduh QR (PNG)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadQR('jpeg')}
                      disabled={downloading}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-800" />
                      <span>{downloading ? 'Memproses...' : 'Unduh QR (JPG)'}</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    💡 <b>Pengguna HP:</b> Klik tombol unduh di atas untuk menyimpan barcode ke galeri foto, lalu buka m-Banking dan pilih &quot;Upload QR / Scan dari Galeri&quot;.
                  </p>
                </div>

                {/* Petunjuk Singkat Pembayaran */}
                <p className="text-[11px] text-slate-500 text-center mt-3 leading-relaxed">
                  Buka aplikasi <b>BCA, Livin Mandiri, BRImo, BNI, BSI, GoPay, OVO, ShopeePay, DANA</b> atau m-Banking lainnya. Scan barcode di atas atau upload hasil unduhan gambar QRIS.
                </p>

                {/* Indikator Status Auto-Konfirmasi Real-time */}
                <div className="w-full mt-4 pt-3 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Auto-Konfirmasi Aktif • Real-time DOKU Gateway</span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                    Setelah pembayaran berhasil di m-Banking Anda, sistem otomatis mengonfirmasi status menjadi <b>Lunas</b> serta bukti faktur PDF resmi langsung terbit dan dikirim ke WhatsApp Anda.
                  </p>
                </div>
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
                ) : (dokuVaUrl || dokuUrl) ? (
                  <a
                    href={dokuVaUrl || dokuUrl || '#'}
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
                        onClick={() => loadDokuPayment('va')}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Coba Muat Ulang Virtual Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTabChange('qris')}
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

              {/* Tombol Download & Cetak PDF Bukti Pembayaran */}
              <a
                href={`/api/invoice/${currentOrder.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#002B5B] via-[#003875] to-[#001D3D] hover:from-[#001D3D] hover:to-[#002B5B] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-950/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Download className="w-4 h-4 text-[#D4AF37]" />
                <span>Download Bukti Bayar PDF Resmi</span>
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
                    Tandai pesanan ini lunas secara manual jika pemesan membayar tunai langsung:
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
