import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, getOrderById, getAllOrders } from '@/lib/orders';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let notification: Record<string, any> = {};

    try {
      notification = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('[Payment Webhook Notification Received]:', JSON.stringify(notification, null, 2));

    // Ekstrak invoice / order id dari semua kemungkinan field DOKU
    // DOKU bisa mengirim: order.invoice_number, words[].invoice_number, invoice_number
    // DOKU internal invoice number bisa berbeda dari yang kita kirim (prefix ORD- mungkin dihapus)
    const rawInvoiceId =
      notification?.order?.invoice_number ||
      notification?.words?.[0]?.invoice_number ||
      notification?.order_id ||
      notification?.invoice_number ||
      '';

    console.log('[Payment Webhook]: Raw invoice_number from DOKU:', rawInvoiceId);

    // Ekstrak status transaksi
    // DOKU: notification.transaction.status = 'SUCCESS' | 'FAILED' | 'EXPIRED'
    // Midtrans: notification.transaction_status = 'settlement' | 'capture' | 'expire'
    const dokuStatus = (notification?.transaction?.status || '').toUpperCase();
    const midtransStatus = notification?.transaction_status;
    const fraudStatus = notification?.fraud_status;

    if (!rawInvoiceId) {
      console.warn('[Payment Webhook]: Missing order_id or invoice_number in payload');
      // Tetap return 200 agar DOKU tidak retry terus
      return NextResponse.json({ success: true, status: 'OK', message: 'No invoice_number to process' });
    }

    // Coba temukan order: langsung by ID, atau dengan menambah prefix ORD- jika perlu
    let order = await getOrderById(rawInvoiceId);

    if (!order) {
      // Coba dengan prefix ORD- jika DOKU menghapus prefix tersebut
      const withPrefix = `ORD-${rawInvoiceId}`;
      order = await getOrderById(withPrefix);
      if (order) {
        console.log(`[Payment Webhook]: Matched order via prefix: ${withPrefix}`);
      }
    }

    if (!order) {
      // Coba fuzzy match: cari order yang ID-nya mengandung angka dari rawInvoiceId
      const numericPart = rawInvoiceId.replace(/\D/g, '');
      if (numericPart.length >= 4) {
        const allOrders = await getAllOrders();
        const matched = allOrders.find(
          (o) => o.id.includes(numericPart) || numericPart.includes(o.id.replace(/\D/g, ''))
        );
        if (matched) {
          order = matched;
          console.log(`[Payment Webhook]: Fuzzy-matched order: ${order.id} from invoice ${rawInvoiceId}`);
        }
      }
    }

    if (!order) {
      console.warn(`[Payment Webhook]: Order not found for invoice: ${rawInvoiceId}`);
      // Return 200 agar DOKU tidak retry — kita tidak ingin loop
      return NextResponse.json({ success: true, status: 'OK', message: 'Order not found, skipped' });
    }

    // Tentukan apakah pembayaran berhasil
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

    console.log(`[Payment Webhook]: Status check — dokuStatus=${dokuStatus}, isSuccess=${isSuccess}, isCancelled=${isCancelled}`);

    if (isSuccess && order.status !== 'PAID') {
      console.log(`[Payment Webhook]: Marking order ${order.id} as PAID!`);
      const updated = await updateOrderStatus(order.id, 'PAID');
      if (updated) {
        // Kirim konfirmasi WhatsApp otomatis melalui Fonnte
        try {
          await sendWhatsAppNotification(updated);
          console.log(`[Payment Webhook]: WhatsApp confirmation sent for ${order.id}`);
        } catch (waErr) {
          console.error('[Payment Webhook]: Failed to send WA notification:', waErr);
        }
      }
    } else if (order.status === 'PAID') {
      console.log(`[Payment Webhook]: Order ${order.id} already PAID, skipping update`);
    } else if (isCancelled && order.status === 'PENDING') {
      console.log(`[Payment Webhook]: Order ${order.id} marked as CANCELLED`);
      await updateOrderStatus(order.id, 'CANCELLED');
    }

    // DOKU dan payment gateway lainnya mengharapkan HTTP 200 OK
    return NextResponse.json({
      success: true,
      status: 'OK',
      message: 'Notification processed successfully',
    });
  } catch (error) {
    console.error('Failed to handle payment notification webhook:', error);
    // Tetap return 200 agar DOKU tidak retry indefinitely
    return NextResponse.json({ success: true, status: 'OK', message: 'Internal error handled' });
  }
}
