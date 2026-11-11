import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus, getOrderById } from '@/lib/orders';
import { sendWhatsAppInvoicePDF } from '@/lib/whatsapp';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ success: true, message: 'Pesanan sudah lunas', data: order });
    }

    const updated = await updateOrderStatus(id, 'PAID');
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Gagal memperbarui status' }, { status: 500 });
    }

    // Satu pesan WA: PDF invoice sebagai lampiran
    const waResult = await sendWhatsAppInvoicePDF(updated);

    return NextResponse.json({
      success: true,
      message: 'Pembayaran QRIS berhasil disimulasikan',
      data: updated,
      whatsapp: waResult,
    });
  } catch (error) {
    console.error('Failed to process payment simulation:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses pembayaran' }, { status: 500 });
  }
}
