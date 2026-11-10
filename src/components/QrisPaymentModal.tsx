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
  Sparkles,
  MessageCircle,
  ExternalLink,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Eye,
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
  ADMIN_PHONE,
} from '@/lib/whatsapp';

interface QrisPaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
}

export default function QrisPaymentModal({
  order,
  isOpen,
  onClose,
  onPaymentSuccess,
}: QrisPaymentModalProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 menit
  const [errorMsg, setErrorMsg] = useState('');
  const [dokuUrl, setDokuUrl] = useState<string | null>(null);
  const [isLoadingDoku, setIsLoadingDoku] = useState(false);
  const [qrMode, setQrMode] = useState<'dynamic' | 'poster'>('dynamic');

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Periksa apakah DOKU aktif (opsional sebagai metode alternatif)
  useEffect(() => {
    if (!isOpen || currentOrder.status === 'PAID') return;

    setIsLoadingDoku(true);
    fetch(`/api/orders/${currentOrder.id}/doku`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && (data.data?.payment_url || data.data?.redirect_url)) {
          setDokuUrl(data.data.payment_url || data.data.redirect_url);
        }
      })
      .catch((err) => console.log('DOKU optional fallback:', err))
      .finally(() => setIsLoadingDoku(false));
  }, [isOpen, currentOrder.id, currentOrder.status]);

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

  const handleSimulatePayment = async () => {
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
        setErrorMsg(data.message || 'Gagal memproses simulasi');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Koneksi terputus saat simulasi');
    } finally {
      setIsSimulating(false);
    }
  };

  const copyInvoice = () => {
    const text = `Halo, saya sudah memesan jersey!\nNo Order: ${currentOrder.id}\nNama: ${currentOrder.name}\nUkuran: ${currentOrder.size}\nLengan: ${currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'}\nTotal: ${formatRupiah(currentOrder.totalPrice)}\nStatus: ${currentOrder.status === 'PAID' ? 'LUNAS' : 'Menunggu Bayar'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyRekening = () => {
    navigator.clipboard.writeText('006301042474504');
    setCopiedRekening(true);
    setTimeout(() => setCopiedRekening(false), 2000);
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-950 text-sm sm:text-base leading-tight">
                {isPaid ? 'Bukti Pembayaran' : 'Pembayaran QRIS & Transfer'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Aulia NAWASENA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200/50 transition-colors"
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
                Pesanan Anda telah tercatat otomatis di sistem rekapitulasi vendor!
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2.5 mb-4 rounded-xl bg-amber-50 border border-amber-200">
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
          {/* QRIS CARD DANA BISNIS RESMI (HERO PAYMENT) */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-4">
              {/* Top Banner QRIS */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-2.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black tracking-widest text-lg font-sans">QRIS</span>
                  <span className="text-[10px] tracking-tight bg-white/20 px-2 py-0.5 rounded font-medium">
                    DANA Bisnis
                  </span>
                </div>
                <div className="text-[10px] tracking-tight font-semibold bg-red-950/40 px-2 py-0.5 rounded text-white border border-white/20">
                  GPN &bull; Bank Indonesia
                </div>
              </div>

              {/* Merchant Details */}
              <div className="px-4 pt-3 pb-2 text-center border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs uppercase font-black tracking-wider text-blue-950">
                  {QRIS_MERCHANT_NAME}
                </p>
                <p className="text-[11px] font-mono font-medium text-slate-500">
                  NMID: {QRIS_NMID} &bull; A01
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Jersey Cual DJPb Babel &bull; {currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'} (Size {currentOrder.size})
                </p>
              </div>

              {/* Mode Tampilan Switcher (Dinamis Otomatis vs Poster Asli) */}
              <div className="flex items-center justify-center p-1.5 bg-slate-100/80 border-b border-slate-100 gap-1">
                <button
                  type="button"
                  onClick={() => setQrMode('dynamic')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
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
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    qrMode === 'poster'
                      ? 'bg-white text-blue-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Poster Asli DANA
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
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Nominal Otomatis Terkunci Saat Scan</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Total Nominal Transfer:</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {formatRupiah(currentOrder.totalPrice)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-64 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                      <Image
                        src="/qris-dana.jpg"
                        alt="Poster QRIS DANA Bisnis"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <a
                        href="/qris-dana.jpg"
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
                  Scan via <b>BCA, Mandiri, BRImo, BNI, GoPay, OVO, ShopeePay, DANA</b> & semua aplikasi berlogo QRIS.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ALTERNATIF 1: TRANSFER REKENING BANK BRI */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="border border-blue-200 bg-blue-50/70 rounded-2xl p-3.5 mb-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-blue-950 text-xs tracking-wide">
                    TRANSFER BANK BRI (ALTERNATIF)
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-1.5 py-0.5 rounded">
                    Aktif
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyRekening}
                  className="flex items-center gap-1 font-bold text-blue-800 hover:text-blue-950 bg-white border border-blue-200 px-2 py-1 rounded-lg transition-all shadow-xs hover:scale-105 active:scale-95"
                >
                  {copiedRekening ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRekening ? 'Tersalin!' : 'Salin Rekening'}</span>
                </button>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between shadow-xs">
                <div>
                  <p className="font-mono font-black text-blue-950 text-sm sm:text-base tracking-wider">
                    0063 01 042474 504
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">a.n. AULIA RAHIM (BritAma)</p>
                </div>
                <div className="text-right border-l border-slate-100 pl-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Nominal</p>
                  <p className="font-extrabold text-blue-900 text-xs sm:text-sm">
                    {formatRupiah(currentOrder.totalPrice)}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                &bull; <b>Sesama BRI:</b> Gratis biaya admin via BRImo.<br />
                &bull; <b>Bank Lain (BCA, Mandiri, BNI, dll):</b> Pilih transfer via <b>BI-Fast</b> (biaya hanya Rp 2.500).
              </p>
            </div>
          )}

          {/* ============================================================== */}
          {/* ALTERNATIF 2: DOKU PAYMENT GATEWAY (Jika Aktif) */}
          {/* ============================================================== */}
          {!isPaid && dokuUrl && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-sm border border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  DOKU Checkout (Virtual Account / Gerai)
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                  Opsional
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mb-2">
                Ingin membayar lewat Virtual Account bank lain atau Alfamart/Indomaret?
              </p>
              <a
                href={dokuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors"
              >
                <span>Buka Pembayaran DOKU &rarr;</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          )}

          {/* ============================================================== */}
          {/* KONFIRMASI PEMBAYARAN KE ADMIN VIA WHATSAPP */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 mb-4">
              <div className="flex items-start gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Sudah Melakukan Pembayaran?
                  </h5>
                  <p className="text-[11px] text-emerald-800 leading-snug mt-0.5">
                    Kirim screenshot bukti transfer / struk QRIS langsung ke WhatsApp Admin (Aulia Rahim) agar pesanan Anda diverifikasi:
                  </p>
                </div>
              </div>

              <a
                href={waAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all text-xs hover:scale-[1.01]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Bukti Bayar ke WA Admin ({ADMIN_PHONE})</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </a>
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
                  <span className="text-slate-500 text-xs">Nomor WhatsApp</span>
                  <span className="font-mono text-slate-800">{currentOrder.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500 text-xs">Pilihan Jersey</span>
                  <span className="font-medium text-slate-800">
                    {currentOrder.size} - {currentOrder.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek'}
                  </span>
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

              {/* Kirim Nota ke Pemesan */}
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                    Kirim Invoice ke WhatsApp
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
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Ke WA Admin</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SIMULATION / VERIFIKASI INSTAN (UNTUK TESTING / PANITIA) */}
          {/* ============================================================== */}
          {!isPaid && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 mb-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Simulasi / Konfirmasi Cepat
                  </h5>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    Klik tombol di bawah jika dana transfer/QRIS sudah masuk untuk mengubah status pesanan menjadi <b>LUNAS</b>:
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
                onClick={handleSimulatePayment}
                disabled={isSimulating}
                className="mt-2.5 w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-950 text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-xs sm:text-sm"
              >
                {isSimulating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Verifikasi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Konfirmasi Pembayaran Berhasil (Tandai Lunas)</span>
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
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Detail Pesanan'}</span>
            </button>

            {isPaid ? (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-black text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-colors"
              >
                <span>Tutup Jendela</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium py-2.5 px-3 rounded-xl text-xs hover:bg-slate-100 transition-colors"
              >
                <span>Tutup (Bayar Nanti)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}