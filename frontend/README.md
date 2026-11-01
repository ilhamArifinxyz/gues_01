# 📱 Sistem Manajemen Absensi Berbasis Web - Frontend SPA

Aplikasi web presensi karyawan modern dengan pendekatan gaya desain artistik **Retro Manga Bento** (*Neo-Brutalist Soft UI*). Dibangun menggunakan **React 18+**, **Vite**, dan **Tailwind CSS**. Dilengkapi verifikasi swafoto kamera waktu-nyata via **WebRTC API** dan validasi radius kantor via **HTML5 Geolocation API**.

---

## 🎨 Karakteristik Desain (Retro Manga Bento)

- **Palet Warna Lembut Berkontur:**
  - `canvas`: `#D5DAD4` (latar alas bento hangat)
  - `widget`: `#E6EAE4` (kartu widget off-white)
  - `widget-pure`: `#EFF3ED` (highlight card)
  - `ink`: `#1E2322` (tinta hitam pekat manga charcoal)
  - `ink-muted`: `#58615E` & `ink-light`: `#8A9490`
  - `pill`: `#242A28` (kapsul hitam kalender terbalik)
- **Bayangan Taktil Manga (Shadow Art):**
  - Border tebal 2px/3px/4px dengan drop-shadow `3px 4px 0px #1E2322` dan `5px 6px 0px #1E2322`.
- **Kombinasi Tipografi:**
  - `VT323`: Jam digital LCD retro server dan indikator numerik.
  - `Chakra Petch`: Label teknis, header bento, dan status geofence.
  - `Quicksand`: Teks tubuh rounded manga modern yang ramah dibaca.
- **Integrasi Bersih (No Standalone Card):**
  - Status geofence dan radius kantor langsung terintegrasi secara ringkas di dalam widget jam digital tanpa memakan ruang kartu mandiri.

---

## 🚀 Fitur Utama

1. **Layar Karyawan (Mobile-First View):**
   - **Header Bento:** Kalender tanggal kapsul hitam terbalik, info profil pegawai, dan jam kerja shift.
   - **Jam Digital LCD Waktu Nyata:** Jam digital ticking setiap detik dengan font `VT323` serta mini-badge status Geofence (jarak meter & status dalam/luar radius).
   - **Viewfinder Kamera WebRTC:** Akses feed kamera depan perangkat (`navigator.mediaDevices.getUserMedia`) dengan overlay watermark HUD timestamp waktu nyata dan koordinat GPS.
   - **Tombol Presensi Taktil Retro:** Mengambil tangkapan frame canvas video, memvalidasi koordinat radius kantor (maksimal 50 meter), mengevaluasi toleransi keterlambatan (15 menit), dan mengirim payload ke backend.
   - **Simulasi Jarak Instan:** Tombol simulasi `18m (Dalam)` dan `340m (Luar)` untuk memudahkan pengujian skenario normal dan edge case penolakan radius.
   - **Kapsul Status Presensi:** Kapsul terpisah untuk Presensi Masuk & Pulang.
   - **Modal Formulir Izin/Sakit:** Pengajuan izin, sakit, tugas luar, dan cuti tahunan dengan unggahan berkas bukti.
2. **Dashboard Admin HRD (Desktop View):**
   - **4 Kartu Statistik Bento LCD:** Total Pegawai (120), Hadir Tepat Waktu (98 / 81.6%), Terlambat (14 / 11.6%), Izin/Sakit (08 Pengajuan).
   - **Tabel Log Presensi Live Feed:** Menampilkan NIK, Nama Karyawan, Cabang, Jam Masuk, Jarak Geofence, Status Kehadiran, Bukti Swafoto, dan Aksi Koreksi.
   - **Pencarian & Filter Cabang:** Filter instan berdasarkan nama/NIK dan cabang kantor (Semua, Palu, Pusat).
   - **Modal Preview Swafoto:** Membuka bukti foto swafoto karyawan lengkap dengan metadata jam, jarak, dan koordinat.
   - **Ekspor CSV:** Unduh laporan rekapitulasi presensi harian ke format file `.csv`.
3. **Mekanisme Fallback Data Mock:**
   - Bila backend Go Chi di `http://localhost:8080/api/v1` belum aktif, modul `src/services/api.js` secara otomatis mengaktifkan fallback in-memory mock data interaktif.
   - Seluruh alur (presensi masuk, presensi pulang, izin, ekspor CSV, filter) tetap berfungsi 100% tanpa error jaringan.

---

## 📂 Struktur Proyek Frontend

```text
frontend/
├── index.html                  # Entry HTML + Google Fonts & Phosphor Icons
├── package.json                # Dependensi React 18, Vite, Tailwind CSS
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Retro Manga Bento theme tokens & colors
├── vite.config.js              # Vite React configuration
├── README.md                   # Panduan instalasi dan penggunaan
└── src/
    ├── App.jsx                 # Main container & mode switcher
    ├── index.css               # Tailwind directives & anime drift animation
    ├── main.jsx                # React DOM bootstrap
    ├── components/
    │   ├── AdminDashboard.jsx      # Dashboard monitoring admin & tabel log
    │   ├── AttendanceSummary.jsx   # Kapsul status Masuk & Pulang LCD
    │   ├── CameraViewfinder.jsx    # Live WebRTC stream & HUD overlay
    │   ├── DigitalClock.jsx        # Jam digital VT323 & mini-badge geofence
    │   ├── Header.jsx              # Bento header & kalender kapsul hitam
    │   ├── LeaveModal.jsx          # Modal pengajuan izin/sakit
    │   ├── PunchButton.jsx         # Tombol submit presensi & frame capture
    │   └── SelfieModal.jsx         # Modal audit preview foto swafoto
    └── services/
        └── api.js              # REST API client + Mock fallback handler
```

---

## 🛠️ Cara Menjalankan Frontend

### 1. Prasyarat
- **Node.js**: versi 18+ (disarankan v20+)
- **NPM**: versi 9+

### 2. Instalasi Dependensi
Buka terminal dan masuk ke direktori `frontend`:
```bash
cd frontend
npm install
```

### 3. Menjalankan Server Pengembangan (Dev Server)
```bash
npm run dev
```
Aplikasi akan aktif secara lokal di:
👉 **`http://localhost:3000`**

### 4. Build untuk Produksi
```bash
npm run build
```
Hasil build produksi yang telah dioptimasi akan berada di folder `frontend/dist/`.
