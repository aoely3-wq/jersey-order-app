import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orders';
import { isDokuConfigured, createDokuCheckout } from '@/lib/doku';

// Compatibility endpoint for previous Midtrans route, now delegated to DOKU
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (!isDokuConfigured()) {
      return NextResponse.json({
        success: false,
        isConfigured: false,
        message: 'DOKU belum dikonfigurasi. Menggunakan mode simulasi.',
      });
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const callbackUrl = `${origin}/rekap?order_id=${order.id}`;

    const dokuData = await createDokuCheckout(order, callbackUrl);

    return NextResponse.json({
      success: true,
      isConfigured: true,
      data: {
        redirect_url: dokuData.url,
        token: dokuData.tokenId,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat token pembayaran DOKU';
    console.error('Failed to create DOKU checkout token:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
