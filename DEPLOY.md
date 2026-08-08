# Panduan Deploy E-Rubber Weight (Gratis: Vercel + Supabase)

Semua langkah di bawah gratis, tanpa kartu kredit.

---

## Langkah 1 — Buat Database di Supabase

1. Buka https://supabase.com → **Sign up** (bisa pakai akun GitHub)
2. Klik **New Project**
   - Nama project: `e-rubber-weight` (bebas)
   - Buat password database → **catat/simpan password ini baik-baik**
   - Pilih region terdekat (Singapore paling dekat ke Indonesia)
3. Tunggu 1-2 menit sampai project siap
4. Masuk ke **Project Settings (ikon gerigi) → Database**
5. Di bagian **Connection String**, pilih tab **URI**, mode **Session pooler** atau **Transaction pooler**
6. Copy connection string-nya, formatnya seperti:
   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
7. Ganti `[YOUR-PASSWORD]` dengan password yang kamu buat di langkah 2

Simpan connection string lengkap ini — nanti dipakai di langkah 3.

---

## Langkah 2 — Push Kode ke GitHub

Jalankan di terminal, dari folder `e-rubber-weight`:

```bash
git init
git add .
git commit -m "Initial commit - E-Rubber Weight"
```

Lalu buat repo baru di https://github.com/new (nama bebas, misal `e-rubber-weight`, jangan centang "Add README"), lalu jalankan perintah yang muncul di GitHub, biasanya:

```bash
git remote add origin https://github.com/USERNAME/e-rubber-weight.git
git branch -M main
git push -u origin main
```

---

## Langkah 3 — Deploy ke Vercel

1. Buka https://vercel.com → **Sign up** pakai akun GitHub (kalau belum punya)
2. Klik **Add New → Project**
3. Pilih repo `e-rubber-weight` yang baru di-push
4. Di bagian **Environment Variables**, tambahkan:
   - Key: `DATABASE_URL`
   - Value: connection string dari Supabase (langkah 1)
5. Klik **Deploy**
6. Tunggu proses build selesai (~1-2 menit)
7. Vercel akan kasih URL seperti `https://e-rubber-weight-xxxx.vercel.app`

---

## Langkah 4 — Cek Hasil Deploy

1. Buka URL yang diberikan Vercel
2. Login dengan `admin` / `admin123`
3. Coba tambah afdeling/blok/penyadap, input catatan sadap — pastikan semua tersimpan
4. Buka Supabase → **Table Editor**, cek apakah data yang kamu input tadi muncul di tabel `catatan_sadap`, dll — ini konfirmasi data benar-benar tersimpan di database cloud, bukan sementara

---

## Setelah Deploy

- Aplikasi aktif 24 jam, bisa diakses dari HP/laptop mana saja via URL Vercel (nggak perlu laptop kamu nyala)
- Kalau ada perubahan kode nanti, cukup `git push` lagi — Vercel otomatis re-deploy
- Ganti password admin default (`admin123`) sebelum dipakai serius — bisa lewat Supabase Table Editor, edit langsung baris di tabel `users`

## Batas Gratisan (untuk diketahui, bukan masalah untuk skala proyek ini)
- Supabase free tier: database dijeda otomatis kalau tidak ada aktivitas selama 7 hari berturut-turut (tinggal buka dashboard Supabase untuk mengaktifkan lagi)
- Vercel free tier: cukup untuk trafik skala kecil-menengah seperti proyek magang/skripsi
