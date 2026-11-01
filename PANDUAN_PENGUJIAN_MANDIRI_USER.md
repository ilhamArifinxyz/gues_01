# PANDUAN PENGUJIAN MANDIRI (USER TESTING GUIDE)
## SISTEM MANAJEMEN ABSENSI BERBASIS WEB (GEOFENCING & WEBRTC SELFIE)

> **Proyek:** Rekayasa Perangkat Lunak - Kelompok 10 (Universitas Tadulako 2026)  
> **Tema Desain:** Aesthetic Retro Manga Bento (Neo-Brutalist Soft UI)

---

## 🌐 1. Alamat Akses Layanan Lokal

Aplikasi saat ini telah **aktif dan berjalan di komputer lokal Anda**:

| Layanan | URL Akses | Deskripsi |
| :--- | :--- | :--- |
| **Frontend Web App** | [**http://localhost:3000**](http://localhost:3000) | Antarmuka pengguna (React 18 + Vite + Tailwind) |
| **Backend REST API** | [**http://localhost:8080**](http://localhost:8080) | Layanan API server Go Chi |
| **Health Check API** | [**http://localhost:8080/health**](http://localhost:8080/health) | Status kesiapan server backend |

---

## 🔑 2. Akun & Kredensial Pengujian

Tersedia akun bawaan yang siap Anda gunakan untuk menguji seluruh hak akses peran (*Role-Based Access Control*):

| Peran | Email / Identifier | Kata Sandi | Deskripsi & Tugas |
| :--- | :--- | :--- | :--- |
| **Admin / HRD** | `admin@absensi.com` | `admin123` | Akses penuh dashboard HRD, audit kehadiran, verifikasi izin, & ekspor CSV |
| **Karyawan 1** | `ilham@absensi.com` *(F5512530109)* | `karyawan123` | Staf IT (Kantor Cabang Palu, jadwal 08:00 - 17:00 WITA) |
| **Karyawan 2** | `andiardi@absensi.com` *(F5512530110)* | `karyawan123` | Staf Operasional (Kantor Cabang Palu) |
| **Karyawan 3** | `dian@absensi.com` *(F5512530112)* | `karyawan123` | Staf Administrasi (Kantor Pusat) |

---

## 📋 3. Matriks Skenario Uji Coba (Langkah Demi Langkah)

Buka peramban Anda di [**http://localhost:3000**](http://localhost:3000) dan ikuti 6 skenario pengujian berikut:

### Skenario 1: Navigasi Antara Layar Karyawan dan Dashboard Admin
1. Pada header bagian atas, perhatikan tombol toggle **"Layar Karyawan"** dan **"Dashboard Admin"**.
2. Klik **"Dashboard Admin"** untuk melihat tampilan monitor manajemen di desktop.
3. Klik kembali **"Layar Karyawan"** untuk melihat tampilan *mobile device frame* bernuansa komik/manga.
* **Hasil yang Diharapkan:** Tampilan beralih secara mulus dan responsif.

---

### Skenario 2: Uji Coba Swafoto Kamera (WebRTC)
1. Di layar karyawan, lihat kartu *viewfinder* kamera dengan *frame* komik oval.
2. Klik tombol **"Nyalakan Kamera"** di kanan atas kotak kamera.
3. Browser akan meminta izin akses kamera (*Allow Camera*). Klik **Allow**.
4. Wajah Anda akan muncul langsung di layar dengan watermark waktu HUD real-time.
*(Jika webcam laptop Anda ditutup/tidak diaktifkan, sistem otomatis menampilkan ilustrasi siluet wajah manga sebagai fallback).*
* **Hasil yang Diharapkan:** Stream video kamera aktif secara real-time dan sinkron dengan jam server.

---

### Skenario 3: Uji Coba Geofencing (Dalam Radius vs Luar Radius)
1. Perhatikan indikator mini di sebelah jam digital: `GEOFENCE: 🟢 18m (Aman)`.
2. Di bagian bawah kotak kamera, coba klik tombol simulasi: **"340m (Luar)"**.
   - Indikator seketika berubah menjadi merah `⛔ 340m (Luar)`.
   - Tombol hitam presensi menjadi non-aktif (*disabled*) dan muncul pesan peringatan: *"Anda berada di luar radius kantor..."*.
3. Klik tombol **"18m (Dalam)"**.
   - Indikator kembali hijau dan tombol presensi kembali aktif.
* **Hasil yang Diharapkan:** Sistem secara reaktif mengunci tombol presensi jika GPS pengguna di luar radius toleransi 50 meter.

---

### Skenario 4: Rekam Presensi Masuk (Ambil Foto & Catat)
1. Pastikan status GPS berada dalam radius (18m).
2. Tekan tombol taktil hitam: **"📸 AMBIL FOTO & CATAT PRESENSI"**.
3. Sistem akan menangkap gambar dan mengirimkan transaksi presensi.
4. Muncul dialog konfirmasi: `🎉 PRESENSI BERHASIL DICATAT!`.
5. Perhatikan kartu *Presensi Masuk* di bawahnya yang kini terisi jam aktual dan lencana hijau `Tepat Waktu`.
* **Hasil yang Diharapkan:** Data presensi masuk tercatat sukses beserta waktu dan bukti foto.

---

### Skenario 5: Pengajuan Izin / Sakit Mandiri
1. Pada navigasi bawah layar HP, klik menu **"Izin"** (ikon pena).
2. Muncul modal pop-up **"Formulir Pengajuan Izin"**.
3. Pilih jenis izin (misal: `SAKIT`), pilih tanggal, dan tulis alasan (misal: *"Demam dan istirahat dokter"*).
4. Klik tombol **"Kirim Pengajuan ke HRD"**.
* **Hasil yang Diharapkan:** Notifikasi pengajuan terkirim dan tiket izin masuk ke antrean verifikasi Admin.

---

### Skenario 6: Dashboard Admin & Ekspor CSV
1. Klik tombol **"Dashboard Admin"** pada switcher atas.
2. Amati **4 Kartu Bento Statistik LCD**:
   - Total Pegawai (120), Tepat Waktu (98), Terlambat (14), dan Izin (8).
3. Di tabel transaksi, cari nama karyawan (misal: "Ilham") melalui kolom pencarian.
4. Klik tombol **"👁️ Buka Foto"** pada salah satu baris untuk melihat bukti swafoto karyawan beserta metadata GPS.
5. Klik tombol **"📥 Ekspor CSV"** di kanan atas.
* **Hasil yang Diharapkan:** Berkas spreadsheet `laporan_presensi_*.csv` terunduh otomatis ke komputer Anda dan dapat langsung dibuka di Microsoft Excel!

---

## 🛠️ Catatan Pengoperasian Mandiri di Terminal

Jika di kemudian hari Anda ingin menjalankan aplikasi ini secara manual dari terminal PowerShell/CMD:
* **Menjalankan Backend:**
  ```powershell
  cd d:\User\semester_3\rpl\tugas_rpl\backend
  go run cmd/api/main.go
  ```
* **Menjalankan Frontend:**
  ```powershell
  cd d:\User\semester_3\rpl\tugas_rpl\frontend
  npm run dev
  ```
