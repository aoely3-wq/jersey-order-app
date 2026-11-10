/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - DATABASE PESANAN JERSEY AULIA NAWASENA (V2)
 * ============================================================================
 */

const SHEET_NAME = 'Orders';

const HEADERS = [
  'ID Pesanan',
  'Nama Pemesan',
  'Bidang / Bagian',
  'Model Potongan',
  'Nomor WhatsApp',
  'Ukuran',
  'Tipe Lengan',
  'Harga Dasar',
  'Biaya Lengan',
  'Biaya Ukuran',
  'Total Bayar',
  'Status',
  'Waktu Pesan',
  'Waktu Lunas',
  'Catatan'
];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1e3a8a');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headerRow = data[0];
    const headerMap = {};
    headerRow.forEach((h, i) => {
      headerMap[String(h).trim().toLowerCase()] = i;
    });

    const getCol = (names, fallbackIdx) => {
      for (let n of names) {
        if (headerMap[n.toLowerCase()] !== undefined) return headerMap[n.toLowerCase()];
      }
      return fallbackIdx;
    };

    const idIdx = getCol(['ID Pesanan', 'id'], 0);
    const nameIdx = getCol(['Nama Pemesan', 'nama', 'name'], 1);
    const divIdx = getCol(['Bidang / Bagian', 'Bidang/Bagian', 'division', 'bagian'], 2);
    const cutIdx = getCol(['Model Potongan', 'genderCut', 'cut'], 3);
    const phoneIdx = getCol(['Nomor WhatsApp', 'phone', 'wa', 'no hp'], 4);
    const sizeIdx = getCol(['Ukuran', 'size'], 5);
    const sleeveIdx = getCol(['Tipe Lengan', 'sleeve'], 6);
    const basePriceIdx = getCol(['Harga Dasar', 'basePrice'], 7);
    const sleeveExtraIdx = getCol(['Biaya Lengan', 'sleeveExtra'], 8);
    const sizeExtraIdx = getCol(['Biaya Ukuran', 'sizeExtra'], 9);
    const totalIdx = getCol(['Total Bayar', 'totalPrice', 'total'], 10);
    const statusIdx = getCol(['Status'], 11);
    const createdIdx = getCol(['Waktu Pesan', 'createdAt'], 12);
    const paidIdx = getCol(['Waktu Lunas', 'paidAt'], 13);
    const notesIdx = getCol(['Catatan', 'notes'], 14);

    const rows = data.slice(1);
    const orders = rows.map(r => {
      const rawCut = String(r[cutIdx] || '').toLowerCase();
      const genderCut = rawCut.includes('lad') ? 'ladies' : 'men';

      return {
        id: String(r[idIdx] || ''),
        name: String(r[nameIdx] || ''),
        division: String(r[divIdx] || 'Bagian Umum'),
        genderCut: genderCut,
        phone: String(r[phoneIdx] || ''),
        size: String(r[sizeIdx] || ''),
        sleeve: String(r[sleeveIdx] || ''),
        basePrice: Number(r[basePriceIdx] || 0),
        sleeveExtra: Number(r[sleeveExtraIdx] || 0),
        sizeExtra: Number(r[sizeExtraIdx] || 0),
        totalPrice: Number(r[totalIdx] || 0),
        status: String(r[statusIdx] || 'PENDING'),
        createdAt: r[createdIdx] ? String(r[createdIdx]) : '',
        paidAt: r[paidIdx] ? String(r[paidIdx]) : undefined,
        notes: r[notesIdx] ? String(r[notesIdx]) : undefined
      };
    });

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: orders }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    let contents = {};
    if (e && e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    }
    const action = contents.action;

    // 1. TAMBAH PESANAN BARU
    if (action === 'create') {
      const o = contents.order;
      const cutLabel = o.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men';
      sheet.appendRow([
        o.id,
        o.name,
        o.division || 'Bagian Umum',
        cutLabel,
        o.phone,
        o.size,
        o.sleeve,
        o.basePrice,
        o.sleeveExtra,
        o.sizeExtra,
        o.totalPrice,
        o.status,
        o.createdAt,
        o.paidAt || '',
        o.notes || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: o }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. UPDATE STATUS LUNAS
    if (action === 'updateStatus') {
      const { id, status, paidAt } = contents;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          // Cari kolom Status & Waktu Lunas dari header
          const headers = data[0];
          const statusCol = headers.findIndex(h => String(h).toLowerCase().includes('status')) + 1;
          const paidCol = headers.findIndex(h => String(h).toLowerCase().includes('lunas')) + 1;

          if (statusCol > 0) sheet.getRange(i + 1, statusCol).setValue(status);
          if (paidCol > 0) sheet.getRange(i + 1, paidCol).setValue(paidAt || '');

          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Pesanan tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. HAPUS PESANAN
    if (action === 'delete') {
      const { id } = contents;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Pesanan tidak ditemukan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. BATCH SYNC DARI DATA LOKAL KE SHEET (MEMPERBARUI FORMAT KOLOM)
    if (action === 'batchSync') {
      const orders = contents.orders || [];
      sheet.clear();
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('#ffffff');
      headerRange.setHorizontalAlignment('center');

      orders.forEach(o => {
        const cutLabel = o.genderCut === 'ladies' ? 'Ladies' : 'Reguler Men';
        sheet.appendRow([
          o.id,
          o.name,
          o.division || 'Bagian Umum',
          cutLabel,
          o.phone,
          o.size,
          o.sleeve,
          o.basePrice,
          o.sleeveExtra,
          o.sizeExtra,
          o.totalPrice,
          o.status,
          o.createdAt,
          o.paidAt || '',
          o.notes || ''
        ]);
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true, count: orders.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
