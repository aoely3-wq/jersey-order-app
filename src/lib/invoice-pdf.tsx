/**
 * Template Invoice PDF menggunakan @react-pdf/renderer
 * Menghasilkan dokumen PDF binary resmi untuk bukti pembayaran jersey.
 *
 * Digunakan oleh:
 * - GET /api/invoice/[id]/pdf  → download PDF di browser
 * - sendWhatsAppInvoicePDF()   → kirim PDF dokumen ke WA via Fonnte
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Order, formatRupiah } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY = '#002B5B';    // Biru DJPb
const GOLD    = '#D4AF37';    // Emas aksen
const EMERALD = '#059669';    // Hijau LUNAS
const SLATE   = '#475569';    // Abu-abu teks
const BORDER  = '#CBD5E1';    // Border abu

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingBottom: 32,
    paddingHorizontal: 0,
    fontSize: 9,
    color: '#1E293B',
  },

  // ── HEADER ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottom: `4px solid ${GOLD}`,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  instansiLabel: {
    fontSize: 7,
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  instansiName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  instansiSub: {
    fontSize: 7.5,
    color: '#BFDBFE',
    marginTop: 3,
  },
  docLabel: {
    fontSize: 7,
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'right',
    marginBottom: 4,
  },
  docId: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    textAlign: 'right',
  },

  // ── BODY ────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 36,
    paddingTop: 20,
  },

  // ── STATUS GRID ─────────────────────────────────────────────────────────
  statusGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    border: `1px solid ${BORDER}`,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statusCell: {
    flex: 1,
    padding: 10,
    borderRight: `1px solid ${BORDER}`,
  },
  statusCellLast: {
    flex: 1,
    padding: 10,
  },
  statusCellLabel: {
    fontSize: 7,
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    border: `1px solid #BBF7D0`,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  statusPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    border: `1px solid #FDE047`,
  },
  statusPendingText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#854D0E',
  },
  statusValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },

  // ── SECTION HEADER ──────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },

  // ── CUSTOMER CARD ───────────────────────────────────────────────────────
  customerCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  customerGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  customerField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7,
    color: '#94A3B8',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  fieldValueBlue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
  },

  // ── TABLE ───────────────────────────────────────────────────────────────
  tableWrapper: {
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottom: `1px solid ${BORDER}`,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: `1px solid #F1F5F9`,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderTop: `2px solid ${BORDER}`,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  thNo:    { width: 24, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase' },
  thDesc:  { flex: 1,  fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase' },
  thSize:  { width: 42, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', textAlign: 'center' },
  thSleeve:{ width: 46, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', textAlign: 'center' },
  thQty:   { width: 28, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', textAlign: 'center' },
  thPrice: { width: 62, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', textAlign: 'right' },
  thSub:   { width: 68, fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, textTransform: 'uppercase', textAlign: 'right' },

  tdNo:    { width: 24, fontSize: 8, color: '#94A3B8', fontFamily: 'Helvetica-Bold' },
  tdDesc:  { flex: 1 },
  tdDescMain:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A' },
  tdDescSub:    { fontSize: 7.5, color: SLATE, marginTop: 1 },
  tdSize:  { width: 42, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'center' },
  tdSleeve:{ width: 46, fontSize: 8.5, color: SLATE, textAlign: 'center' },
  tdQty:   { width: 28, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'center' },
  tdPrice: { width: 62, fontSize: 8.5, color: SLATE, textAlign: 'right' },
  tdSub:   { width: 68, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0F172A', textAlign: 'right' },

  tfLabel: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE, textAlign: 'right', paddingRight: 8 },
  tfValue: { width: 68, fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY, textAlign: 'right' },

  // ── BOTTOM GRID ─────────────────────────────────────────────────────────
  bottomGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  bottomCard: {
    flex: 1,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  bottomCardLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: SLATE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  bottomCardValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
  },
  bottomCardSub: {
    fontSize: 7,
    color: SLATE,
    marginTop: 2,
    lineHeight: 1.4,
  },

  // ── STAMP ───────────────────────────────────────────────────────────────
  stampWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  stampOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    border: `3px dashed ${EMERALD}`,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-12deg)',
  },
  stampInstitution: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: EMERALD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stampStatus: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: EMERALD,
    letterSpacing: 2,
  },
  stampYear: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: EMERALD,
  },

  // ── FOOTER ──────────────────────────────────────────────────────────────
  footer: {
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${BORDER}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {},
  footerTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  footerSub: {
    fontSize: 7.5,
    color: SLATE,
    marginTop: 1,
  },
  footerNote: {
    fontSize: 7,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  footerRight: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'right',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF DOCUMENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function InvoicePDFDocument({ order }: { order: Order }) {
  const isPaid = order.status === 'PAID';

  // Normalisasi items
  const items =
    order.items && order.items.length > 0
      ? order.items
      : [
          {
            id: 'item-1',
            color: order.color || 'putih',
            genderCut: order.genderCut || 'men',
            size: order.size || 'L',
            sleeve: order.sleeve || 'pendek',
            quantity: 1,
            basePrice: order.basePrice || 130000,
            sleeveExtra: order.sleeveExtra || 0,
            sizeExtra: order.sizeExtra || 0,
            unitPrice: order.totalPrice,
            subtotal: order.totalPrice,
          },
        ];

  const totalQty = items.reduce((s, it) => s + it.quantity, 0);
  const generatedAt = new Date().toLocaleString('id-ID');

  return (
    <Document
      title={`Invoice Jersey ${order.id}`}
      author="Kanwil DJPb Kepulauan Bangka Belitung"
      subject="Bukti Pembayaran Resmi Jersey Cual DJPb Babel 2026"
      creator="Sistem Pemesanan Jersey InTress"
    >
      <Page size="A4" style={s.page}>

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.instansiLabel}>Kementerian Keuangan Republik Indonesia</Text>
              <Text style={s.instansiName}>KANWIL DJPb PROVINSI BANGKA BELITUNG</Text>
              <Text style={s.instansiSub}>
                Indonesian Treasury (InTress) • Pengadaan Jersey Kantor 2026
              </Text>
            </View>
            <View>
              <Text style={s.docLabel}>BUKTI PEMBAYARAN RESMI</Text>
              <Text style={s.docId}>{order.id}</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

          {/* ── STATUS GRID ──────────────────────────────────────────────── */}
          <View style={s.statusGrid}>
            <View style={s.statusCell}>
              <Text style={s.statusCellLabel}>Status Pembayaran</Text>
              {isPaid ? (
                <View style={s.statusBadge}>
                  <Text style={s.statusBadgeText}>✓  LUNAS / VERIFIED</Text>
                </View>
              ) : (
                <View style={s.statusPendingBadge}>
                  <Text style={s.statusPendingText}>MENUNGGU PEMBAYARAN</Text>
                </View>
              )}
            </View>
            <View style={s.statusCell}>
              <Text style={s.statusCellLabel}>Tanggal Pemesanan</Text>
              <Text style={s.statusValue}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={s.statusCellLast}>
              <Text style={s.statusCellLabel}>Waktu Pelunasan</Text>
              <Text style={s.statusValue}>
                {order.paidAt ? formatDateTime(order.paidAt) : 'Menunggu Verifikasi'}
              </Text>
            </View>
          </View>

          {/* ── DATA PEMESAN ─────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>Data Pegawai / Pemesan:</Text>
          <View style={s.customerCard}>
            <View style={s.customerGrid}>
              <View style={s.customerField}>
                <Text style={s.fieldLabel}>Nama Lengkap</Text>
                <Text style={s.fieldValue}>{order.name}</Text>
              </View>
              <View style={s.customerField}>
                <Text style={s.fieldLabel}>Bidang / Bagian</Text>
                <Text style={s.fieldValueBlue}>{order.division || 'Bagian Umum'}</Text>
              </View>
              <View style={s.customerField}>
                <Text style={s.fieldLabel}>Nomor WhatsApp</Text>
                <Text style={s.fieldValue}>{order.phone}</Text>
              </View>
            </View>
            {order.notes ? (
              <View style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                <Text style={s.fieldLabel}>Catatan Khusus:</Text>
                <Text style={{ fontSize: 8.5, color: SLATE, fontStyle: 'italic' }}>{order.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* ── TABEL ITEM ───────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>Rincian Item Jersey Dipesan:</Text>
          <View style={s.tableWrapper}>

            {/* Table Header */}
            <View style={s.tableHeader}>
              <Text style={s.thNo}>No</Text>
              <Text style={s.thDesc}>Varian & Deskripsi Jersey</Text>
              <Text style={s.thSize}>Ukuran</Text>
              <Text style={s.thSleeve}>Lengan</Text>
              <Text style={s.thQty}>Qty</Text>
              <Text style={s.thPrice}>Harga Satuan</Text>
              <Text style={s.thSub}>Subtotal</Text>
            </View>

            {/* Table Rows */}
            {items.map((item, idx) => {
              const isMaroon = item.color === 'maroon';
              const isLong   = item.sleeve === 'panjang';
              const isLast   = idx === items.length - 1;
              return (
                <View key={item.id || idx} style={isLast ? s.tableRowLast : s.tableRow}>
                  <Text style={s.tdNo}>{idx + 1}</Text>
                  <View style={s.tdDesc}>
                    <Text style={s.tdDescMain}>Jersey Cual DJPb Babel</Text>
                    <Text style={s.tdDescSub}>
                      {isMaroon ? 'Merah Maroon' : 'Putih (Biru Kemenkeu)'} •{' '}
                      {item.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men'}
                      {item.sizeExtra > 0 ? ` • +${formatRupiah(item.sizeExtra)} (oversize)` : ''}
                      {item.sleeveExtra > 0 ? ` • +${formatRupiah(item.sleeveExtra)} (lengan panjang)` : ''}
                    </Text>
                  </View>
                  <Text style={s.tdSize}>{item.size}</Text>
                  <Text style={s.tdSleeve}>{isLong ? 'Panjang' : 'Pendek'}</Text>
                  <Text style={s.tdQty}>{item.quantity}</Text>
                  <Text style={s.tdPrice}>{formatRupiah(item.unitPrice)}</Text>
                  <Text style={s.tdSub}>{formatRupiah(item.subtotal)}</Text>
                </View>
              );
            })}

            {/* Table Footer */}
            <View style={s.tableFooter}>
              <Text style={s.tfLabel}>Total Jumlah ({totalQty} pcs) — Total Bayar:</Text>
              <Text style={s.tfValue}>{formatRupiah(order.totalPrice)}</Text>
            </View>
          </View>

          {/* ── BOTTOM: METODE & STEMPEL ─────────────────────────────────── */}
          <View style={s.bottomGrid}>
            <View style={[s.bottomCard, { flex: 2 }]}>
              <Text style={s.bottomCardLabel}>Metode Pembayaran</Text>
              <Text style={s.bottomCardValue}>QRIS & Virtual Account Bank (DOKU Gateway)</Text>
              <Text style={s.bottomCardSub}>
                Acquirer: DOKU (PT Nusa Satu Inti Artha){'\n'}
                Merchant: Jersey Kanwil DJPb Babel{'\n'}
                NMID: ID1026636092060
              </Text>
            </View>
            <View style={[s.bottomCard, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={s.bottomCardLabel}>Status Rekap Vendor</Text>
              <Text style={{ fontSize: 8, color: EMERALD, fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>
                ✓  Tersinkronisasi ke Google Sheets
              </Text>
              {isPaid && (
                <View style={s.stampOuter}>
                  <Text style={s.stampInstitution}>DJPb Babel</Text>
                  <Text style={s.stampStatus}>LUNAS</Text>
                  <Text style={s.stampYear}>2026</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
          <View style={s.footer}>
            <View style={s.footerLeft}>
              <Text style={s.footerTitle}>Pengadaan Jersey Cual DJPb Babel 2026</Text>
              <Text style={s.footerSub}>
                Kanwil Ditjen Perbendaharaan Provinsi Kepulauan Bangka Belitung
              </Text>
              <Text style={s.footerNote}>
                Dokumen ini merupakan bukti sah transaksi digital dan dapat disimpan sebagai arsip pribadi.
              </Text>
            </View>
            <Text style={s.footerRight}>Generated: {generatedAt}</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
}
