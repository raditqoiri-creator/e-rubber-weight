const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'erubberweight.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS afdeling (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_afdeling TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS blok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_blok TEXT NOT NULL,
  afdeling_id INTEGER NOT NULL,
  luas_ha REAL,
  FOREIGN KEY (afdeling_id) REFERENCES afdeling(id)
);

CREATE TABLE IF NOT EXISTS penyadap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  nik TEXT UNIQUE,
  blok_id INTEGER NOT NULL,
  status TEXT DEFAULT 'aktif',
  FOREIGN KEY (blok_id) REFERENCES blok(id)
);

CREATE TABLE IF NOT EXISTS catatan_sadap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  penyadap_id INTEGER NOT NULL,
  tanggal TEXT NOT NULL,
  berat_kg REAL NOT NULL,
  keterangan TEXT,
  dibuat_pada TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (penyadap_id) REFERENCES penyadap(id)
);

CREATE TABLE IF NOT EXISTS pengaturan_upah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  harga_per_kg REAL NOT NULL,
  berlaku_mulai TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nama TEXT,
  role TEXT DEFAULT 'petugas'
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT,
  aksi TEXT,
  detail TEXT,
  waktu TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Seed default admin user & harga upah jika kosong
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const hashedDefault = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, nama, role) VALUES (?,?,?,?)')
    .run('admin', hashedDefault, 'Administrator', 'admin');
}
const hargaCount = db.prepare('SELECT COUNT(*) as c FROM pengaturan_upah').get().c;
if (hargaCount === 0) {
  db.prepare('INSERT INTO pengaturan_upah (harga_per_kg, berlaku_mulai) VALUES (?,?)')
    .run(8000, new Date().toISOString().slice(0,10));
}

module.exports = db;
