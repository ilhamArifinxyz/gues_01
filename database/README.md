# Panduan Basis Data PostgreSQL
## Sistem Manajemen Absensi Berbasis Web (Kelompok 10 RPL)

Direktori ini memuat skrip DDL (*Data Definition Language*) dan data awal (*Seeder*) untuk Sistem Manajemen Absensi Berbasis Web. Seluruh skrip dirancang secara **idempotent**, teroptimasi dengan indeks B-Tree yang tepat, dan memiliki integritas relasional berstandar ACID.

---

## 📁 Struktur Berkas

```
database/
├── schema.sql    # DDL tabel, constraints, foreign keys, indeks, dan trigger otomatis
├── seeds.sql     # Data awal uji realistis (kantor cabang, akun admin & karyawan, log presensi, perizinan)
└── README.md     # Dokumentasi petunjuk eksekusi dan integrasi basis data
```

---

## 🗄️ Entitas & Skema Relasional

Basis data terdiri dari 4 tabel utama yang saling berelasi:

1. **`lokasi_kantor`**:
   - Menyimpan koordinat acuan fisik kantor (`latitude`, `longitude`), radius geofence (`radius_meter`, default 50m), serta nama dan alamat kantor.
   - Digunakan oleh modul backend untuk validasi rumus *Haversine*.
2. **`karyawan`**:
   - Menyimpan data master staf dan administrator.
   - Kolom kunci: `nik` (PK), `email` (UNIQUE), `password_hash` (bcrypt), `role` (`'ADMIN'` / `'KARYAWAN'`), `id_lokasi` (FK ke `lokasi_kantor`), serta jadwal kerja (`jam_masuk_jadwal`, `jam_pulang_jadwal`).
3. **`log_presensi`**:
   - Mencatat setiap transaksi presensi (Masuk & Pulang) harian.
   - Mencakup koordinat aktual GPS (`latitude`, `longitude`), jarak hitung (`jarak_meter`), path swafoto (`url_foto`), status kehadiran (`TEPAT_WAKTU`, `TERLAMBAT`, `PULANG_NORMAL`, `PULANG_CEPAT`), serta kolom audit untuk koreksi admin (`diupdate_oleh`, `waktu_update`, `catatan_koreksi`).
   - Terdapat konstrain unik `(nik, tanggal, jenis_presensi)` untuk mencegah presensi masuk/pulang ganda pada hari yang sama.
4. **`pengajuan_izin`**:
   - Menyimpan pengajuan izin, sakit, dinas luar, atau cuti beserta alur verifikasi HRD.
   - Status: `'PENDING'`, `'DISETUJUI'`, `'DITOLAK'`.

---

## ⚡ Indeks & Optimasi Kueri

Untuk menjamin waktu respon kueri rekap dan verifikasi di bawah **50ms**:
- `idx_presensi_nik_tanggal`: Mempercepat kueri rekap bulanan personal dan pengecekan kehadiran hari ini.
- `idx_presensi_tanggal`: Mempercepat pembuatan rekap laporan harian seluruh karyawan untuk Admin/HRD.
- `idx_izin_status`: Mempercepat penyaringan daftar perizinan yang masih berstatus `PENDING` di dasbor HRD.
- `idx_karyawan_email` & `idx_karyawan_role`: Mempercepat proses otentikasi login JWT dan otorisasi peran.

---

## 👥 Data Akun Bawaan (Seed Credentials)

Semua password di-hash menggunakan algoritma **Bcrypt** (cost 10) yang kompatibel penuh dengan pustaka Go `golang.org/x/crypto/bcrypt`.

| Peran | NIK | Nama Lengkap | Email | Password Plaintext | Penugasan Kantor |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `ADM001` | HRD Administrator | `admin@absensi.com` | `admin123` | Kantor Pusat (ID 2) |
| **KARYAWAN** | `F5512530109` | Ilham Arifin | `ilham@absensi.com` | `karyawan123` | Kantor Cabang Palu (ID 1) |
| **KARYAWAN** | `F5512530110` | Andiardi | `andiardi@absensi.com` | `karyawan123` | Kantor Cabang Palu (ID 1) |
| **KARYAWAN** | `F5512530112` | Dian Abdillah Melosovic | `dian@absensi.com` | `karyawan123` | Kantor Cabang Palu (ID 1) |

### Titik Kantor Bawaan:
1. **Kantor Cabang Palu** (ID 1): Lat `-0.8917000`, Lng `119.8872000`, Radius: `50` meter.
2. **Kantor Pusat** (ID 2): Lat `-0.8950000`, Lng `119.8800000`, Radius: `100` meter.

---

## 🚀 Panduan Eksekusi Skrip

### 1. Persiapan Basis Data (Membuat Database)
Buat database bernama `absensi_db` di PostgreSQL terlebih dahulu:
```sql
CREATE DATABASE absensi_db;
```

---

### 2. Eksekusi via Terminal / CLI `psql`

Buka PowerShell atau terminal Anda, lalu arahkan ke direktori proyek:

```powershell
# Masuk ke database absensi_db dan jalankan skema DDL
psql -U postgres -d absensi_db -f database/schema.sql

# Jalankan seeder data awal
psql -U postgres -d absensi_db -f database/seeds.sql
```

*Jika PostgreSQL meminta password, masukkan password akun user PostgreSQL Anda.*

---

### 3. Eksekusi via pgAdmin 4 / DBeaver

1. Buka aplikasi **pgAdmin 4** atau **DBeaver**.
2. Hubungkan ke server PostgreSQL lokal atau remote.
3. Buat database baru bernama `absensi_db` (klik kanan *Databases* -> *Create* -> *Database...*).
4. Buka *Query Tool* pada database `absensi_db`.
5. Buka berkas `database/schema.sql`, salin seluruh kodenya, dan tekan **Execute (F5)**.
6. Buka berkas `database/seeds.sql`, salin seluruh kodenya, dan tekan **Execute (F5)**.
7. Pastikan seluruh tabel dan data berhasil masuk pada skema `public`.

---

### 4. Alternatif Menggunakan Docker

Bagi pengguna Docker, database PostgreSQL dapat dijalankan secara instan dengan perintah berikut:

```bash
docker run -d \
  --name absensi-postgres \
  -e POSTGRES_DB=absensi_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

Setelah kontainer berjalan, impor skema dan seed:
```bash
docker exec -i absensi-postgres psql -U postgres -d absensi_db < database/schema.sql
docker exec -i absensi-postgres psql -U postgres -d absensi_db < database/seeds.sql
```

---

## ⚙️ Konfigurasi Environment Variable untuk Backend Go

Pada berkas konfigurasi backend (`backend/.env`), gunakan variabel berikut:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=absensi_db
DB_SSLMODE=disable

# Atau Format Connection String DSN Tunggal:
DATABASE_URL=postgres://postgres:your_postgres_password@localhost:5432/absensi_db?sslmode=disable
```

---

## 🔄 Pembersihan / Reset Ulang Basis Data (Opsional)

Jika ingin membersihkan seluruh tabel dan memulai ulang dari awal:

```sql
DROP TABLE IF EXISTS pengajuan_izin CASCADE;
DROP TABLE IF EXISTS log_presensi CASCADE;
DROP TABLE IF EXISTS karyawan CASCADE;
DROP TABLE IF EXISTS lokasi_kantor CASCADE;
DROP FUNCTION IF EXISTS trigger_set_timestamp CASCADE;
```
Setelah itu jalankan kembali `schema.sql` dan `seeds.sql`.
