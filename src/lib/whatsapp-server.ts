import fs from 'fs';
import path from 'path';
import { Order, formatRupiah } from './types';
import { formatPhoneNumberToWA, generateWhatsAppMessage } from './whatsapp';

/**
 * Pengiriman otomatis via Gateway WhatsApp (Fonnte) jika TOKEN dikonfigurasi.
 * Mengirim pesan teks konfirmasi pembayaran.
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

// Penjaga anti-dobel multi-lapis:
// 1. In-memory Set per serverless instance
const waSentOrders = new Set<string>();
// 2. In-flight lock (mencegah balapan antar request paralel di milidetik yang sama)
const waInFlight = new Set<string>();
// 3. Timestamp map (mencegah pengiriman ulang pesanan yang sama dalam 24 jam)
const waSentTimestamps = new Map<string, number>();

function getLockFilePath(orderId: string): string {
  const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
  const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(tmpDir, `wa-sent-${safeId}.lock`);
}

function isAlreadySentPersistently(orderId: string): boolean {
  try {
    const lockFile = getLockFilePath(orderId);
    if (fs.existsSync(lockFile)) {
      const stat = fs.statSync(lockFile);
      // Valid selama 24 jam
      if (Date.now() - stat.mtimeMs < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch {
    // Ignore error jika filesystem read-only
  }
  return false;
}

function markSentPersistently(orderId: string): void {
  try {
    const lockFile = getLockFilePath(orderId);
    fs.writeFileSync(lockFile, new Date().toISOString(), 'utf8');
  } catch {
    // Ignore error jika filesystem read-only
  }
}

/**
 * Notifikasi pembayaran LUNAS ke pemesan: TEPAT SATU pesan WA berisi link PDF invoice.
 * Menggunakan deduplikasi multi-lapis: in-memory Set, in-flight mutex, timestamp cache, dan /tmp lock file.
 */
export async function sendWhatsAppInvoicePDF(order: Order): Promise<{ success: boolean; message: string }> {
  // Layer 1: Cek in-memory Set
  if (waSentOrders.has(order.id)) {
    console.log(`[WhatsApp Dedup]: Pesanan ${order.id} sudah terdaftar di memory waSentOrders. Pengiriman diabaikan.`);
    return { success: true, message: 'Notifikasi WA untuk pesanan ini sudah dikirim' };
  }

  // Layer 2: Cek timestamp map (cooldown 24 jam)
  const lastSent = waSentTimestamps.get(order.id);
  if (lastSent && Date.now() - lastSent < 24 * 60 * 60 * 1000) {
    console.log(`[WhatsApp Dedup]: Pesanan ${order.id} sudah dikirim ${Math.round((Date.now() - lastSent) / 1000)} detik yang lalu. Pengiriman diabaikan.`);
    return { success: true, message: 'Notifikasi WA untuk pesanan ini sudah dikirim' };
  }

  // Layer 3: Cek persistent file lock (/tmp)
  if (isAlreadySentPersistently(order.id)) {
    console.log(`[WhatsApp Dedup]: Pesanan ${order.id} sudah memiliki file lock di /tmp. Pengiriman diabaikan.`);
    waSentOrders.add(order.id);
    return { success: true, message: 'Notifikasi WA untuk pesanan ini sudah dikirim' };
  }

  // Layer 4: In-flight mutex (mencegah request bersamaan mengirim secara simultan)
  if (waInFlight.has(order.id)) {
    console.log(`[WhatsApp Dedup]: Pesanan ${order.id} sedang dalam proses kirim (in-flight). Panggilan paralel dibatalkan.`);
    return { success: true, message: 'Pengiriman WA sedang berlangsung' };
  }
  waInFlight.add(order.id);

  const token = process.env.FONNTE_TOKEN?.trim() || 'L51Vfvj6BNViqEM3pUV8';
  const target = formatPhoneNumberToWA(order.phone);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jersey-order-app-chi.vercel.app';

  const message =
    `📄 *Bukti Pembayaran Resmi — Invoice PDF*\n` +
    `No. Pesanan: *${order.id}*\n` +
    `Pemesan: *${order.name}* (${order.division || 'Bagian Umum'})\n` +
    `Total: *${formatRupiah(order.totalPrice)}*\n` +
    `Status: ✅ *LUNAS*\n\n` +
    `Unduh PDF bukti pembayaran:\n${baseUrl}/api/invoice/${order.id}/pdf\n\n` +
    `Cek status pesanan:\n${baseUrl}/status\n\n` +
    `Data pesanan sudah masuk rekap vendor untuk produksi.\n` +
    `_Aulia NAWASENA • Kanwil DJPb Kepulauan Bangka Belitung_`;

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, message, countryCode: '62' }),
    });
    const result = await res.json();
    console.log('[Fonnte Send Result]:', result);

    if (result.status === true) {
      // Tandai sukses di semua layer pencegahan
      waSentOrders.add(order.id);
      waSentTimestamps.set(order.id, Date.now());
      markSentPersistently(order.id);
      return {
        success: true,
        message: result.reason || 'Link PDF invoice berhasil dikirim ke WhatsApp pemesan',
      };
    } else {
      console.warn(`[Fonnte Send Failed]: ${result.reason || 'Unknown reason'}`);
      return {
        success: false,
        message: result.reason || 'Gagal mengirim pesan melalui WhatsApp Gateway',
      };
    }
  } catch (error) {
    console.error('Gagal mengirim WhatsApp via Gateway:', error);
    return { success: false, message: 'Gagal menghubungi server WhatsApp Gateway' };
  } finally {
    // Lepaskan in-flight lock
    waInFlight.delete(order.id);
  }
}
