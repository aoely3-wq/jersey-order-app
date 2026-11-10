import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Order } from '@/lib/types';
import { batchSyncToSheet, isGoogleSheetConfigured } from '@/lib/googleSheets';

export async function POST() {
  if (!isGoogleSheetConfigured()) {
    return NextResponse.json({
      success: false,
      message: 'GOOGLE_SHEET_URL belum dikonfigurasi di file .env.local atau Vercel Environment Variables',
    }, { status: 400 });
  }

  try {
    const dataFile = path.join(process.cwd(), 'data', 'orders.json');
    let orders: Order[] = [];
    if (fs.existsSync(dataFile)) {
      const raw = await fs.promises.readFile(dataFile, 'utf8');
      orders = JSON.parse(raw);
    }

    const result = await batchSyncToSheet(orders);
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Berhasil menyinkronkan ${result.count ?? orders.length} pesanan ke Google Sheets!`,
        count: result.count ?? orders.length,
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Gagal mengirim data ke Google Sheets Web App',
    }, { status: 502 });
  } catch (error) {
    console.error('Error syncing to sheet:', error);
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan server saat sinkronisasi',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isGoogleSheetConfigured(),
    url: process.env.GOOGLE_SHEET_URL ? 'TERHUBUNG (Hidden for security)' : null,
  });
}
