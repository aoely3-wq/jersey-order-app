import { Order, formatRupiah } from './types';

/**
 * Normalisasi nomor HP Indonesia ke format internasional (628...)
 * Contoh: 08123456789 -> 628123456789
 */
export function formatPhoneNumberToWA(phone: string): string {
  let cleaned = phone.replace(/\D/g, ''); // Hapus karakter non-digit
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Format pesan WhatsApp konfirmasi pembayaran yang rapi
 */
export function generateWhatsAppMessage(order: Order): string {
  const waktu = order.paidAt
    ? new Date(order.paidAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://jersey-order-app-chi.vercel.app';
  const invoiceUrl = `${baseUrl}/invoice/${order.id}`;
  const statusUrl = `${baseUrl}/status`;

  let itemDetails = '';
  if (order.items && order.items.length > 0) {
    itemDetails = order.items
      .map(
        (it, idx) =>
          `  ${idx + 1}. ${it.quantity}x Jersey ${it.color === 'maroon' ? 'Merah Maroon' : 'Putih (Biru)'} - ${it.genderCut === 'ladies' ? 'Ladies' : 'Men'} Size ${it.size} (${it.sleeve === 'panjang' ? 'Panjang' : 'Pendek'}): ${formatRupiah(it.subtotal)}`
      )
      .join('\n');
  } else {
    const sleeveLabel = order.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek';
    const cutLabel = order.genderCut === 'ladies' ? 'Ladies (Wanita)' : 'Reguler (Men)';
    const colorLabel = order.color === 'maroon' ? 'Merah Maroon' : 'Putih (Biru)';
    itemDetails = `  • 1x Jersey ${colorLabel} - ${cutLabel} Size ${order.size} (${sleeveLabel}): ${formatRupiah(order.totalPrice)}`;
  }

  const totalQtyText = order.totalQty ? `${order.totalQty} pcs` : '1 pcs';

  return `*KONFIRMASI PEMBAYARAN JERSEY RESMI KANWIL DJPB BABEL* ✅

Halo Sdr/i *${order.name}*,
Pembayaran pemesanan Jersey Edisi Resmi 2026 Anda telah *BERHASIL DIKONFIRMASI LUNAS*.

📋 *Rincian Pesanan:*
• No. Pesanan   : *${order.id}*
• Bidang/Bagian : *${order.division || 'Bagian Umum'}*
• Total Jumlah  : *${totalQtyText}*
• Rincian Item  :
${itemDetails}
• Total Bayar   : *${formatRupiah(order.totalPrice)}*
• Status        : *LUNAS (Terverifikasi DOKU)*
• Waktu Bayar   : ${waktu}
${order.notes ? `• Catatan       : ${order.notes}\n` : ''}
📄 *Bukti Pembayaran / Invoice PDF Resmi:*
${invoiceUrl}

🔍 *Cek Status Mandiri:*
${statusUrl}

Data pesanan Anda sudah otomatis masuk ke dalam rekapitulasi vendor konveksi untuk proses produksi seragam.

Terima kasih atas partisipasinya! 🙏
_Aulia NAWASENA • Panitia Jersey Kanwil DJPb Bangka Belitung_`;
}

/**
 * Nomor WhatsApp Admin / Panitia (Aulia Rahim)
 */
export const ADMIN_PHONE = '082136105904';

/**
 * URL Link WhatsApp Click-to-Chat (wa.me) ke Pemesan
 */
export function getWhatsAppDirectLink(order: Order): string {
  const waNumber = formatPhoneNumberToWA(order.phone);
  const message = encodeURIComponent(generateWhatsAppMessage(order));
  return `https://wa.me/${waNumber}?text=${message}`;
}

/**
 * URL Link WhatsApp Click-to-Chat untuk Pemesan mengirim bukti bayar ke Admin
 */
export function getAdminWhatsAppConfirmationLink(order: Order): string {
  const adminTarget = formatPhoneNumberToWA(ADMIN_PHONE);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://jersey-order-app-chi.vercel.app';
  const invoiceUrl = `${baseUrl}/invoice/${order.id}`;

  let itemsSummary = '';
  if (order.items && order.items.length > 0) {
    itemsSummary = order.items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.color === 'maroon' ? 'Maroon' : 'Putih'} (${it.genderCut === 'ladies' ? 'Ladies' : 'Men'} ${it.size} - ${it.sleeve === 'panjang' ? 'Pjg' : 'Pdk'})`
      )
      .join('\n');
  } else {
    const sleeveLabel = order.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek';
    const cutLabel = order.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men';
    itemsSummary = `• 1x ${order.color === 'maroon' ? 'Maroon' : 'Putih'} (${cutLabel} ${order.size} - ${sleeveLabel})`;
  }

  const text = `Halo Admin Aulia NAWASENA,\nSaya telah melakukan pembayaran pemesanan jersey:\n\n• No. Pesanan: ${order.id}\n• Nama: ${order.name}\n• Bidang/Bagian: ${order.division || 'Bagian Umum'}\n${itemsSummary}\n• Total: ${formatRupiah(order.totalPrice)}\n• Metode: DOKU QRIS / Virtual Account\n• Bukti Invoice: ${invoiceUrl}\n\nMohon diverifikasi. Terima kasih! 🙏`;
  return `https://wa.me/${adminTarget}?text=${encodeURIComponent(text)}`;
}

/**
 * Pengiriman otomatis via Gateway WhatsApp (Fonnte) jika TOKEN dikonfigurasi
 */
export async function sendWhatsAppNotification(order: Order): Promise<{ success: boolean; message: string }> {
  const token = process.env.FONNTE_TOKEN?.trim() || 'L51Vfvj6BNViqEM3pUV8';
  const target = formatPhoneNumberToWA(order.phone);
  const message = generateWhatsAppMessage(order);

  // Jika token belum diset, catat log simulasi pengiriman
  if (!token) {
    console.log(`[WhatsApp Mock Dispatch] Terkirim ke ${target}:\n${message}`);
    return {
      success: true,
      message: 'Mode simulasi: Notifikasi WA dicatat ke server log (Siapkan FONNTE_TOKEN untuk kirim asli).',
    };
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: '62',
      }),
    });

    const result = await res.json();
    console.log('[Fonnte Send Result]:', result);
    return {
      success: result.status === true,
      message: result.reason || 'Pesan WA otomatis berhasil dikirim',
    };
  } catch (error) {
    console.error('Gagal mengirim WhatsApp via Gateway:', error);
    return {
      success: false,
      message: 'Gagal menghubungi server WhatsApp Gateway',
    };
  }
}
