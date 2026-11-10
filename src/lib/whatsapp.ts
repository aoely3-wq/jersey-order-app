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
  const sleeveLabel = order.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek';
  const cutLabel = order.genderCut === 'ladies' ? 'Ladies (Wanita)' : 'Reguler (Men)';
  const waktu = order.paidAt
    ? new Date(order.paidAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  return `*KONFIRMASI PEMBAYARAN JERSEY KANTOR* ✅

Halo Sdr/i *${order.name}*,
Pembayaran pemesanan jersey komunitas kantor Anda telah *BERHASIL DIKONFIRMASI*.

📋 *Detail Pesanan:*
• No. Pesanan   : *${order.id}*
• Bidang/Bagian : *${order.division || 'Bagian Umum'}*
• Model Potongan: *${cutLabel}*
• Ukuran Jersey : *${order.size}* (${sleeveLabel})
• Total Bayar   : *${formatRupiah(order.totalPrice)}*
• Status        : *LUNAS (Sudah Diterima)*
• Waktu Bayar   : ${waktu}
${order.notes ? `• Catatan       : ${order.notes}\n` : ''}
Data pesanan Anda sudah masuk ke dalam daftar rekapitulasi vendor konveksi.

Terima kasih atas partisipasinya! 🙏`;
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
  const sleeveLabel = order.sleeve === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek';
  const cutLabel = order.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men';
  const text = `Halo Admin Aulia NAWASENA,\nSaya telah melakukan pembayaran pemesanan jersey:\n\n• No. Pesanan: ${order.id}\n• Nama: ${order.name}\n• Bidang/Bagian: ${order.division || 'Bagian Umum'}\n• Model: ${cutLabel}\n• Ukuran: ${order.size} (${sleeveLabel})\n• Total: ${formatRupiah(order.totalPrice)}\n• Metode: QRIS DANA Bisnis / Transfer Bank BRI\n\nBerikut saya kirimkan bukti pembayarannya. Mohon diverifikasi. Terima kasih! 🙏`;
  return `https://wa.me/${adminTarget}?text=${encodeURIComponent(text)}`;
}

/**
 * Pengiriman otomatis via Gateway WhatsApp (misal Fonnte / sejenisnya) jika TOKEN dikonfigurasi
 */
export async function sendWhatsAppNotification(order: Order): Promise<{ success: boolean; message: string }> {
  const token = process.env.FONNTE_TOKEN;
  const target = formatPhoneNumberToWA(order.phone);
  const message = generateWhatsAppMessage(order);

  // Jika token belum diset di .env.local, catat log simulasi pengiriman
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
