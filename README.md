# 🏢 Sistem Manajemen Absensi Berbasis Web
### Geofencing GPS & Live WebRTC Selfie Verification • Retro Manga Bento Theme

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4+-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com/)

> **Proyek Tugas Rekayasa Perangkat Lunak (RPL) 2026**  
> Program Studi S1 Teknik Informatika, Jurusan Teknologi Informasi, Fakultas Teknik  
> **Universitas Tadulako, Palu, Sulawesi Tengah**  
>
> **Disusun Oleh (Kelompok 10):**
> 1. **Ilham Arifin** (`F5512530109`)
> 2. **Andiardi** (`F5512530110`)
> 3. **Dian Abdillah Melosovic** (`F5512530112`)

---

## 📖 Ringkasan Proyek

**Sistem Manajemen Absensi Berbasis Web** adalah platform presensi kepegawaian modern yang dirancang untuk mengatasi kelemahan sistem absensi fisik konvensional (*fingerprint sensor kotor/rusak, kartu RFID rentan titip absen/buddy punching, dan face recognition mandiri berbiaya mahal*). 

Sistem ini beroperasi secara terdesentralisasi melalui peramban web pada gawai masing-masing karyawan dengan **tiga pilar verifikasi otomatis**:
1. **Validasi Geolocation (Geofencing Haversine):** Menghitung jarak nyata pengguna terhadap koordinat kantor cabang (radius batas 50 meter) dengan pengamanan batas akurasi GPS $\le 100\text{m}$.
2. **Validasi Swafoto Langsung (Live WebRTC Camera):** Mengunci pengambilan foto langsung melalui kamera peramban tanpa mengizinkan unggah berkas galeri, dilengkapi watermark HUD biometrik dan stempel waktu server.
3. **Pencatatan Waktu Otoritatif:** Waktu presensi (*timestamp*) dicatat langsung dari server untuk mencegah manipulasi jam lokal perangkat.

---

## 🎨 Karakteristik Desain: Aesthetic Retro Manga Bento (Neo-Brutalist Soft UI)

Antarmuka dibangun dengan sentuhan seni khusus memadukan estetika panel manga retro dengan tata letak kartu bento neo-brutalist:
* **Palet Warna:** *Warm canvas grey* (`#D5DAD4`), kartu widget *off-white* (`#E6EAE4`), dan kontur tinta arang hitam tegas (`#1E2322`).
* **Tipografi:** Tampilan jam dan angka numerik menggunakan font **`VT323` (7-Segment Monospace LCD Digital)** dipadu font teknis **`Chakra Petch`** dan teks lembut **`Quicksand`**.
* **Efek Taktil:** *Hard drop shadow* tebal (`3px 4px 0px #1E2322`) pada seluruh tombol aksi dan kartu bento.

---

## ✨ Fitur Unggulan Sistem

| Fitur | Deskripsi |
| :--- | :--- |
| **🔐 Otentikasi & Role Guard** | Login mandiri menggunakan Email/NIK dan sandi terenkripsi Bcrypt, token JWT stateless, dan pembatasan rute otomatis (*Admin & Karyawan*). |
| **🛰️ Radar Geofence Interaktif** | Modal pop-up visualisasi radar SVG taktis (*sweep scanner*) yang menampilkan posisi pin GPS pengguna terhadap titik kantor acuan. |
| **⏱️ Presensi Masuk & Pulang Dinamis** | Tombol presensi taktil reaktif (*Masuk $\rightarrow$ Pulang $\rightarrow$ Selesai*), evaluasi keterlambatan (toleransi 15 menit), serta kalkulasi durasi kerja harian. |
| **📅 Kalender Riwayat Bulanan** | Tampilan kalender *grid* 1–31 di layar karyawan dengan *status dots* (🟢 Tepat Waktu, 🟡 Terlambat, 🟣 Izin) dan modal pratinjau bukti swafoto berstempel GPS. |
| **📝 Manajemen Kuota Cuti Tahunan** | Pengajuan izin/sakit/cuti mandiri dengan saldo kuota cuti tahunan (12 hari/tahun). Hanya jenis `CUTI` yang memotong kuota. |
| **🔍 Pratinjau Berkas Medis HRD** | Fitur zoom surat keterangan dokter berstempel klinik resmi pada dashboard admin sebelum memberikan persetujuan (*Approve/Reject*). |
| **👥 CRUD Karyawan & Soft Delete** | Pengelolaan master data pegawai dengan fitur *Soft Delete* (`status_aktif = false`) yang memblokir login tanpa menghilangkan riwayat audit. |
| **🏢 CRUD Kantor Cabang** | Pengelolaan koordinat latitude, longitude, dan radius toleransi meter kantor cabang. |
| **📊 Analitik Tren Kehadiran** | Grafik sebaran persentase ketepatan waktu 30 hari terakhir (*Punctuality Index*). |
| **📄 Ekspor PDF Cetak Berkop Untad** | Generator dokumen laporan resmi A4 siap cetak (`window.print()`) ber-Kop Akademik Universitas Tadulako dan kolom tanda tangan pimpinan prodi. |
| **📥 Ekspor Spreadsheet CSV** | Pengunduhan rekapitulasi data kehadiran berstandar UTF-8 Excel. |
| **📜 Audit Trail Koreksi** | Pencatatan riwayat modifikasi data kehadiran oleh admin lengkap dengan stempel waktu dan kode hash integritas. |

