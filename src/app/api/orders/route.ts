import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, createOrder } from '@/lib/orders';
import { JerseySize, SleeveType } from '@/lib/types';

export async function GET() {
  try {
    const orders = await getAllOrders();
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to get orders:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data pesanan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { name, division, genderCut, phone, size, sleeve, notes } = body;

    if (!name || !phone || !size || !sleeve) {
      return NextResponse.json(
        { success: false, message: 'Harap lengkapi semua kolom yang wajib diisi' },
        { status: 400 }
      );
    }

    if (size === '3XL') size = 'XXXL';
    if (size === '4XL') size = 'XXXXL';

    const validSizes: JerseySize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', '3XL', '4XL'];
    const validSleeves: SleeveType[] = ['pendek', 'panjang'];

    if (!validSizes.includes(size)) {
      return NextResponse.json({ success: false, message: 'Ukuran baju tidak valid' }, { status: 400 });
    }

    if (!validSleeves.includes(sleeve)) {
      return NextResponse.json({ success: false, message: 'Pilihan lengan tidak valid' }, { status: 400 });
    }

    const newOrder = await createOrder({
      name,
      division: division?.trim() || 'Bagian Umum',
      genderCut: genderCut === 'ladies' ? 'ladies' : 'men',
      phone,
      size,
      sleeve,
      notes,
    });

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal membuat pesanan' },
      { status: 500 }
    );
  }
}
