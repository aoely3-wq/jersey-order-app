import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus, deleteOrder } from '@/lib/orders';
import { OrderStatus } from '@/lib/types';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Failed to get order:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil detail pesanan' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    const validStatuses: OrderStatus[] = ['PENDING', 'PAID', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'Status tidak valid' }, { status: 400 });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (status === 'PAID') {
      await sendWhatsAppNotification(updated);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json({ success: false, message: 'Gagal memperbarui status' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = await deleteOrder(id);
    if (!success) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus pesanan' }, { status: 500 });
  }
}
