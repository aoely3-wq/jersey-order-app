/**
 * Modul Generator QRIS Resmi Bank Indonesia (ASPI / EMVCo)
 * Menggunakan QRIS Resmi DOKU: Jersey Kanwil DJPb Babel (NMID: ID1026636092060)
 * Acquirer: DOKU / PT Nusa Satu Inti Artha (93600899)
 */

export const DOKU_STATIC_QRIS =
  '00020101021126550012COM.DOKU.WWW011893600899000011716102061171610303UKE51440014ID.CO.QRIS.WWW0215ID10266360920600303UKE5204594153033605802ID5924Jersey Kanwil DJPb Babel6009TANGERANG61051515462070703A01630498C6';

export const QRIS_MERCHANT_NAME = 'Jersey Kanwil DJPb Babel';
export const QRIS_NMID = 'ID1026636092060';

/**
 * Menghitung Checksum CRC16 CCITT-FALSE standar EMVCo / ASPI QRIS
 */
export function crc16(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Mengonversi QRIS Statis DOKU menjadi QRIS Dinamis dengan nominal tagihan otomatis.
 * Saat di-scan menggunakan m-BCA, Livin Mandiri, BRImo, BNI, GoPay, OVO, ShopeePay, DANA, dll.,
 * nominal transfer sudah otomatis terisi dan terkunci sesuai harga pesanan jersey!
 */
export function generateDynamicQris(amount: number): string {
  if (!amount || amount <= 0) {
    return DOKU_STATIC_QRIS;
  }

  // Hapus 4 karakter CRC lama di akhir string
  let qris = DOKU_STATIC_QRIS.slice(0, -4);

  // Ubah Tag 01 (Point of Initiation Method) dari '010211' (Statis) menjadi '010212' (Dinamis)
  qris = qris.replace('010211', '010212');

  // Format Tag 54 (Transaction Amount)
  const amountStr = Math.round(amount).toString();
  const tag54 = '54' + amountStr.length.toString().padStart(2, '0') + amountStr;

  // Sisipkan Tag 54 tepat setelah Tag 53 (Mata Uang IDR: 5303360)
  const currencyTag = '5303360';
  const currencyIndex = qris.indexOf(currencyTag);

  if (currencyIndex !== -1) {
    const insertPosition = currencyIndex + currencyTag.length;
    qris = qris.slice(0, insertPosition) + tag54 + qris.slice(insertPosition);
  }

  // Hitung ulang checksum CRC16 standar EMVCo
  const newCrc = crc16(qris);
  return qris + newCrc;
}
