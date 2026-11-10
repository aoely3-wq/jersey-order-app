import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';
import { isDokuConfigured, createDokuCheckout } from '@/lib/doku';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!isDokuConfigured()) {
      return NextResponse.json({
        success: false,
        isConfigured: false,
        message: 'DOKU belum dikonfigurasi. Menggunakan mode simulasi QRIS.',
      });
    }

    // Ambil base origin untuk callback redirect
    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const callbackUrl = `${origin}/rekap?order_id=${order.id}`;

    const dokuData = await createDokuCheckout(order, callbackUrl);

    return NextResponse.json({
      success: true,
      isConfigured: true,
      data: {
        payment_url: dokuData.url,
        token_id: dokuData.tokenId,
        expired_date: dokuData.expiredDate,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat pembayaran DOKU';
    console.error('Failed to create DOKU Checkout:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

