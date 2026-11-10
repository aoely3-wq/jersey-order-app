import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders, createOrder } from '@/lib/orders';
import { JerseySize, SleeveType, CartItem, calculatePrice } from '@/lib/types';

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
    let { name, division, phone, items, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Nama dan Nomor WhatsApp wajib diisi' },
        { status: 400 }
      );
    }

    const validSizes: JerseySize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', '3XL', '4XL'];
    const validSleeves: SleeveType[] = ['pendek', 'panjang'];

    // JIKA PEMBELIAN VIA CART (LEBIH DARI 1 JERSEY)
    if (items && Array.isArray(items) && items.length > 0) {
      const validatedItems: CartItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let itemSize = it.size;
        if (itemSize === '3XL') itemSize = 'XXXL';
        if (itemSize === '4XL') itemSize = 'XXXXL';

        if (!validSizes.includes(itemSize)) {
          return NextResponse.json(
            { success: false, message: `Ukuran jersey pada item #${i + 1} tidak valid` },
            { status: 400 }
          );
        }

        if (!validSleeves.includes(it.sleeve)) {
          return NextResponse.json(
            { success: false, message: `Pilihan lengan pada item #${i + 1} tidak valid` },
            { status: 400 }
          );
        }

        const pricing = calculatePrice(it.sleeve, itemSize);
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);

        validatedItems.push({
          id: it.id || `item-${Date.now()}-${i}`,
          color: it.color === 'maroon' ? 'maroon' : 'putih',
          genderCut: it.genderCut === 'ladies' ? 'ladies' : 'men',
          size: itemSize,
          sleeve: it.sleeve,
          quantity: qty,
          basePrice: pricing.basePrice,
          sleeveExtra: pricing.sleeveExtra,
          sizeExtra: pricing.sizeExtra,
          unitPrice: pricing.totalPrice,
          subtotal: pricing.totalPrice * qty,
        });
      }

      const newOrder = await createOrder({
        name,
        division: division?.trim() || 'Bagian Umum',
        phone,
        items: validatedItems,
        notes,
      });

      return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
    }

    // JIKA PEMBELIAN SINGLE JERSEY (LEGACY)
    let { genderCut, size, sleeve } = body;
    if (!size || !sleeve) {
      return NextResponse.json(
        { success: false, message: 'Harap pilih ukuran dan tipe lengan jersey' },
        { status: 400 }
      );
    }

    if (size === '3XL') size = 'XXXL';
    if (size === '4XL') size = 'XXXXL';

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
      color: body.color || 'putih',
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
