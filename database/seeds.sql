-- =====================================================================
-- SISTEM MANAJEMEN ABSENSI BERBASIS WEB (KELOMPOK 10 RPL)
-- Berkas Seed Data Awal Realistis (Idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SEED DATA: lokasi_kantor
-- ---------------------------------------------------------------------
INSERT INTO lokasi_kantor (id_lokasi, nama_kantor, alamat, latitude, longitude, radius_meter, status_aktif)
VALUES 
    (1, 'Kantor Cabang Palu', 'Jl. Soekarno-Hatta No. 10, Kel. Tondo, Kec. Mantikulore, Kota Palu, Sulawesi Tengah 94119', -0.8917000, 119.8872000, 50, TRUE),
    (2, 'Kantor Pusat', 'Jl. Sam Ratulangi No. 45, Kel. Besusu Barat, Kec. Palu Timur, Kota Palu, Sulawesi Tengah 94118', -0.8950000, 119.8800000, 100, TRUE)
ON CONFLICT (id_lokasi) DO UPDATE SET
    nama_kantor = EXCLUDED.nama_kantor,
    alamat = EXCLUDED.alamat,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    radius_meter = EXCLUDED.radius_meter,
    status_aktif = EXCLUDED.status_aktif,
    updated_at = CURRENT_TIMESTAMP;

-- Sinkronisasi sequence id_lokasi agar auto-increment tetap aman
SELECT setval('lokasi_kantor_id_lokasi_seq', COALESCE((SELECT MAX(id_lokasi) FROM lokasi_kantor), 1));


-- ---------------------------------------------------------------------
-- 2. SEED DATA: karyawan
-- Catatan Password Hash Bcrypt (Cost 10):
-- Admin (admin123)     : $2a$10$BjrSvBQ4pb4mA4LjvGaiFeUJvRSiMH95T5XnyvhA0sro0vfmPZq/2
-- Karyawan (karyawan123): $2a$10$.9Jrt2WXVri6Ip76fRohsu574ZUGBFruUdQC8gNDN8h4gelGtXu/2
-- ---------------------------------------------------------------------
INSERT INTO karyawan (nik, nama_lengkap, email, password_hash, nomor_telepon, jabatan, role, id_lokasi, jam_masuk_jadwal, jam_pulang_jadwal, status_aktif)
VALUES 
    (
        'ADM001',
        'HRD Administrator',
        'admin@absensi.com',
        '$2a$10$BjrSvBQ4pb4mA4LjvGaiFeUJvRSiMH95T5XnyvhA0sro0vfmPZq/2',
        '081234567890',
        'HR Manager & Admin Sistem',
        'ADMIN',
        2,
        '08:00:00',
        '17:00:00',
        TRUE
    ),
    (
        'F5512530109',
        'Ilham Arifin',
        'ilham@absensi.com',
        '$2a$10$.9Jrt2WXVri6Ip76fRohsu574ZUGBFruUdQC8gNDN8h4gelGtXu/2',
        '082199887766',
        'Staf IT',
        'KARYAWAN',
        1,
        '08:00:00',
        '17:00:00',
        TRUE
    ),
    (
        'F5512530110',
        'Andiardi',
        'andiardi@absensi.com',
        '$2a$10$.9Jrt2WXVri6Ip76fRohsu574ZUGBFruUdQC8gNDN8h4gelGtXu/2',
        '082199887767',
        'Staf Operasional',
        'KARYAWAN',
        1,
        '08:00:00',
        '17:00:00',
        TRUE
    ),
    (
        'F5512530112',
        'Dian Abdillah Melosovic',
        'dian@absensi.com',
        '$2a$10$.9Jrt2WXVri6Ip76fRohsu574ZUGBFruUdQC8gNDN8h4gelGtXu/2',
        '082199887768',
        'Staf Administrasi',
        'KARYAWAN',
        1,
        '08:00:00',
        '17:00:00',
        TRUE
    )
ON CONFLICT (nik) DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    nomor_telepon = EXCLUDED.nomor_telepon,
    jabatan = EXCLUDED.jabatan,
    role = EXCLUDED.role,
    id_lokasi = EXCLUDED.id_lokasi,
    jam_masuk_jadwal = EXCLUDED.jam_masuk_jadwal,
    jam_pulang_jadwal = EXCLUDED.jam_pulang_jadwal,
    status_aktif = EXCLUDED.status_aktif,
    updated_at = CURRENT_TIMESTAMP;


-- ---------------------------------------------------------------------
-- 3. SEED DATA: log_presensi
-- Riwayat Presensi Realistis: Hari Ini & Kemarin
-- ---------------------------------------------------------------------

-- Presensi Hari Ini (CURRENT_DATE)
INSERT INTO log_presensi (nik, id_lokasi, tanggal, jam, jenis_presensi, status_kehadiran, latitude, longitude, jarak_meter, url_foto, catatan_koreksi)
VALUES
    -- Ilham Arifin: Hadir Tepat Waktu pagi ini
    (
        'F5512530109',
        1,
        CURRENT_DATE,
        '07:55:12',
        'MASUK',
        'TEPAT_WAKTU',
        -0.8916950,
        119.8871950,
        12.50,
        'uploads/selfies/sample_f5512530109_today_masuk.jpg',
        NULL
    ),
    -- Andiardi: Terlambat pagi ini (> toleransi 08:15)
    (
        'F5512530110',
        1,
        CURRENT_DATE,
        '08:18:40',
        'MASUK',
        'TERLAMBAT',
        -0.8917200,
        119.8872100,
        24.30,
        'uploads/selfies/sample_f5512530110_today_masuk.jpg',
        'Terlambat karena kendala kemacetan perbaikan jalan'
    )
ON CONFLICT (nik, tanggal, jenis_presensi) DO NOTHING;

-- Presensi Kemarin (CURRENT_DATE - INTERVAL '1 day')
INSERT INTO log_presensi (nik, id_lokasi, tanggal, jam, jenis_presensi, status_kehadiran, latitude, longitude, jarak_meter, url_foto, diupdate_oleh, waktu_update, catatan_koreksi)
VALUES
    -- Ilham Arifin (Kemarin: Masuk & Pulang Lengkap)
    (
        'F5512530109',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '07:52:30',
        'MASUK',
        'TEPAT_WAKTU',
        -0.8916900,
        119.8872050,
        14.10,
        'uploads/selfies/sample_f5512530109_yesterday_masuk.jpg',
        NULL,
        NULL,
        NULL
    ),
    (
        'F5512530109',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '17:05:10',
        'PULANG',
        'PULANG_NORMAL',
        -0.8916850,
        119.8871900,
        18.20,
        'uploads/selfies/sample_f5512530109_yesterday_pulang.jpg',
        NULL,
        NULL,
        NULL
    ),

    -- Andiardi (Kemarin: Masuk & Pulang Lengkap)
    (
        'F5512530110',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '08:02:15',
        'MASUK',
        'TEPAT_WAKTU',
        -0.8917100,
        119.8872150,
        21.00,
        'uploads/selfies/sample_f5512530110_yesterday_masuk.jpg',
        NULL,
        NULL,
        NULL
    ),
    (
        'F5512530110',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '17:10:00',
        'PULANG',
        'PULANG_NORMAL',
        -0.8917050,
        119.8872000,
        20.50,
        'uploads/selfies/sample_f5512530110_yesterday_pulang.jpg',
        NULL,
        NULL,
        NULL
    ),

    -- Dian Abdillah Melosovic (Kemarin: Masuk Tepat Waktu, Pulang Cepat dengan Koreksi HRD)
    (
        'F5512530112',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '07:49:00',
        'MASUK',
        'TEPAT_WAKTU',
        -0.8916920,
        119.8871980,
        16.00,
        'uploads/selfies/sample_f5512530112_yesterday_masuk.jpg',
        NULL,
        NULL,
        NULL
    ),
    (
        'F5512530112',
        1,
        CURRENT_DATE - INTERVAL '1 day',
        '16:45:00',
        'PULANG',
        'PULANG_CEPAT',
        -0.8916880,
        119.8872020,
        15.30,
        'uploads/selfies/sample_f5512530112_yesterday_pulang.jpg',
        'ADM001',
        CURRENT_TIMESTAMP,
        'Karyawan izin pulang lebih awal karena ada jadwal kontrol kesehatan klinik'
    )
ON CONFLICT (nik, tanggal, jenis_presensi) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. SEED DATA: pengajuan_izin
-- Sampel Pengajuan Izin Realistis (Status Pending, Disetujui, Ditolak)
-- ---------------------------------------------------------------------
INSERT INTO pengajuan_izin (id_izin, nik, jenis_izin, tanggal_mulai, tanggal_selesai, alasan, url_bukti, status, diverifikasi_oleh, waktu_verifikasi, catatan_admin)
VALUES
    -- Dian Abdillah Melosovic: Izin Sakit hari ini s/d besok (Status PENDING)
    (
        1,
        'F5512530112',
        'SAKIT',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day',
        'Mengalami gejala demam dan flu berat, istirahat sesuai anjuran dokter puskesmas.',
        'uploads/leaves/surat_keterangan_sakit_dian.pdf',
        'PENDING',
        NULL,
        NULL,
        NULL
    ),

    -- Ilham Arifin: Tugas Luar minggu lalu (Status DISETUJUI)
    (
        2,
        'F5512530109',
        'TUGAS_LUAR',
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE - INTERVAL '4 days',
        'Pemasangan dan konfigurasi server jaringan intranet di kantor dinas mitra daerah Palu Barat.',
        'uploads/leaves/surat_tugas_luar_it_ilham.pdf',
        'DISETUJUI',
        'ADM001',
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        'Disetujui. Pastikan laporan berita acara serah terima teknis dilampirkan setelah pekerjaan selesai.'
    ),

    -- Andiardi: Cuti tahunan 2 minggu lalu (Status DITOLAK)
    (
        3,
        'F5512530110',
        'CUTI',
        CURRENT_DATE - INTERVAL '12 days',
        CURRENT_DATE - INTERVAL '10 days',
        'Permohonan cuti tahunan untuk menghadiri acara keluarga di luar kota.',
        NULL,
        'DITOLAK',
        'ADM001',
        CURRENT_TIMESTAMP - INTERVAL '11 days',
        'Mohon maaf saat ini belum dapat disetujui karena jadwal shift operasional tim sedang padat. Silakan jadwalkan ulang ke akhir bulan.'
    )
ON CONFLICT (id_izin) DO UPDATE SET
    nik = EXCLUDED.nik,
    jenis_izin = EXCLUDED.jenis_izin,
    tanggal_mulai = EXCLUDED.tanggal_mulai,
    tanggal_selesai = EXCLUDED.tanggal_selesai,
    alasan = EXCLUDED.alasan,
    url_bukti = EXCLUDED.url_bukti,
    status = EXCLUDED.status,
    diverifikasi_oleh = EXCLUDED.diverifikasi_oleh,
    waktu_verifikasi = EXCLUDED.waktu_verifikasi,
    catatan_admin = EXCLUDED.catatan_admin;

-- Sinkronisasi sequence id_izin agar auto-increment tetap aman
SELECT setval('pengajuan_izin_id_izin_seq', COALESCE((SELECT MAX(id_izin) FROM pengajuan_izin), 1));

-- Sinkronisasi sequence log_presensi jika ada
SELECT setval('log_presensi_id_presensi_seq', COALESCE((SELECT MAX(id_presensi) FROM log_presensi), 1));

