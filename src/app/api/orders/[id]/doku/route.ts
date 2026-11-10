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

    // Ambil base origin untuk callback redirect (ke halaman invoice pesanan)
    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const callbackUrl = `${origin}/invoice/${order.id}`;

    // Cek apakah ada request spesifik untuk channel VA atau QRIS
    let paymentMethodTypes: string[] = ['QRIS']; // Default: QRIS langsung agar barcode tampil pertama
    try {
      const body = await req.json();
      if (body.method === 'va') {
        paymentMethodTypes = [
          'VIRTUAL_ACCOUNT_BCA',
          'VIRTUAL_ACCOUNT_BANK_MANDIRI',
          'VIRTUAL_ACCOUNT_BRI',
          'VIRTUAL_ACCOUNT_BNI',
          'VIRTUAL_ACCOUNT_BSI',
          'VIRTUAL_ACCOUNT_PERMATA',
        ];
      } else if (body.method === 'all') {
        paymentMethodTypes = [];
      }
    } catch {
      // Body kosong atau bukan JSON -> default ['QRIS']
    }

    const dokuData = await createDokuCheckout(
      order,
      callbackUrl,
      paymentMethodTypes.length > 0 ? paymentMethodTypes : undefined
    );

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

