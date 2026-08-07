# E-Rubber Weight
Aplikasi Pencatatan Hasil Sadap Lateks Harian
PTPN IV Regional I - Kebun Bandar Betsy

## Cara Menjalankan
1. Pastikan Node.js sudah terinstal (v18 ke atas)
2. Buka folder `backend`, jalankan:
   ```
   npm install
   node server.js
   ```
3. Buka browser ke: http://localhost:3001
4. Login default: username `admin`, password `admin123`

## Struktur Folder
- `backend/` — server Express.js + database SQLite (better-sqlite3)
- `frontend/public/` — halaman web (HTML, Bootstrap, Chart.js)

## Alur Penggunaan
1. Login
2. Data Master → tambahkan Afdeling, Blok, dan Penyadap terlebih dahulu
3. Input Sadap → catat hasil sadap harian per penyadap
4. Dashboard → lihat ringkasan produksi harian & tren 14 hari
5. Rekap Upah → hitung total upah berdasarkan berat x harga/kg, bisa export CSV
6. Riwayat & Log → lihat riwayat catatan dan audit trail aktivitas sistem

## Catatan
Harga per kg default: Rp 8.000 (bisa diubah di menu Rekap Upah → Atur Harga/kg)
Database tersimpan lokal (file erubberweight.db), tidak butuh koneksi internet
untuk operasional harian — cocok dipakai di jaringan lokal kantor kebun.

## Status
Prototipe fungsional — sudah diuji coba secara teknis (seluruh alur input,
rekap, validasi, dan export berjalan sesuai rancangan). Belum melalui
uji coba/UAT oleh pengguna nyata di lapangan.
