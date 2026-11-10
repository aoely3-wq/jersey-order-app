import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, getOrderById, getAllOrders } from '@/lib/orders';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

/**
 * Proses verifikasi dan update status order di background.
 * Dipanggil setelah kita sudah mengirim 200 OK ke DOKU agar tidak timeout.
 */
async function processPaymentAsync(notification: Record<string, any>) {
  try {
    // Ekstrak invoice / order id dari semua kemungkinan field DOKU
    const rawInvoiceId =
      notification?.order?.invoice_number ||
      notification?.words?.[0]?.invoice_number ||
      notification?.order_id ||
      notification?.invoice_number ||
      '';

    console.log('[Webhook] invoice_number from DOKU:', rawInvoiceId);

    if (!rawInvoiceId) {
      console.warn('[Webhook] No invoice_number found in payload');
      return;
    }

    // Ekstrak status transaksi
    const dokuStatus = (notification?.transaction?.status || '').toUpperCase();
    const midtransStatus = notification?.transaction_status;
    const fraudStatus = notification?.fraud_status;

    const isSuccess =
      dokuStatus === 'SUCCESS' ||
      dokuStatus === 'SETTLED' ||
      midtransStatus === 'settlement' ||
      (midtransStatus === 'capture' && fraudStatus === 'accept');

    const isCancelled =
      dokuStatus === 'FAILED' ||
      dokuStatus === 'EXPIRED' ||
      midtransStatus === 'cancel' ||
      midtransStatus === 'deny' ||
      midtransStatus === 'expire';

    console.log(`[Webhook] dokuStatus=${dokuStatus} isSuccess=${isSuccess} isCancelled=${isCancelled}`);

    if (!isSuccess && !isCancelled) {
      console.log('[Webhook] Not a final status, skipping update');
      return;
    }

    // Cari order — coba langsung, lalu dengan prefix ORD-
    let order = await getOrderById(rawInvoiceId);

    if (!order) {
      const withPrefix = `ORD-${rawInvoiceId}`;
      order = await getOrderById(withPrefix);
      if (order) console.log(`[Webhook] Matched with prefix: ${withPrefix}`);
    }

    if (!order) {
      // Fuzzy match: bagian angka dari invoice
      const numericPart = rawInvoiceId.replace(/\D/g, '');
      if (numericPart.length >= 4) {
        const allOrders = await getAllOrders();
        const matched = allOrders.find(
          (o) => o.id.includes(numericPart) || numericPart.includes(o.id.replace(/\D/g, ''))
        );
        if (matched) {
          order = matched;
          console.log(`[Webhook] Fuzzy-matched: ${order.id} from invoice ${rawInvoiceId}`);
        }
      }
    }

    if (!order) {
      console.warn(`[Webhook] Order not found for invoice: ${rawInvoiceId}`);
      return;
    }

    if (isSuccess && order.status !== 'PAID') {
      console.log(`[Webhook] Marking ${order.id} as PAID`);
      const updated = await updateOrderStatus(order.id, 'PAID');
      if (updated) {
        try {
          await sendWhatsAppNotification(updated);
          console.log(`[Webhook] WA sent for ${order.id}`);
        } catch (waErr) {
          console.error('[Webhook] WA notification failed:', waErr);
        }
      }
    } else if (order.status === 'PAID') {
      console.log(`[Webhook] ${order.id} already PAID`);
    } else if (isCancelled && order.status === 'PENDING') {
      console.log(`[Webhook] Marking ${order.id} as CANCELLED`);
      await updateOrderStatus(order.id, 'CANCELLED');
    }
  } catch (err) {
    console.error('[Webhook] Background processing error:', err);
  }
}

export async function POST(req: NextRequest) {
  let notification: Record<string, any> = {};

  try {
    const rawBody = await req.text();
    console.log('[Webhook] Raw payload received:', rawBody.substring(0, 500));

    try {
      notification = JSON.parse(rawBody);
    } catch {
      console.warn('[Webhook] Invalid JSON payload');
    }
  } catch (err) {
    console.error('[Webhook] Failed to read body:', err);
  }

  // Langsung balas 200 ke DOKU agar tidak timeout
  // Proses update order di background (non-blocking)
  if (Object.keys(notification).length > 0) {
    // Gunakan Promise tanpa await — fire and forget
    processPaymentAsync(notification).catch((err) =>
      console.error('[Webhook] Unhandled async error:', err)
    );
  }

  return NextResponse.json({
    success: true,
    status: 'OK',
    message: 'Notification received',
  });
}

