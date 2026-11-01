# PAPAN TIKET IMPLEMENTASI FITUR (TAHAP 3)
## SISTEM MANAJEMEN ABSENSI BERBASIS WEB

> **Tech Stack Terpilih:**  
> - **Backend:** Go Chi Router + Raw SQL (`jackc/pgx/v5`) Clean Architecture  
> - **Frontend:** React 18+ (JavaScript / JSX) + Vite + Tailwind CSS (Tema Retro Manga Bento)  
> - **Database:** PostgreSQL (Relational ACID, DDL Migrations & Seeders)  
> - **Struktur:** Monorepo (`database/`, `backend/`, `frontend/`)

---

## 📌 DAFTAR TIKET & PENUGASAN ROLE SUB-AGENT

| ID Tiket | Judul Tiket | Penanggung Jawab (Role) | Dependensi | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[DB-01]** | Skema PostgreSQL, DDL, Indeks & Data Uji (Seeder) | `database-engineer` | - | ✅ Completed |
| **[BE-01]** | Backend Core REST API (Go Chi + pgx/v5 + JWT) | `backend-dev` | [DB-01] | ✅ Completed |
| **[FE-01]** | Frontend SPA Retro Manga Bento (WebRTC & Geolocation) | `frontend-dev` | [Desain UI/UX] | ✅ Completed |
| **[QA-01]** | Integrasi End-to-End, Validasi Edge Case & Audit QA | `qa-tester` | [BE-01], [FE-01] | ✅ Completed |

---

### 🎫 TIKET 1: [DB-01] Skema Basis Data, Indeks & Data Uji
* **Role:** `database-engineer` (Dipandu oleh `SKILL_POSTGRES.md`)
* **Direktori Output:** `database/`
* **Cakupan Pekerjaan:**
  1. `database/schema.sql`: DDL tabel `lokasi_kantor`, `karyawan`, `log_presensi`, `pengajuan_izin`.
  2. Indexing optimal: `idx_presensi_nik_tanggal`, `idx_presensi_tanggal`, `idx_izin_status`.
  3. `database/seeds.sql`: Data awal (seed data) yang mencakup:
     - 2 Titik Kantor (Kantor Cabang Palu: Lat `-0.8917000`, Lng `119.8872000`, Radius: 50m; dan Kantor Pusat).
     - 1 Akun Admin (Email `admin@absensi.com`, NIK `ADM001`, Hash Bcrypt).
     - 3 Akun Karyawan Kelompok 10 (Ilham Arifin `F5512530109`, Andiardi `F5512530110`, Dian Abdillah `F5512530112`).
     - Data histori presensi dan izin sampel.
* **Kriteria Penerimaan (Acceptance Criteria):**
  - Script SQL valid, idempotent (`CREATE TABLE IF NOT EXISTS`), dan lolos dieksekusi tanpa sintaks error.

---

### 🎫 TIKET 2: [BE-01] Backend REST API Core (Go Chi + pgx/v5)
* **Role:** `backend-dev` (Dipandu oleh `SKILL_BACKEND.md` & `SKILL_GOLANG.md`)
* **Direktori Output:** `backend/`
* **Cakupan Pekerjaan:**
  1. Inisialisasi Go Module (`go.mod`), setup `cmd/api/main.go`, dan router `go-chi/chi/v5`.
  2. Clean Architecture: `internal/domain`, `internal/repository` (pgx/v5 pool), `internal/service`, `internal/handler`, `internal/middleware`.
  3. Modul Auth: Endpoint `POST /api/v1/auth/login` (Bcrypt + JWT Claim Role) dan `GET /api/v1/auth/me`.
  4. Modul Presensi: Endpoint `POST /api/v1/attendance/punch` (Multipart form-data: upload foto swafoto, latitude, longitude, jenis MASUK/PULANG). Validasi jarak *Haversine* terhadap lokasi kantor karyawan, evaluasi toleransi keterlambatan (15 menit).
  5. Modul Riwayat: `GET /api/v1/attendance/today`, `GET /api/v1/attendance/my-history`.
  6. Modul Izin: `POST /api/v1/leaves`, `GET /api/v1/leaves/my`.
  7. Modul Admin & Ekspor: `GET /api/v1/admin/attendance/recap`, `GET /api/v1/admin/attendance/export/csv`, `PATCH /api/v1/admin/leaves/:id/review`.
* **Kriteria Penerimaan (Acceptance Criteria):**
  - Backend dapat di-build dengan `go build` tanpa error.
  - Endpoint mengembalikan status code dan struktur JSON standar sesuai dokumen Tahap 2.
  - Berkas foto swafoto tersimpan aman ke direktori `backend/uploads/selfies/`.

---

### 🎫 TIKET 3: [FE-01] Frontend SPA Retro Manga Bento (React + Vite)
* **Role:** `frontend-dev` (Dipandu oleh `SKILL_FRONTEND.md`, `SKILL_REACT.md`, `SKILL_UI.md`, `SKILL_UX.md`)
* **Direktori Output:** `frontend/`
* **Cakupan Pekerjaan:**
  1. Setup Vite React SPA + Tailwind CSS + Font Google (`VT323`, `Chakra Petch`, `Quicksand`).
  2. Implementasi Desain *Aesthetic Retro Manga Bento* (Palette canvas `#D5DAD4`, ink `#1E2322`, shadow taktil).
  3. Komponen Jam Digital LCD waktu nyata (VT323) dengan integrasi mini-badge radius geofence.
  4. Viewfinder Kamera Swafoto WebRTC (`navigator.mediaDevices.getUserMedia`) dengan overlay panel komik.
  5. Flow Presensi Karyawan: Mengambil foto live + koordinat GPS browser, kirim ke backend API, konfirmasi modal presensi.
  6. Dashboard Admin HRD: Kartu statistik bento LCD, tabel log presensi live, filter & search bar, preview swafoto, dan tombol unduh CSV.
  7. Modal Pengajuan Izin mandiri.
* **Kriteria Penerimaan (Acceptance Criteria):**
  - Aplikasi berjalan mulus via `npm run dev` / Vite build tanpa error JSX.
  - Komponen responsif di tampilan mobile maupun desktop.
  - Tersedia fallback mock data jika backend belum dinyalakan agar UI tetap interaktif.

---

### 🎫 TIKET 4: [QA-01] Integrasi End-to-End & Audit QA
* **Role:** `qa-tester` (Dipandu oleh `SKILL_ERROR_DETECTIVE.md`)
* **Cakupan Pekerjaan:**
  1. Verifikasi integrasi API antara frontend React dan backend Go Chi.
  2. Pengujian skenario edge cases:
     - Presensi di luar radius kantor (harus ditolak dengan pesan error yang ramah).
     - Presensi ganda pada hari yang sama.
     - Presensi lewat toleransi jam masuk (status wajib `TERLAMBAT`).
     - Alur pengajuan izin hingga di-approve Admin.
  3. Verifikasi berkas ekspor CSV.
* **Kriteria Penerimaan (Acceptance Criteria):**
  - Seluruh skenario inti lulus uji dan terdokumentasi dalam laporan uji.
