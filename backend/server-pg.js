const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, ensureInit } = require('./db-pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  try { await ensureInit(); next(); } catch (e) { console.error(e); res.status(500).json({ error: 'Database init gagal' }); }
});
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

async function logAktivitas(user, aksi, detail) {
  await pool.query('INSERT INTO activity_log ("user", aksi, detail) VALUES ($1,$2,$3)', [user, aksi, detail]);
}

// ===== AUTH =====
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });
  await logAktivitas(username, 'login', 'Berhasil login');
  res.json({ id: user.id, username: user.username, nama: user.nama, role: user.role });
});

// ===== AFDELING =====
app.get('/api/afdeling', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM afdeling ORDER BY nama_afdeling');
  res.json(rows);
});
app.post('/api/afdeling', async (req, res) => {
  const { nama_afdeling } = req.body;
  if (!nama_afdeling) return res.status(400).json({ error: 'Nama afdeling wajib diisi' });
  const { rows } = await pool.query('INSERT INTO afdeling (nama_afdeling) VALUES ($1) RETURNING id', [nama_afdeling]);
  res.json({ id: rows[0].id });
});

// ===== BLOK =====
app.get('/api/blok', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT blok.*, afdeling.nama_afdeling FROM blok
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    ORDER BY afdeling.nama_afdeling, blok.nama_blok
  `);
  res.json(rows);
});
app.post('/api/blok', async (req, res) => {
  const { nama_blok, afdeling_id, luas_ha } = req.body;
  if (!nama_blok || !afdeling_id) return res.status(400).json({ error: 'Nama blok dan afdeling wajib diisi' });
  const { rows } = await pool.query(
    'INSERT INTO blok (nama_blok, afdeling_id, luas_ha) VALUES ($1,$2,$3) RETURNING id',
    [nama_blok, afdeling_id, luas_ha || null]
  );
  res.json({ id: rows[0].id });
});
app.delete('/api/blok/:id', async (req, res) => {
  await pool.query('DELETE FROM blok WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ===== PENYADAP =====
app.get('/api/penyadap', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT penyadap.*, blok.nama_blok, afdeling.nama_afdeling FROM penyadap
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    ORDER BY penyadap.nama
  `);
  res.json(rows);
});
app.post('/api/penyadap', async (req, res) => {
  const { nama, nik, blok_id } = req.body;
  if (!nama || !blok_id) return res.status(400).json({ error: 'Nama dan blok wajib diisi' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO penyadap (nama, nik, blok_id) VALUES ($1,$2,$3) RETURNING id',
      [nama, nik || null, blok_id]
    );
    res.json({ id: rows[0].id });
  } catch (e) {
    res.status(400).json({ error: 'NIK sudah terdaftar' });
  }
});
app.put('/api/penyadap/:id', async (req, res) => {
  const { nama, nik, blok_id, status } = req.body;
  await pool.query('UPDATE penyadap SET nama=$1, nik=$2, blok_id=$3, status=$4 WHERE id=$5',
    [nama, nik, blok_id, status || 'aktif', req.params.id]);
  res.json({ success: true });
});
app.delete('/api/penyadap/:id', async (req, res) => {
  await pool.query('DELETE FROM penyadap WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ===== CATATAN SADAP =====
app.get('/api/catatan', async (req, res) => {
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
  if (tanggal_awal) { params.push(tanggal_awal); query += ` AND catatan_sadap.tanggal >= $${params.length}`; }
  if (tanggal_akhir) { params.push(tanggal_akhir); query += ` AND catatan_sadap.tanggal <= $${params.length}`; }
  if (blok_id) { params.push(blok_id); query += ` AND blok.id = $${params.length}`; }
  if (penyadap_id) { params.push(penyadap_id); query += ` AND penyadap.id = $${params.length}`; }
  query += ' ORDER BY catatan_sadap.tanggal DESC, penyadap.nama';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/api/catatan', async (req, res) => {
  const { penyadap_id, tanggal, berat_kg, keterangan, user } = req.body;
  if (!penyadap_id || !tanggal || berat_kg === undefined) {
    return res.status(400).json({ error: 'Penyadap, tanggal, dan berat wajib diisi' });
  }
  if (berat_kg < 0) return res.status(400).json({ error: 'Berat tidak boleh negatif' });
  const { rows } = await pool.query(
    'INSERT INTO catatan_sadap (penyadap_id, tanggal, berat_kg, keterangan) VALUES ($1,$2,$3,$4) RETURNING id',
    [penyadap_id, tanggal, berat_kg, keterangan || null]
  );
  await logAktivitas(user || 'system', 'tambah_catatan', `Input ${berat_kg}kg untuk penyadap #${penyadap_id} tgl ${tanggal}`);
  res.json({ id: rows[0].id });
});

app.put('/api/catatan/:id', async (req, res) => {
  const { berat_kg, keterangan, user } = req.body;
  await pool.query('UPDATE catatan_sadap SET berat_kg=$1, keterangan=$2 WHERE id=$3',
    [berat_kg, keterangan || null, req.params.id]);
  await logAktivitas(user || 'system', 'edit_catatan', `Edit catatan #${req.params.id}`);
  res.json({ success: true });
});

app.delete('/api/catatan/:id', async (req, res) => {
  const { user } = req.query;
  await pool.query('DELETE FROM catatan_sadap WHERE id=$1', [req.params.id]);
  await logAktivitas(user || 'system', 'hapus_catatan', `Hapus catatan #${req.params.id}`);
  res.json({ success: true });
});

// ===== REKAP / DASHBOARD =====
app.get('/api/rekap/harian', async (req, res) => {
  const t = req.query.tanggal || new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(`
    SELECT afdeling.nama_afdeling, SUM(catatan_sadap.berat_kg) as total_kg, COUNT(DISTINCT penyadap.id) as jumlah_penyadap
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    WHERE catatan_sadap.tanggal = $1
    GROUP BY afdeling.id, afdeling.nama_afdeling
  `, [t]);
  const totalRes = await pool.query('SELECT COALESCE(SUM(berat_kg),0) as total FROM catatan_sadap WHERE tanggal=$1', [t]);
  res.json({
    tanggal: t,
    per_afdeling: rows.map(r => ({ ...r, total_kg: parseFloat(r.total_kg), jumlah_penyadap: parseInt(r.jumlah_penyadap) })),
    total_kg: parseFloat(totalRes.rows[0].total)
  });
});

app.get('/api/rekap/tren', async (req, res) => {
  const jumlahHari = parseInt(req.query.hari) || 14;
  const { rows } = await pool.query(`
    SELECT tanggal, SUM(berat_kg) as total_kg
    FROM catatan_sadap
    WHERE tanggal >= CURRENT_DATE - INTERVAL '1 day' * $1
    GROUP BY tanggal
    ORDER BY tanggal
  `, [jumlahHari]);
  res.json(rows.map(r => ({ tanggal: r.tanggal.toISOString().slice(0,10), total_kg: parseFloat(r.total_kg) })));
});

app.get('/api/rekap/upah', async (req, res) => {
  const { tanggal_awal, tanggal_akhir } = req.query;
  const hargaRes = await pool.query('SELECT harga_per_kg FROM pengaturan_upah ORDER BY berlaku_mulai DESC LIMIT 1');
  const hargaPerKg = hargaRes.rows[0] ? parseFloat(hargaRes.rows[0].harga_per_kg) : 8000;
  const { rows } = await pool.query(`
    SELECT penyadap.id, penyadap.nama, penyadap.nik, blok.nama_blok,
      SUM(catatan_sadap.berat_kg) as total_kg
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    WHERE catatan_sadap.tanggal BETWEEN $1 AND $2
    GROUP BY penyadap.id, penyadap.nama, penyadap.nik, blok.nama_blok
    ORDER BY total_kg DESC
  `, [tanggal_awal, tanggal_akhir]);
  const hasil = rows.map(r => {
    const totalKg = parseFloat(r.total_kg);
    return { ...r, total_kg: totalKg, harga_per_kg: hargaPerKg, total_upah: totalKg * hargaPerKg };
  });
  res.json({ harga_per_kg: hargaPerKg, data: hasil });
});

app.get('/api/pengaturan-upah', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pengaturan_upah ORDER BY berlaku_mulai DESC');
  res.json(rows);
});
app.post('/api/pengaturan-upah', async (req, res) => {
  const { harga_per_kg, berlaku_mulai } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO pengaturan_upah (harga_per_kg, berlaku_mulai) VALUES ($1,$2) RETURNING id',
    [harga_per_kg, berlaku_mulai]
  );
  res.json({ id: rows[0].id });
});

// ===== EXPORT CSV =====
app.get('/api/export/csv', async (req, res) => {
  const tanggal_awal = req.query.tanggal_awal || '0001-01-01';
  const tanggal_akhir = req.query.tanggal_akhir || '9999-12-31';
  const { rows } = await pool.query(`
    SELECT catatan_sadap.tanggal, penyadap.nama, penyadap.nik, blok.nama_blok, afdeling.nama_afdeling, catatan_sadap.berat_kg, catatan_sadap.keterangan
    FROM catatan_sadap
    JOIN penyadap ON catatan_sadap.penyadap_id = penyadap.id
    JOIN blok ON penyadap.blok_id = blok.id
    JOIN afdeling ON blok.afdeling_id = afdeling.id
    WHERE catatan_sadap.tanggal BETWEEN $1 AND $2
    ORDER BY catatan_sadap.tanggal, afdeling.nama_afdeling
  `, [tanggal_awal, tanggal_akhir]);

  let csv = 'Tanggal,Nama Penyadap,NIK,Blok,Afdeling,Berat (kg),Keterangan\n';
  rows.forEach(r => {
    const tgl = r.tanggal.toISOString().slice(0,10);
    csv += `${tgl},"${r.nama}",${r.nik || ''},${r.nama_blok},${r.nama_afdeling},${r.berat_kg},"${r.keterangan || ''}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-sadap-${tanggal_awal}_${tanggal_akhir}.csv`);
  res.send(csv);
});

// ===== USERS =====
app.get('/api/users', async (req, res) => {
  const { rows } = await pool.query('SELECT id, username, nama, role FROM users ORDER BY id');
  res.json(rows);
});
app.post('/api/users', async (req, res) => {
  const { username, password, nama, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, password, nama, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [username, password, nama || null, role || 'petugas']
    );
    res.json({ id: rows[0].id });
  } catch (e) {
    res.status(400).json({ error: 'Username sudah dipakai' });
  }
});
app.delete('/api/users/:id', async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ===== ACTIVITY LOG =====
app.get('/api/activity-log', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM activity_log ORDER BY waktu DESC LIMIT 100');
  res.json(rows);
});

// Jalankan sebagai server biasa jika bukan di lingkungan Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`E-Rubber Weight server berjalan di http://localhost:${PORT}`));
}

module.exports = app;
