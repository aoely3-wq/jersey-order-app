import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/orders';
import { checkDokuOrderStatus, isDokuConfigured } from '@/lib/doku';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (order.status === 'PAID') {
      return NextResponse.json({
        success: true,
        isPaid: true,
        message: 'Pesanan sudah terkonfirmasi LUNAS',
        data: order,
      });
    }

    if (!isDokuConfigured()) {
      return NextResponse.json({
        success: false,
        isPaid: false,
        message: 'Konfigurasi DOKU belum aktif di server',
        data: order,
      });
    }

    const dokuResult = await checkDokuOrderStatus(id);

    if (dokuResult.isPaid) {
      const updated = await updateOrderStatus(id, 'PAID');
      if (updated) {
        order = updated;
        try {
          await sendWhatsAppNotification(updated);
        } catch (waErr) {
          console.error('[Check DOKU Route] Failed to send WA:', waErr);
        }
      }

      return NextResponse.json({
        success: true,
        isPaid: true,
        message: 'Pembayaran berhasil diverifikasi di DOKU!',
        data: order,
      });
    }

    return NextResponse.json({
      success: true,
      isPaid: false,
      status: dokuResult.status,
      message:
        dokuResult.status === 'PENDING' || dokuResult.status === 'ORDER_GENERATED'
          ? 'Menunggu pembayaran diselesaikan oleh pemesan di m-Banking atau E-Wallet.'
          : `Status DOKU: ${dokuResult.status}`,
      data: order,
    });
  } catch (error) {
    console.error('Failed to check DOKU order status:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memeriksa status pembayaran' },
      { status: 500 }
    );
  }
}
