/**
 * GET /api/invoice/[id]/pdf
 *
 * Menghasilkan dokumen PDF binary resmi dari invoice/bukti pembayaran
 * menggunakan @react-pdf/renderer.
 *
 * Response: application/pdf — dapat langsung diakses browser atau diunduh.
 *
 * URL ini JUGA digunakan oleh Fonnte untuk mengirim PDF dokumen ke WA:
 *   Fonnte mendownload PDF dari URL ini → mengirimnya sebagai file attachment WA.
 */

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getOrderById } from '@/lib/orders';
import { InvoicePDFDocument } from '@/lib/invoice-pdf';

export async function GET(
  _req: NextRequest,
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

    // Render komponen React menjadi binary PDF
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(InvoicePDFDocument, { order }) as any
    );

    const filename = `Invoice-Jersey-${order.id}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // inline → preview di browser; attachment → langsung download
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        // Cache sebentar; bila PAID tidak berubah, boleh lebih lama
        'Cache-Control': order.status === 'PAID'
          ? 'public, max-age=3600, s-maxage=3600'
          : 'no-store',
      },
    });
  } catch (err) {
    console.error('[Invoice PDF] Render error:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat PDF invoice' },
      { status: 500 }
    );
  }
}
