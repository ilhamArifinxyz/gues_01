# Backend REST API - Sistem Manajemen Absensi Berbasis Web

> **Mata Kuliah:** Rekayasa Perangkat Lunak  
> **Program Studi:** S1 Teknik Informatika, Universitas Tadulako 2026  
> **Kelompok 10:**  
> 1. Ilham Arifin (F5512530109)  
> 2. Andiardi (F5512530110)  
> 3. Dian Abdillah Melosovic (F5512530112)

---

## 🚀 Ringkasan Arsitektur

Backend ini dibangun menggunakan **Go (Golang 1.21+)** dengan arsitektur **Clean Architecture (Layered Architecture)**, menggunakan router performa tinggi **`go-chi/chi/v5`**, database driver **`jackc/pgx/v5`** (Raw SQL parameterized queries), dan token otentikasi **`golang-jwt/jwt/v5`**.

### 🌟 Fitur Utama
1. **Otentikasi & Keamanan JWT:** Bcrypt hashing (cost 10) + claims peran (`ADMIN` / `KARYAWAN`).
2. **Validasi Geofencing Haversine:** Perhitungan jarak koordinat akurat terhadap titik acuan kantor dalam satuan meter.
3. **Evaluasi Toleransi Waktu Otomatis:** Deteksi keterlambatan masuk (> 15 menit dari jadwal) dan pulang cepat.
4. **Penyimpanan Berkas Swafoto & Dokumen Izin:** Berkas tersimpan ke direktori `uploads/selfies/` dan `uploads/leaves/` serta dapat diakses langsung via peramban (`/uploads/*`).
5. **Ekspor CSV Terstruktur:** Unduh berkas rekap presensi berformat UTF-8 BOM yang langsung rapi dibuka di Microsoft Excel.
6. **Graceful Fallback In-Memory:** Jika database PostgreSQL belum tersambung, backend secara otomatis beralih ke *In-Memory Mock Store* lengkap dengan data seeder sehingga presentasi dan pengujian dosen/asisten dapat langsung berjalan lancar tanpa instalasi DB lokal!

---

## 📁 Struktur Direktori Backend

```text
backend/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point inisialisasi server & routing
├── internal/
│   ├── config/
│   │   └── config.go               # Pembaca konfigurasi environment variables
│   ├── domain/                     # Definisi entitas bisnis & DTO
│   │   ├── karyawan.go
│   │   ├── lokasi.go
│   │   ├── presensi.go
│   │   └── izin.go
│   ├── handler/                    # HTTP Controller & Response Helper
│   │   ├── response.go
│   │   ├── auth_handler.go
│   │   ├── presensi_handler.go
│   │   ├── izin_handler.go
│   │   └── admin_handler.go
│   ├── middleware/                 # JWT Authentication & Admin RoleGuard
│   │   └── auth_middleware.go
│   ├── repository/                 # Kontrak Repository & Data Access
│   │   ├── repository.go           # Abstraksi Interface
│   │   ├── postgres/               # Implementasi pgx/v5 (Raw SQL)
│   │   └── memory/                 # In-Memory Mock Store & Seeder
│   └── service/                    # Logika Bisnis (Use Cases)
│       ├── errors.go
│       ├── auth_service.go
│       ├── presensi_service.go     # Haversine distance & evaluasi toleransi waktu
│       ├── izin_service.go         # Alur pengajuan & review izin
│       └── report_service.go       # Rekapitulasi audit & generator CSV
├── pkg/
│   ├── geo/                        # Rumus jarak Haversine (CalculateDistance)
│   ├── hash/                       # Bcrypt hash & password verification
│   └── token/                      # Sign & validate JSON Web Token (JWT)
├── uploads/                        # Direktori penyimpanan berkas publik
│   ├── selfies/
│   └── leaves/
├── go.mod
├── go.sum
└── README.md
```

---

## 🛠️ Cara Menjalankan Backend

### 1. Prasyarat
- Go versi 1.21 ke atas terpasang (`go version`).
- (Opsional) PostgreSQL jika ingin menggunakan database fisik. Jika tidak ada, sistem otomatis menggunakan mock store bawaan.