---

## 🏗️ Arsitektur Teknologi

```text
absensi-project/
├── backend/                  # Golang Clean Architecture REST API
│   ├── cmd/api/main.go       # Entry point & Chi router
│   ├── internal/             # Domain, Repository (pgx/v5 & Memory fallback), Service, Handler
│   ├── pkg/                  # Formula Haversine, Hash Bcrypt, JWT Token
│   └── uploads/              # Penyimpanan foto swafoto & berkas izin
├── frontend/                 # React 18+ SPA (Vite + Tailwind CSS)
│   ├── src/components/       # Komponen UI Retro Manga Bento
│   └── src/services/api.js   # Modul komunikasi API & Fallback Mock Store
├── database/                 # Skrip SQL PostgreSQL
│   ├── schema.sql            # DDL tabel, constraint, dan indexing
│   └── seeds.sql             # Data awal kantor, admin, dan karyawan
├── tests/                    # E2E integration test scripts
├── docker-compose.yml        # Orkestrasi 3 kontainer (DB, Backend, Frontend)
└── README.md                 # Dokumentasi utama proyek
```

---

## 🚀 Panduan Menjalankan Sistem

### Opsi 1: Rilis 1-Klik Menggunakan Docker Compose (Direkomendasikan)
Pastikan Docker Desktop aktif di komputer Anda, lalu jalankan:

```bash
docker compose up --build -d
```

Aplikasi langsung aktif dan dapat diakses melalui peramban:
* **Aplikasi Web Utama:** 👉 **`http://localhost`** (atau `http://localhost:3000`)
* **Backend REST API:** `http://localhost:8080/health`

---

### Opsi 2: Menjalankan di Lingkungan Pengembangan Lokal (Local Dev)

#### 1. Jalankan Backend Go:
```powershell
cd backend
go run cmd/api/main.go
```
*Backend akan aktif di port `8080` (dilengkapi in-memory fallback otomatis jika PostgreSQL lokal belum dinyalakan).*

#### 2. Jalankan Frontend React:
```powershell
cd frontend
npm install
npm run dev
```
*Frontend akan aktif di `http://localhost:3000`.*

---

## 🔑 Akun Bawaan Pengujian (Default Accounts)

| Peran | Akun Email / Identifier | Kata Sandi | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin HRD** | `admin@absensi.com` | `admin123` | Akses penuh dashboard manajemen admin |
| **Karyawan 1** | `ilham@absensi.com` *(F5512530109)* | `karyawan123` | Staf IT (Kantor Cabang Palu, jadwal 08:00 - 17:00 WITA) |
| **Karyawan 2** | `andiardi@absensi.com` *(F5512530110)* | `karyawan123` | Staf Operasional (Kantor Cabang Palu) |
| **Karyawan 3** | `dian@absensi.com` *(F5512530112)* | `karyawan123` | Staf Administrasi (Kantor Pusat) |

---

## 📚 Indeks Dokumentasi 5 Tahapan RPL (SDLC)

1. **[Tahap 1: Analisis Sistem (PRD & ERD)](DOKUMEN_TAHAP_1_ANALISIS_PRD_ERD.md)**  
   *Problem statement, spesifikasi kebutuhan fungsional & non-fungsional, formula Haversine, skema relasional, dan diagram ERD Mermaid.*
2. **[Tahap 2: Desain Sistem & UI/UX](DOKUMEN_TAHAP_2_DESAIN_SISTEM_UIUX.md)**  
   *Arsitektur perangkat lunak Clean Architecture Go, kontrak REST API terinci, alur interaksi User Flow, dan Design Tokens.*
3. **[Tahap 3: Implementasi Tiket Fitur](DOKUMEN_TIKET_IMPLEMENTASI_TAHAP_3.md)**  
   *Papan pembagian tiket implementasi, sub-agent roles, dan rekapitulasi source code.*
4. **[Tahap 4: Laporan Pengujian Mutu (QA Report)](LAPORAN_PENGUJIAN_SISTEM_QA.md)**  
   *Metodologi pengujian white-box & black-box, matriks hasil uji 12/12 pass (100%), investigasi edge case, dan analisis forensik.*
5. **[Tahap 5: Panduan Deployment](DOKUMEN_TAHAP_5_DEPLOYMENT.md)**  
   *Topologi kontainerisasi multi-stage Docker, Nginx reverse proxy, panduan rilis 1-klik, verifikasi kesehatan, serta panduan backup/restore database.*
6. **[Panduan Pengujian Mandiri Pengguna](PANDUAN_PENGUJIAN_MANDIRI_USER.md)**  
   *Panduan uji interaktif 6 skenario bagi pengguna/dosen penguji.*

---

## 📄 Lisensi
Hak Cipta © 2026 Kelompok 10 Rekayasa Perangkat Lunak, Program Studi S1 Teknik Informatika, Universitas Tadulako.
Dilisensikan di bawah [MIT License](LICENSE).
