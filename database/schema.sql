-- =====================================================================
-- SISTEM MANAJEMEN ABSENSI BERBASIS WEB (KELOMPOK 10 RPL)
-- Berkas DDL Skema PostgreSQL (Idempotent & Relational)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL: lokasi_kantor
-- Menyimpan referensi koordinat fisik kantor untuk validasi geofencing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lokasi_kantor (
    id_lokasi SERIAL PRIMARY KEY,
    nama_kantor VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    radius_meter INT NOT NULL DEFAULT 50,
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. TABEL: karyawan
-- Menyimpan data master pengguna, akun login, jadwal kerja, dan peran.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS karyawan (
    nik VARCHAR(30) PRIMARY KEY,
    nama_lengkap VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nomor_telepon VARCHAR(20),
    jabatan VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'KARYAWAN')),
    id_lokasi INT REFERENCES lokasi_kantor(id_lokasi) ON UPDATE CASCADE ON DELETE SET NULL,
    jam_masuk_jadwal TIME NOT NULL DEFAULT '08:00:00',
    jam_pulang_jadwal TIME NOT NULL DEFAULT '17:00:00',
    status_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 3. TABEL: log_presensi
-- Menyimpan transaksi presensi masuk & pulang beserta geolokasi & swafoto.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_presensi (
    id_presensi BIGSERIAL PRIMARY KEY,
    nik VARCHAR(30) NOT NULL REFERENCES karyawan(nik) ON UPDATE CASCADE ON DELETE CASCADE,
    id_lokasi INT REFERENCES lokasi_kantor(id_lokasi) ON UPDATE CASCADE ON DELETE SET NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    jenis_presensi VARCHAR(10) NOT NULL CHECK (jenis_presensi IN ('MASUK', 'PULANG')),
    status_kehadiran VARCHAR(20) NOT NULL CHECK (
        status_kehadiran IN ('TEPAT_WAKTU', 'TERLAMBAT', 'PULANG_NORMAL', 'PULANG_CEPAT')
    ),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    jarak_meter DECIMAL(8, 2) NOT NULL,
    url_foto VARCHAR(255) NOT NULL,
    diupdate_oleh VARCHAR(30) REFERENCES karyawan(nik) ON UPDATE CASCADE ON DELETE SET NULL,
    waktu_update TIMESTAMP,
    catatan_koreksi TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_presensi_nik_tanggal_jenis UNIQUE (nik, tanggal, jenis_presensi)
);

-- ---------------------------------------------------------------------
-- 4. TABEL: pengajuan_izin
-- Menyimpan permohonan izin/sakit/cuti/tugas luar dan status persetujuannya.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pengajuan_izin (
    id_izin BIGSERIAL PRIMARY KEY,
    nik VARCHAR(30) NOT NULL REFERENCES karyawan(nik) ON UPDATE CASCADE ON DELETE CASCADE,
    jenis_izin VARCHAR(20) NOT NULL CHECK (jenis_izin IN ('IZIN', 'SAKIT', 'TUGAS_LUAR', 'CUTI')),
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    alasan TEXT NOT NULL,
    url_bukti VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DISETUJUI', 'DITOLAK')),
    diverifikasi_oleh VARCHAR(30) REFERENCES karyawan(nik) ON UPDATE CASCADE ON DELETE SET NULL,
    waktu_verifikasi TIMESTAMP,
    catatan_admin TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_izin_rentang_tanggal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- =====================================================================
-- INDEKS OPTIMAL UNTUK PERFORMA QUERY & REKAP LAPORAN
-- =====================================================================

-- Indeks untuk pencarian & penyaringan riwayat absensi harian/bulanan
CREATE INDEX IF NOT EXISTS idx_presensi_nik_tanggal ON log_presensi(nik, tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON log_presensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_nik ON log_presensi(nik);
CREATE INDEX IF NOT EXISTS idx_presensi_lokasi ON log_presensi(id_lokasi);
CREATE INDEX IF NOT EXISTS idx_presensi_jenis_status ON log_presensi(jenis_presensi, status_kehadiran);

-- Indeks untuk perizinan
CREATE INDEX IF NOT EXISTS idx_izin_nik ON pengajuan_izin(nik);
CREATE INDEX IF NOT EXISTS idx_izin_status ON pengajuan_izin(status);
CREATE INDEX IF NOT EXISTS idx_izin_rentang ON pengajuan_izin(tanggal_mulai, tanggal_selesai);

-- Indeks untuk data master karyawan
CREATE INDEX IF NOT EXISTS idx_karyawan_email ON karyawan(email);
CREATE INDEX IF NOT EXISTS idx_karyawan_role ON karyawan(role);
CREATE INDEX IF NOT EXISTS idx_karyawan_lokasi ON karyawan(id_lokasi);
CREATE INDEX IF NOT EXISTS idx_karyawan_status_aktif ON karyawan(status_aktif);

-- =====================================================================
-- FUNGSI & TRIGGER UNTUK PEMBARUAN OTOMATIS updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_timestamp_lokasi ON lokasi_kantor;
CREATE TRIGGER trg_set_timestamp_lokasi
BEFORE UPDATE ON lokasi_kantor
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS trg_set_timestamp_karyawan ON karyawan;
CREATE TRIGGER trg_set_timestamp_karyawan
BEFORE UPDATE ON karyawan
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
