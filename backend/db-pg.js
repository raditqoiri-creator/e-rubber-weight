const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS afdeling (
      id SERIAL PRIMARY KEY,
      nama_afdeling TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS blok (
      id SERIAL PRIMARY KEY,
      nama_blok TEXT NOT NULL,
      afdeling_id INTEGER NOT NULL REFERENCES afdeling(id),
      luas_ha REAL
    );

    CREATE TABLE IF NOT EXISTS penyadap (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      nik TEXT UNIQUE,
      blok_id INTEGER NOT NULL REFERENCES blok(id),
      status TEXT DEFAULT 'aktif'
    );

    CREATE TABLE IF NOT EXISTS catatan_sadap (
      id SERIAL PRIMARY KEY,
      penyadap_id INTEGER NOT NULL REFERENCES penyadap(id),
      tanggal DATE NOT NULL,
      berat_kg REAL NOT NULL,
      keterangan TEXT,
      dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pengaturan_upah (
      id SERIAL PRIMARY KEY,
      harga_per_kg REAL NOT NULL,
      berlaku_mulai DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nama TEXT,
      role TEXT DEFAULT 'petugas'
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      "user" TEXT,
      aksi TEXT,
      detail TEXT,
      waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const { rows: userRows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(userRows[0].count) === 0) {
    const hashedDefault = bcrypt.hashSync('admin123', 10);
    await pool.query(
      'INSERT INTO users (username, password, nama, role) VALUES ($1,$2,$3,$4)',
      ['admin', hashedDefault, 'Administrator', 'admin']
    );
  }

  const { rows: hargaRows } = await pool.query('SELECT COUNT(*) FROM pengaturan_upah');
  if (parseInt(hargaRows[0].count) === 0) {
    await pool.query(
      'INSERT INTO pengaturan_upah (harga_per_kg, berlaku_mulai) VALUES ($1,$2)',
      [8000, new Date().toISOString().slice(0, 10)]
    );
  }
}

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

module.exports = { pool, ensureInit };