### 2. Instalasi & Menjalankan Server
Buka terminal dan masuk ke folder `backend`:
```bash
cd backend
go mod tidy
go run cmd/api/main.go
```

Server HTTP akan menyala pada port `8080` (default):
```text
[INFO] Server HTTP mendengarkan di http://localhost:8080
```

### 3. Menjalankan Unit Tests
```bash
go test -v ./...
```

---

## 🔑 Akun Uji Coba Default (Seeder Data)

| Role | NIK | Email | Kata Sandi | Kantor Penugasan |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `ADM001` | `admin@absensi.com` | `admin123` | Kantor Cabang Palu |
| **KARYAWAN** | `F5512530109` | `ilham@absensi.com` | `password123` | Kantor Cabang Palu |
| **KARYAWAN** | `F5512530110` | `andiardi@absensi.com` | `password123` | Kantor Cabang Palu |
| **KARYAWAN** | `F5512530112` | `dian@absensi.com` | `password123` | Kantor Cabang Palu |

*Titik Kantor Acuan Palu: Lat `-0.8917000`, Long `119.8872000`, Radius: `50` meter.*

---

## 📋 Daftar Endpoint REST API

Semua respons API menggunakan format JSON standar:
```json
{
  "success": true,
  "message": "Pesan status",
  "data": {}
}
```

### 1. Modul Publik & Autentikasi
| Method | Endpoint | Deskripsi | Otorisasi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa status kesehatan server | Publik |
| `POST` | `/api/v1/auth/login` | Login menggunakan Email/NIK dan Kata Sandi | Publik |
| `GET` | `/api/v1/auth/me` | Mengambil data profil pengguna aktif | Bearer JWT |

### 2. Modul Presensi Karyawan
| Method | Endpoint | Format | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/punch` | `multipart/form-data` | Melakukan absensi (field: `jenis`, `latitude`, `longitude`, `foto`) |
| `GET` | `/api/v1/attendance/today` | JSON | Mengambil status absensi hari ini (masuk & pulang) |
| `GET` | `/api/v1/attendance/my-history` | JSON | Riwayat absensi bulanan (`?month=10&year=2026`) |

### 3. Modul Pengajuan Izin
| Method | Endpoint | Format | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/leaves` | `multipart/form-data` | Mengajukan izin (field: `jenis_izin`, `tanggal_mulai`, `tanggal_selesai`, `alasan`, `bukti`) |
| `GET` | `/api/v1/leaves/my` | JSON | Riwayat pengajuan izin pribadi |

### 4. Modul Admin & Manajemen HRD (`Role: ADMIN`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/employees` | Mengambil seluruh daftar staf (`?search=`) |
| `POST` | `/api/v1/admin/employees` | Mendaftarkan akun karyawan baru |
| `PUT` | `/api/v1/admin/employees/{nik}` | Mengubah data profil/jadwal karyawan |
| `GET` | `/api/v1/admin/locations` | Mengambil daftar titik koordinat kantor cabang |
| `POST` | `/api/v1/admin/locations` | Menambahkan titik kantor baru |
| `PUT` | `/api/v1/admin/locations/{id}` | Mengubah koordinat atau radius kantor |
| `GET` | `/api/v1/admin/attendance/recap` | Rekapitulasi absensi & ringkasan statistik LCD |
| `PATCH` | `/api/v1/admin/attendance/{id}/correct`| Koreksi status absensi (Audit Log) |
| `GET` | `/api/v1/admin/attendance/export/csv` | Mengunduh file laporan presensi format CSV |
| `GET` | `/api/v1/admin/leaves` | Daftar seluruh pengajuan izin yang masuk |
| `PATCH` | `/api/v1/admin/leaves/{id}/review` | Menyetujui atau menolak permohonan izin |

### 5. Penyimpanan Berkas Statis
- URL `/uploads/selfies/{filename}` -> Menampilkan foto swafoto presensi.
- URL `/uploads/leaves/{filename}` -> Menampilkan berkas bukti surat izin.
