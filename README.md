# Aplikasi Pemesanan Jersey Komunitas Kantor (Dengan Pembayaran QRIS)

Aplikasi web ringan untuk mengakomodir pemesanan jersey kolektif internal kantor dengan mekanisme pembayaran mandiri via QRIS.

## 🚀 Fitur Utama

1. **Form Pemesanan Mandiri (`/`)**:
   - Input Nama Lengkap & Divisi
   - Input Nomor WhatsApp / HP Aktif
   - Pilihan Tipe Lengan (Lengan Pendek / Lengan Panjang)
   - Pilihan Ukuran Baju (S, M, L, XL, XXL, 3XL, 4XL) dilengkapi panduan size chart
   - Catatan Tambahan (misal nama punggung/nomor jika ada)

2. **Kalkulator Biaya Otomatis (Live Calculation)**:
   - Lengan Pendek (S, M, L, XL): **Rp 100.000**
   - Lengan Panjang (S, M, L, XL): **Rp 120.000** (Tambahan +Rp 20.000)
   - Ukuran Jumbo (XXL, 3XL, 4XL): **Tambahan +Rp 10.000**
     - *Contoh: XXL Pendek = Rp 110.000, XXL Panjang = Rp 130.000*

3. **Simulasi Pembayaran QRIS Interaktif**:
   - Menampilkan antarmuka QRIS standar lengkap dengan QR Code yang dinamis.
   - Dilengkapi tombol interaktif **"🟢 Simulasikan Bayar Berhasil"** untuk menguji alur pembayaran tanpa memerlukan akun Midtrans di tahap awal.
   - Setelah sukses, status otomatis menjadi **LUNAS** dan struk pembayaran digital muncul.

4. **Dashboard & Rekapitulasi Koordinator (`/rekap`)**:
   - Metrik ringkasan: Total pesanan, total dana terkumpul (lunas), dan jumlah pesanan yang belum bayar.
   - **Tabel Rekap Vendor Konveksi**: Matriks jumlah pcs per ukuran dan jenis lengan (S, M, L, XL, XXL, 3XL, 4XL).
   - **Salin Rekap ke WhatsApp**: Satu kali klik untuk menyalin format pesan teks siap kirim ke vendor konveksi.
   - **Unduh CSV / Excel**: Ekspor data seluruh pesanan untuk diolah di spreadsheet.
   - Manajemen Pesanan: Tandai lunas manual (jika bayar tunai), lihat QRIS kembali, atau hapus pesanan.

---

## 💻 Cara Menjalankan Aplikasi

Buka terminal di folder `C:\Users\drrac\jersey-order-app` dan jalankan:

```bash
npm run dev
```

Buka browser di:
👉 **[http://localhost:3000](http://localhost:3000)** (Form Pemesanan)  
👉 **[http://localhost:3000/rekap](http://localhost:3000/rekap)** (Halaman Rekap Koordinator)

---

## 🗄️ Penyimpanan Data

Data pesanan tersimpan secara otomatis dan aman dalam file:
`data/orders.json`

File ini dapat dibackup, dipindahkan, atau diedit sewaktu-waktu dengan mudah.
