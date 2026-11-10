import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, getOrderById } from '@/lib/orders';
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

    // Ekstrak invoice / order id (Mendukung format DOKU dan Midtrans)
    const orderId =
      notification?.order?.invoice_number ||
      notification?.order_id ||
      notification?.invoice_number;

    // Ekstrak status transaksi
    // DOKU: notification.transaction.status = 'SUCCESS' | 'FAILED' | 'EXPIRED'
    // Midtrans: notification.transaction_status = 'settlement' | 'capture' | 'expire'
    const dokuStatus = notification?.transaction?.status;
    const midtransStatus = notification?.transaction_status;
    const fraudStatus = notification?.fraud_status;

    if (!orderId) {
      console.warn('[Payment Webhook]: Missing order_id or invoice_number');
      return NextResponse.json({ success: false, message: 'Missing order_id' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      console.warn(`[Payment Webhook]: Order not found for ID: ${orderId}`);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Tentukan apakah pembayaran berhasil
    const isSuccess =
      dokuStatus === 'SUCCESS' ||
      midtransStatus === 'settlement' ||
      (midtransStatus === 'capture' && fraudStatus === 'accept');

    const isCancelled =
      dokuStatus === 'FAILED' ||
      dokuStatus === 'EXPIRED' ||
      midtransStatus === 'cancel' ||
      midtransStatus === 'deny' ||
      midtransStatus === 'expire';

    if (isSuccess && order.status !== 'PAID') {
      console.log(`[Payment Webhook]: Order ${orderId} successfully PAID!`);
      const updated = await updateOrderStatus(orderId, 'PAID');
      if (updated) {
        // Kirim konfirmasi WhatsApp otomatis melalui Fonnte
        try {
          await sendWhatsAppNotification(updated);
          console.log(`[Payment Webhook]: WhatsApp confirmation sent for ${orderId}`);
        } catch (waErr) {
          console.error('[Payment Webhook]: Failed to send WA notification:', waErr);
        }
      }
    } else if (isCancelled && order.status === 'PENDING') {
      console.log(`[Payment Webhook]: Order ${orderId} marked as CANCELLED`);
      await updateOrderStatus(orderId, 'CANCELLED');
    }

    // DOKU dan payment gateway lainnya mengharapkan HTTP 200 OK
    return NextResponse.json({
      success: true,
      status: 'OK',
      message: 'Notification processed successfully',
    });
  } catch (error) {
    console.error('Failed to handle payment notification webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
