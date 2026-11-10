/**
 * ============================================================================
 * GOOGLE APPS SCRIPT - DATABASE PESANAN JERSEY AULIA NAWASENA
 * ============================================================================
 * 
 * CARA PEMASANGAN DI GOOGLE SPREADSHEET:
 * 1. Buat spreadsheet baru di Google Drive (https://sheets.new)
 * 2. Beri nama file: "Database Pesanan Jersey Aulia NAWASENA"
 * 3. Buka menu: Ekstensi (Extensions) > Apps Script
 * 4. Hapus semua kode default di Apps Script, lalu PASTE kode di bawah ini.
 * 5. Klik "Simpan" (ikon disket / Ctrl+S).
 * 6. Klik tombol "Terapkan" (Deploy) di kanan atas > "Penerapan baru" (New deployment).
 * 7. Pada ikon gerigi "Pilih jenis", pilih "Aplikasi web" (Web app).
 * 8. Atur konfigurasi:
 *    - Deskripsi : API Database Jersey
 *    - Jalankan sebagai (Execute as) : Saya (akun Google Anda)
 *    - Siapa yang memiliki akses (Who has access) : Siapa saja (Anyone) -> PENTING!
 * 9. Klik "Terapkan" (Deploy).
 * 10. Jika muncul "Otorisasi akses", klik "Tinjau izin", pilih akun Google Anda,
 *     klik "Lanjutan (Advanced)" > "Buka Database (tidak aman)", lalu klik "Izinkan".
 * 11. Salin "URL Aplikasi Web" (contoh: https://script.google.com/macros/s/AKfycby.../exec).
 * 12. Masukkan URL tersebut ke file .env.local dan Environment Variables Vercel sebagai:
 *     GOOGLE_SHEET_URL="https://script.google.com/macros/s/.../exec"
 */

const SHEET_NAME = 'Orders';

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Buat Header Kolom yang rapi
    const headers = [
      'ID Pesanan',
      'Nama Pemesan',
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
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    
    // Format Header Biru Elegan
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
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
    
    const rows = data.slice(1);
    const orders = rows.map(r => {
      return {
        id: String(r[0] || ''),
        name: String(r[1] || ''),
        phone: String(r[2] || ''),
        size: String(r[3] || ''),
        sleeve: String(r[4] || ''),
        basePrice: Number(r[5] || 0),
        sleeveExtra: Number(r[6] || 0),
        sizeExtra: Number(r[7] || 0),
        totalPrice: Number(r[8] || 0),
        status: String(r[9] || 'PENDING'),
        createdAt: r[10] ? String(r[10]) : '',
        paidAt: r[11] ? String(r[11]) : undefined,
        notes: r[12] ? String(r[12]) : undefined
      };
    });
    
    // Sort descending berdasarkan waktu pembuatan
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
      const order = contents.order;
      sheet.appendRow([
        order.id,
        order.name,
        order.phone,
        order.size,
        order.sleeve,
        order.basePrice,
        order.sleeveExtra,
        order.sizeExtra,
        order.totalPrice,
        order.status,
        order.createdAt,
        order.paidAt || '',
        order.notes || ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: order }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. UPDATE STATUS PESANAN (MISAL: PAID / LUNAS)
    if (action === 'updateStatus') {
      const { id, status, paidAt } = contents;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          sheet.getRange(i + 1, 10).setValue(status); // Kolom J: Status
          sheet.getRange(i + 1, 12).setValue(paidAt || ''); // Kolom L: Waktu Lunas
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

    // 4. SINKRONISASI MASSAL (BATCH SYNC DARI LOCAL JSON KE SHEET)
    if (action === 'batchSync') {
      const orders = contents.orders || [];
      if (sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
      orders.forEach(order => {
        sheet.appendRow([
          order.id,
          order.name,
          order.phone,
          order.size,
          order.sleeve,
          order.basePrice,
          order.sleeveExtra,
          order.sizeExtra,
          order.totalPrice,
          order.status,
          order.createdAt,
          order.paidAt || '',
          order.notes || ''
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, count: orders.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Aksi tidak dikenali' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
