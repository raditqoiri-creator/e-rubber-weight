const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

function logAktivitas(user, aksi, detail) {
  db.prepare('INSERT INTO activity_log (user, aksi, detail) VALUES (?,?,?)').run(user, aksi, detail);
}

// ===== AUTH =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });

  const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
  let valid = false;
  if (isHashed) {
    valid = bcrypt.compareSync(password, user.password);
  } else {
    valid = user.password === password;
    if (valid) {
      const newHash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password=? WHERE id=?').run(newHash, user.id);
    }
  }
  if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

  logAktivitas(username, 'login', 'Berhasil login');
  res.json({ id: user.id, username: user.username, nama: user.nama, role: user.role });
});

// ===== GANTI PASSWORD =====
app.post('/api/ganti-password', (req, res) => {
  const { user_id, password_lama, password_baru } = req.body;
  if (!user_id || !password_baru) return res.status(400).json({ error: 'Data tidak lengkap' });
  if (password_baru.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(user_id);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

  const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
  const cocokLama = isHashed ? bcrypt.compareSync(password_lama, user.password) : user.password === password_lama;
  if (!cocokLama) return res.status(401).json({ error: 'Password lama tidak sesuai' });

  const newHash = bcrypt.hashSync(password_baru, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(newHash, user_id);
  logAktivitas(user.username, 'ganti_password', 'Password berhasil diubah');
  res.json({ success: true });
});

app.post('/api/reset-password/:id', (req, res) => {
  const { password_baru, admin_user } = req.body;
  if (!password_baru || password_baru.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
  const newHash = bcrypt.hashSync(password_baru, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(newHash, req.params.id);
  logAktivitas(admin_user || 'admin', 'reset_password', `Reset password untuk user #${req.params.id}`);
  res.json({ success: true });
});

// ===== AFDELING =====
app.get('/api/afdeling', (req, res) => {
  res.json(db.prepare('SELECT * FROM afdeling ORDER BY nama_afdeling').all());
});
app.post('/api/afdeling', (req, res) => {
  const { nama_afdeling } = req.body;
  if (!nama_afdeling) return res.status(400).json({ error: 'Nama afdeling wajib diisi' });
  const info = db.prepare('INSERT INTO afdeling (nama_afdeling) VALUES (?)').run(nama_afdeling);
  res.json({ id: info.lastInsertRowid });
});

// ===== BLOK =====
app.get('/api/blok', (req, res) => {
  res.json(db.prepare(`
    SELECT blok.*, afdeling.nama_afdeling FROM blok
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    ORDER BY afdeling.nama_afdeling, blok.nama_blok
  `).all());
});
app.post('/api/blok', (req, res) => {
  const { nama_blok, afdeling_id, luas_ha } = req.body;
  if (!nama_blok || !afdeling_id) return res.status(400).json({ error: 'Nama blok dan afdeling wajib diisi' });
  const info = db.prepare('INSERT INTO blok (nama_blok, afdeling_id, luas_ha) VALUES (?,?,?)')
    .run(nama_blok, afdeling_id, luas_ha || null);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/blok/:id', (req, res) => {
  db.prepare('DELETE FROM blok WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ===== PENYADAP =====
app.get('/api/penyadap', (req, res) => {
  res.json(db.prepare(`
    SELECT penyadap.*, blok.nama_blok, afdeling.nama_afdeling FROM penyadap
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    ORDER BY penyadap.nama
  `).all());
});
app.post('/api/penyadap', (req, res) => {
  const { nama, nik, blok_id } = req.body;
  if (!nama || !blok_id) return res.status(400).json({ error: 'Nama dan blok wajib diisi' });
  try {
    const info = db.prepare('INSERT INTO penyadap (nama, nik, blok_id) VALUES (?,?,?)')
      .run(nama, nik || null, blok_id);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'NIK sudah terdaftar' });
  }
});
app.put('/api/penyadap/:id', (req, res) => {
  const { nama, nik, blok_id, status } = req.body;
  db.prepare('UPDATE penyadap SET nama=?, nik=?, blok_id=?, status=? WHERE id=?')
    .run(nama, nik, blok_id, status || 'aktif', req.params.id);
  res.json({ success: true });
});
app.delete('/api/penyadap/:id', (req, res) => {
  db.prepare('DELETE FROM penyadap WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ===== CATATAN SADAP =====
app.get('/api/catatan', (req, res) => {
  const { tanggal_awal, tanggal_akhir, blok_id, penyadap_id } = req.query;
  let query = `
    SELECT catatan_sadap.*, penyadap.nama as nama_penyadap, blok.nama_blok, afdeling.nama_afdeling
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    WHERE 1=1
  `;
  const params = [];
  if (tanggal_awal) { query += ' AND catatan_sadap.tanggal >= ?'; params.push(tanggal_awal); }
  if (tanggal_akhir) { query += ' AND catatan_sadap.tanggal <= ?'; params.push(tanggal_akhir); }
  if (blok_id) { query += ' AND blok.id = ?'; params.push(blok_id); }
  if (penyadap_id) { query += ' AND penyadap.id = ?'; params.push(penyadap_id); }
  query += ' ORDER BY catatan_sadap.tanggal DESC, penyadap.nama';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/catatan', (req, res) => {
  const { penyadap_id, tanggal, berat_kg, keterangan, user } = req.body;
  if (!penyadap_id || !tanggal || berat_kg === undefined) {
    return res.status(400).json({ error: 'Penyadap, tanggal, dan berat wajib diisi' });
  }
  if (berat_kg < 0) return res.status(400).json({ error: 'Berat tidak boleh negatif' });
  const info = db.prepare('INSERT INTO catatan_sadap (penyadap_id, tanggal, berat_kg, keterangan) VALUES (?,?,?,?)')
    .run(penyadap_id, tanggal, berat_kg, keterangan || null);
  logAktivitas(user || 'system', 'tambah_catatan', `Input ${berat_kg}kg untuk penyadap #${penyadap_id} tgl ${tanggal}`);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/catatan/:id', (req, res) => {
  const { berat_kg, keterangan, user } = req.body;
  db.prepare('UPDATE catatan_sadap SET berat_kg=?, keterangan=? WHERE id=?')
    .run(berat_kg, keterangan || null, req.params.id);
  logAktivitas(user || 'system', 'edit_catatan', `Edit catatan #${req.params.id}`);
  res.json({ success: true });
});

app.delete('/api/catatan/:id', (req, res) => {
  const { user } = req.query;
  db.prepare('DELETE FROM catatan_sadap WHERE id=?').run(req.params.id);
  logAktivitas(user || 'system', 'hapus_catatan', `Hapus catatan #${req.params.id}`);
  res.json({ success: true });
});

// ===== REKAP / DASHBOARD =====
app.get('/api/rekap/harian', (req, res) => {
  const { tanggal } = req.query;
  const t = tanggal || new Date().toISOString().slice(0,10);
  const rows = db.prepare(`
    SELECT afdeling.nama_afdeling, SUM(catatan_sadap.berat_kg) as total_kg, COUNT(DISTINCT penyadap.id) as jumlah_penyadap
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    WHERE catatan_sadap.tanggal = ?
    GROUP BY afdeling.id
  `).all(t);
  const totalKeseluruhan = db.prepare('SELECT COALESCE(SUM(berat_kg),0) as total FROM catatan_sadap WHERE tanggal=?').get(t).total;
  res.json({ tanggal: t, per_afdeling: rows, total_kg: totalKeseluruhan });
});

app.get('/api/rekap/tren', (req, res) => {
  const { hari } = req.query;
  const jumlahHari = parseInt(hari) || 14;
  const rows = db.prepare(`
    SELECT tanggal, SUM(berat_kg) as total_kg
    FROM catatan_sadap
    WHERE tanggal >= date('now', '-' || ? || ' days')
    GROUP BY tanggal
    ORDER BY tanggal
  `).all(jumlahHari);
  res.json(rows);
});

app.get('/api/rekap/upah', (req, res) => {
  const { tanggal_awal, tanggal_akhir } = req.query;
  const harga = db.prepare('SELECT harga_per_kg FROM pengaturan_upah ORDER BY berlaku_mulai DESC LIMIT 1').get();
  const hargaPerKg = harga ? harga.harga_per_kg : 8000;
  const rows = db.prepare(`
    SELECT penyadap.id, penyadap.nama, penyadap.nik, blok.nama_blok,
      SUM(catatan_sadap.berat_kg) as total_kg
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    WHERE catatan_sadap.tanggal BETWEEN ? AND ?
    GROUP BY penyadap.id
    ORDER BY total_kg DESC
  `).all(tanggal_awal, tanggal_akhir);
  const hasil = rows.map(r => ({ ...r, harga_per_kg: hargaPerKg, total_upah: r.total_kg * hargaPerKg }));
  res.json({ harga_per_kg: hargaPerKg, data: hasil });
});

app.get('/api/pengaturan-upah', (req, res) => {
  res.json(db.prepare('SELECT * FROM pengaturan_upah ORDER BY berlaku_mulai DESC').all());
});
app.post('/api/pengaturan-upah', (req, res) => {
  const { harga_per_kg, berlaku_mulai } = req.body;
  const info = db.prepare('INSERT INTO pengaturan_upah (harga_per_kg, berlaku_mulai) VALUES (?,?)')
    .run(harga_per_kg, berlaku_mulai);
  res.json({ id: info.lastInsertRowid });
});

// ===== EXPORT CSV =====
app.get('/api/export/csv', (req, res) => {
  const { tanggal_awal, tanggal_akhir } = req.query;
  const rows = db.prepare(`
    SELECT catatan_sadap.tanggal, penyadap.nama, penyadap.nik, blok.nama_blok, afdeling.nama_afdeling, catatan_sadap.berat_kg, catatan_sadap.keterangan
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    WHERE catatan_sadap.tanggal BETWEEN ? AND ?
    ORDER BY catatan_sadap.tanggal, afdeling.nama_afdeling
  `).all(tanggal_awal || '0000-01-01', tanggal_akhir || '9999-12-31');

  let csv = 'Tanggal,Nama Penyadap,NIK,Blok,Afdeling,Berat (kg),Keterangan\n';
  rows.forEach(r => {
    csv += `${r.tanggal},"${r.nama}",${r.nik || ''},${r.nama_blok},${r.nama_afdeling},${r.berat_kg},"${r.keterangan || ''}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-sadap-${tanggal_awal}_${tanggal_akhir}.csv`);
  res.send(csv);
});

// ===== USERS =====
app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT id, username, nama, role FROM users ORDER BY id').all());
});
app.post('/api/users', (req, res) => {
  const { username, password, nama, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
  if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
  try {
    const hashed = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (username, password, nama, role) VALUES (?,?,?,?)')
      .run(username, hashed, nama || null, role || 'petugas');
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'Username sudah dipakai' });
  }
});
app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ===== ACTIVITY LOG =====
app.get('/api/activity-log', (req, res) => {
  res.json(db.prepare('SELECT * FROM activity_log ORDER BY waktu DESC LIMIT 100').all());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`E-Rubber Weight server berjalan di http://localhost:${PORT}`));
