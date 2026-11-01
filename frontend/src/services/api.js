/**
 * API Service for Sistem Manajemen Absensi
 * Base URL defaults to Go Chi backend: http://localhost:8080/api/v1
 * Features automatic fallback to interactive mock data if backend server is not available.
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8080/api/v1';

// Reference Office: Kantor Cabang Palu
export const OFFICE_COORDS = {
  name: 'Kantor Cabang Palu',
  latitude: -0.8917000,
  longitude: 119.8872000,
  radiusMeters: 50
};

// Threshold toleransi akurasi GPS dalam meter (coords.accuracy <= 100m)
// Mencegah kecurangan atau manipulasi lokasi melalui triangulasi BTS seluler kasar
export const GPS_ACCURACY_THRESHOLD_METERS = 100;

/**
 * Validasi akurasi GPS: mengembalikan true jika coords.accuracy <= 100 meter
 */
export function isGpsAccuracyValid(accuracy) {
  if (accuracy === undefined || accuracy === null) return true;
  return Number(accuracy) <= GPS_ACCURACY_THRESHOLD_METERS;
}

/**
 * Helper akuisisi koordinat browser Geolocation dengan opsi presisi tinggi
 * dan verifikasi threshold akurasi.
 */
export function getCurrentCoordinates(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Perangkat atau peramban tidak mendukung Geolocation API'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const valid = isGpsAccuracyValid(accuracy);
        resolve({
          latitude,
          longitude,
          accuracy: Math.round(accuracy * 10) / 10,
          isValidAccuracy: valid,
          timestamp: pos.timestamp
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
        ...options
      }
    );
  });
}

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round((R * c) * 10) / 10;
}

/**
 * Calculate effective work duration between jamMasuk and jamPulang.
 * Returns { hours, minutes, totalMinutes, formatted: 'X Jam Y Menit' }
 */
export function calculateWorkDuration(jamMasuk, jamPulang) {
  if (!jamMasuk || !jamPulang) return null;

  const extractTime = (str) => {
    const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    return {
      h: parseInt(match[1], 10),
      m: parseInt(match[2], 10),
      s: match[3] ? parseInt(match[3], 10) : 0
    };
  };

  const t1 = extractTime(jamMasuk);
  const t2 = extractTime(jamPulang);
  if (!t1 || !t2) return null;

  const sec1 = t1.h * 3600 + t1.m * 60 + t1.s;
  const sec2 = t2.h * 3600 + t2.m * 60 + t2.s;

  let diffSec = sec2 - sec1;
  if (diffSec < 0) {
    diffSec += 24 * 3600; // shift crossed midnight
  }

  const totalMinutes = Math.floor(diffSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    formatted: `${hours} Jam ${minutes} Menit`
  };
}

// In-Memory Mock State for Offline / Standalone Testing
let mockAttendanceState = {
  tanggal: new Date().toISOString().slice(0, 10),
  sudah_masuk: false,
  sudah_pulang: false,
  masuk: null,
  pulang: null,
  total_jam_kerja: '',
  durasi_menit: 0
};

export let mockLocations = [
  {
    id_lokasi: 1,
    nama_kantor: 'Kantor Cabang Palu',
    alamat: 'Jl. Soekarno-Hatta No. 10, Kel. Tondo, Kec. Mantikulore, Kota Palu, Sulawesi Tengah 94119',
    latitude: -0.8917000,
    longitude: 119.8872000,
    radius_meter: 50,
    status_aktif: true,
    created_at: '2026-01-01T08:00:00Z'
  },
  {
    id_lokasi: 2,
    nama_kantor: 'Kantor Pusat',
    alamat: 'Jl. Sam Ratulangi No. 45, Kel. Besusu Barat, Kec. Palu Timur, Kota Palu, Sulawesi Tengah 94118',
    latitude: -0.8950000,
    longitude: 119.8800000,
    radius_meter: 100,
    status_aktif: true,
    created_at: '2026-01-01T08:00:00Z'
  }
];

export let mockEmployees = [
  {
    nik: 'ADM001',
    nama_lengkap: 'Admin HRD Utama',
    email: 'admin@absensi.com',
    nomor_telepon: '081234567890',
    jabatan: 'HRD Lead Manager',
    role: 'ADMIN',
    id_lokasi: 2,
    cabang: 'Kantor Pusat',
    nama_kantor: 'Kantor Pusat',
    jadwal: '08:00 - 17:00 WITA',
    jam_masuk_jadwal: '08:00:00',
    jam_pulang_jadwal: '17:00:00',
    status_aktif: true,
    created_at: '2026-01-01T08:00:00Z'
  },
  {
    nik: 'F5512530109',
    nama_lengkap: 'Ilham Arifin',
    email: 'ilham@absensi.com',
    nomor_telepon: '082199887766',
    jabatan: 'Fullstack Developer',
    role: 'KARYAWAN',
    id_lokasi: 1,
    cabang: 'Kantor Cabang Palu',
    nama_kantor: 'Kantor Cabang Palu',
    jadwal: '08:00 - 17:00 WITA',
    jam_masuk_jadwal: '08:00:00',
    jam_pulang_jadwal: '17:00:00',
    status_aktif: true,
    created_at: '2026-01-10T08:00:00Z'
  },
  {
    nik: 'F5512530110',
    nama_lengkap: 'Andiardi',
    email: 'andiardi@absensi.com',
    nomor_telepon: '082211445566',
    jabatan: 'Mobile Application Engineer',
    role: 'KARYAWAN',
    id_lokasi: 1,
    cabang: 'Kantor Cabang Palu',
    nama_kantor: 'Kantor Cabang Palu',
    jadwal: '08:00 - 17:00 WITA',
    jam_masuk_jadwal: '08:00:00',
    jam_pulang_jadwal: '17:00:00',
    status_aktif: true,
    created_at: '2026-01-12T08:00:00Z'
  },
  {
    nik: 'F5512530112',
    nama_lengkap: 'Dian Abdillah Melosovic',
    email: 'dian@absensi.com',
    nomor_telepon: '085233441122',
    jabatan: 'QA & Test Automation Specialist',
    role: 'KARYAWAN',
    id_lokasi: 1,
    cabang: 'Kantor Cabang Palu',
    nama_kantor: 'Kantor Cabang Palu',
    jadwal: '08:00 - 17:00 WITA',
    jam_masuk_jadwal: '08:00:00',
    jam_pulang_jadwal: '17:00:00',
    status_aktif: true,
    created_at: '2026-01-15T08:00:00Z'
  }
];

export let mockAccounts = [
  {
    nik: 'ADM001',
    email: 'admin@absensi.com',
    passwords: ['admin123', 'password123'],
    user: mockEmployees[0]
  },
  {
    nik: 'F5512530109',
    email: 'ilham@absensi.com',
    passwords: ['karyawan123', 'password123'],
    user: mockEmployees[1]
  },
  {
    nik: 'F5512530110',
    email: 'andiardi@absensi.com',
    passwords: ['karyawan123', 'password123'],
    user: mockEmployees[2]
  },
  {
    nik: 'F5512530112',
    email: 'dian@absensi.com',
    passwords: ['karyawan123', 'password123'],
    user: mockEmployees[3]
  }
];

// =====================================================================
// MANAJEMEN KUOTA CUTI TAHUNAN & BUKTI DOKUMEN (FITUR F-04)
// =====================================================================

export const DEFAULT_ANNUAL_LEAVE_QUOTA = 12;

/**
 * Menghitung selisih hari inklusif antara dua tanggal YYYY-MM-DD
 */
export function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Menghitung kalkulasi sisa kuota cuti tahunan per karyawan.
 * ATURAN BISNIS: HANYA jenis 'CUTI' yang memotong saldo 12 hari/tahun.
 * Jenis Sakit, Tugas Luar, dan Izin TIDAK memotong saldo kuota cuti tahunan.
 */
export function calculateEmployeeLeaveQuota(nik, leavesList = mockLeaves, baseQuota = DEFAULT_ANNUAL_LEAVE_QUOTA) {
  const targetNik = (nik || '').toUpperCase();
  const list = Array.isArray(leavesList) ? leavesList : mockLeaves;
  const employeeLeaves = list.filter(l => (l.nik || '').toUpperCase() === targetNik);

  let usedDays = 0;
  let pendingDays = 0;

  employeeLeaves.forEach(leaf => {
    const jenis = (leaf.jenis_izin || leaf.jenis || '').toUpperCase().trim();
    if (jenis === 'CUTI') {
      const days = Number(leaf.total_hari) || calculateLeaveDays(leaf.tanggal_mulai, leaf.tanggal_selesai);
      const st = (leaf.status || '').toUpperCase().trim();
      if (st === 'DISETUJUI') {
        usedDays += days;
      } else if (st === 'PENDING') {
        pendingDays += days;
      }
    }
  });

  const remainingDays = Math.max(0, baseQuota - usedDays);
  const projectedRemaining = Math.max(0, remainingDays - pendingDays);

  return {
    nik: targetNik,
    baseQuota,
    usedDays,
    pendingDays,
    remainingDays,
    projectedRemaining,
    isExhausted: remainingDays <= 0
  };
}

export const DEFAULT_MEDICAL_CERT_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820"><rect width="600" height="820" fill="%23FCFDFC" stroke="%231E2322" stroke-width="4"/><rect x="16" y="16" width="568" height="788" fill="none" stroke="%231E2322" stroke-width="1.5" stroke-dasharray="6,4"/><circle cx="70" cy="70" r="30" fill="%23E6F4EA" stroke="%23059669" stroke-width="2"/><path d="M70 52 V88 M52 70 H88" stroke="%23059669" stroke-width="8" stroke-linecap="round"/><text x="120" y="58" font-family="sans-serif" font-size="18" font-weight="900" fill="%231E2322">KLINIK PRATAMA MEDIKA TADULAKO</text><text x="120" y="76" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23059669">IZIN OPERASIONAL DINKES KOTA PALU: NO. 440/0812/DINKES/2022</text><text x="120" y="92" font-family="sans-serif" font-size="10" fill="%2358615E">Jl. Soekarno-Hatta Km. 9, Palu Timur, Sulawesi Tengah • Telp: (0451) 429188</text><line x1="30" y1="112" x2="570" y2="112" stroke="%231E2322" stroke-width="3"/><line x1="30" y1="116" x2="570" y2="116" stroke="%231E2322" stroke-width="1"/><rect x="130" y="135" width="340" height="34" rx="6" fill="%231E2322"/><text x="300" y="157" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23EFF3ED" text-anchor="middle" letter-spacing="1">SURAT KETERANGAN DOKTER</text><text x="300" y="185" font-family="monospace" font-size="11" fill="%231E2322" text-anchor="middle" font-weight="bold">Nomor: 442/SKD-MED/X/2026</text><text x="50" y="225" font-family="sans-serif" font-size="12" fill="%231E2322">Yang bertanda tangan di bawah ini, Dokter Pemeriksa Klinik Medika Tadulako,</text><text x="50" y="245" font-family="sans-serif" font-size="12" fill="%231E2322">menerangkan dengan sesungguhnya bahwa:</text><rect x="50" y="265" width="500" height="150" rx="8" fill="%23F4F7F4" stroke="%231E2322" stroke-width="1.5"/><text x="70" y="295" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Nama Pasien</text><text x="190" y="295" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231E2322">: Dian Abdillah Melosovic</text><text x="70" y="325" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Nomor Induk (NIK)</text><text x="190" y="325" font-family="monospace" font-size="12" font-weight="bold" fill="%231E2322">: F5512530112</text><text x="70" y="355" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Unit Kerja / Cabang</text><text x="190" y="355" font-family="sans-serif" font-size="12" fill="%231E2322">: QA Automation / Kantor Cabang Palu (Untad)</text><text x="70" y="385" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Diagnosa Klinis</text><text x="190" y="385" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23DC2626">: Febris e.c. Infeksi Saluran Pernapasan Akut (ISPA)</text><text x="50" y="445" font-family="sans-serif" font-size="12" fill="%231E2322">Berhubung keadaan kesehatannya, pasien tersebut di atas memerlukan istirahat</text><text x="50" y="468" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231E2322">selama 2 (dua) hari terhitung sejak tanggal 28 Oktober s/d 29 Oktober 2026.</text><text x="50" y="500" font-family="sans-serif" font-size="11" fill="%2358615E">Demikian surat keterangan ini diberikan dengan benar untuk dapat dipergunakan sebagaimana mestinya.</text><g transform="translate(350, 550)"><text x="0" y="0" font-family="sans-serif" font-size="11" fill="%231E2322">Palu, 28 Oktober 2026</text><text x="0" y="18" font-family="sans-serif" font-size="11" font-weight="bold" fill="%231E2322">Dokter Pemeriksa,</text><path d="M10 50 Q30 20 60 55 T100 40 T140 60" fill="none" stroke="%231E3A8A" stroke-width="2.5" stroke-linecap="round"/><circle cx="70" cy="50" r="42" fill="none" stroke="%231E40AF" stroke-width="2.5" stroke-dasharray="8,2" opacity="0.85"/><circle cx="70" cy="50" r="36" fill="none" stroke="%231E40AF" stroke-width="1" opacity="0.85"/><text x="70" y="40" font-family="sans-serif" font-size="7" font-weight="bold" fill="%231E40AF" text-anchor="middle" opacity="0.85">KLINIK MEDIKA PALU</text><text x="70" y="54" font-family="sans-serif" font-size="8" font-weight="900" fill="%231E40AF" text-anchor="middle" opacity="0.85">★ RESMI ★</text><text x="70" y="66" font-family="sans-serif" font-size="6" font-weight="bold" fill="%231E40AF" text-anchor="middle" opacity="0.85">KOTA PALU</text><text x="0" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="%231E2322" text-decoration="underline">dr. Hendra Pratama, Sp.PD</text><text x="0" y="110" font-family="monospace" font-size="9" fill="%2358615E">SIP: 503/442/SIP-D/DPMPTSP/2024</text></g><rect x="30" y="750" width="540" height="30" rx="6" fill="%231E2322"/><text x="300" y="769" font-family="monospace" font-size="10" font-weight="bold" fill="%2334D399" text-anchor="middle">AUTHENTIC MEDICAL RECORD VERIFIED • QR ID: MED-2026-F5512530112</text></svg>`;

export const DEFAULT_DUTY_LETTER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="820" viewBox="0 0 600 820"><rect width="600" height="820" fill="%23FCFDFC" stroke="%231E2322" stroke-width="4"/><rect x="16" y="16" width="568" height="788" fill="none" stroke="%231E2322" stroke-width="1.5" stroke-dasharray="6,4"/><text x="300" y="60" font-family="sans-serif" font-size="16" font-weight="900" fill="%231E2322" text-anchor="middle">SISTEM MANAJEMEN OPERASIONAL TERPADU</text><text x="300" y="78" font-family="sans-serif" font-size="10" font-weight="bold" fill="%2358615E" text-anchor="middle">KANTOR PUSAT &amp; CABANG SULAWESI TENGAH</text><line x1="30" y1="95" x2="570" y2="95" stroke="%231E2322" stroke-width="2.5"/><rect x="160" y="115" width="280" height="30" rx="6" fill="%231E2322"/><text x="300" y="135" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23EFF3ED" text-anchor="middle">SURAT PENUGASAN DINAS LUAR</text><text x="300" y="165" font-family="monospace" font-size="11" fill="%231E2322" text-anchor="middle" font-weight="bold">Nomor: ST/104/OPS-IT/X/2026</text><text x="50" y="210" font-family="sans-serif" font-size="12" fill="%231E2322">Pimpinan Operasional menugaskan kepada staf teknis berikut:</text><rect x="50" y="230" width="500" height="130" rx="8" fill="%23F4F7F4" stroke="%231E2322" stroke-width="1.5"/><text x="70" y="260" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Nama Karyawan</text><text x="190" y="260" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231E2322">: Ilham Arifin</text><text x="70" y="290" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Nomor Induk (NIK)</text><text x="190" y="290" font-family="monospace" font-size="12" font-weight="bold" fill="%231E2322">: F5512530109</text><text x="70" y="320" font-family="sans-serif" font-size="11" font-weight="bold" fill="%2358615E">Tugas &amp; Tujuan</text><text x="190" y="320" font-family="sans-serif" font-size="12" fill="%231E2322">: Pemasangan Server Jaringan Intranet Palu Barat</text><text x="50" y="390" font-family="sans-serif" font-size="12" fill="%231E2322">Pelaksanaan tugas dinas luar dijadwalkan pada:</text><text x="50" y="415" font-family="sans-serif" font-size="12" font-weight="bold" fill="%231E2322">Tanggal 20 Oktober 2026 s/d 21 Oktober 2026 (2 Hari Kerja)</text><g transform="translate(350, 520)"><text x="0" y="0" font-family="sans-serif" font-size="11" fill="%231E2322">Palu, 19 Oktober 2026</text><text x="0" y="18" font-family="sans-serif" font-size="11" font-weight="bold" fill="%231E2322">Manajer HRD &amp; Operasional,</text><path d="M10 50 Q35 25 70 50 T130 55" fill="none" stroke="%231E2322" stroke-width="2.5" stroke-linecap="round"/><circle cx="70" cy="50" r="38" fill="none" stroke="%230284C7" stroke-width="2" stroke-dasharray="6,2" opacity="0.85"/><text x="70" y="54" font-family="sans-serif" font-size="7" font-weight="bold" fill="%230284C7" text-anchor="middle" opacity="0.85">DIVISI OPERASIONAL</text><text x="0" y="90" font-family="sans-serif" font-size="11" font-weight="bold" fill="%231E2322">Admin HRD Utama (ADM001)</text></g><rect x="30" y="750" width="540" height="30" rx="6" fill="%231E2322"/><text x="300" y="769" font-family="monospace" font-size="10" font-weight="bold" fill="%2338BDF8" text-anchor="middle">OFFICIAL ASSIGNMENT ORDER • VERIFIED ST-2026-IT-109</text></svg>`;

export let mockLeaves = [
  {
    id_izin: 1,
    nik: 'F5512530112',
    nama_karyawan: 'Dian Abdillah Melosovic',
    nama_lengkap: 'Dian Abdillah Melosovic',
    jabatan: 'QA & Test Automation Specialist',
    jenis_izin: 'SAKIT',
    tanggal_mulai: '2026-10-28',
    tanggal_selesai: '2026-10-29',
    total_hari: 2,
    alasan: 'Mengalami gejala demam tinggi dan flu berat, istirahat rawat jalan sesuai anjuran dokter puskesmas.',
    url_bukti: DEFAULT_MEDICAL_CERT_SVG,
    status: 'PENDING',
    diverifikasi_oleh: null,
    waktu_verifikasi: null,
    catatan_admin: null,
    created_at: '2026-10-28T07:30:00Z'
  },
  {
    id_izin: 2,
    nik: 'F5512530110',
    nama_karyawan: 'Andiardi',
    nama_lengkap: 'Andiardi',
    jabatan: 'Mobile Application Engineer',
    jenis_izin: 'CUTI',
    tanggal_mulai: '2026-11-03',
    tanggal_selesai: '2026-11-05',
    total_hari: 3,
    alasan: 'Mengajukan hak cuti tahunan untuk keperluan mendesak keluarga di kampung halaman.',
    url_bukti: null,
    status: 'PENDING',
    diverifikasi_oleh: null,
    waktu_verifikasi: null,
    catatan_admin: null,
    created_at: '2026-10-28T09:15:00Z'
  },
  {
    id_izin: 3,
    nik: 'F5512530109',
    nama_karyawan: 'Ilham Arifin',
    nama_lengkap: 'Ilham Arifin',
    jabatan: 'Fullstack Developer',
    jenis_izin: 'CUTI',
    tanggal_mulai: '2026-09-15',
    tanggal_selesai: '2026-09-16',
    total_hari: 2,
    alasan: 'Cuti tahunan untuk menghadiri pernikahan adik kandung.',
    url_bukti: null,
    status: 'DISETUJUI',
    diverifikasi_oleh: 'ADM001',
    waktu_verifikasi: '2026-09-14 10:00:00',
    catatan_admin: 'Disetujui. Selamat atas pernikahan keluarga, kuota cuti tahunan terpotong 2 hari.',
    created_at: '2026-09-13T14:20:00Z'
  },
  {
    id_izin: 4,
    nik: 'F5512530109',
    nama_karyawan: 'Ilham Arifin',
    nama_lengkap: 'Ilham Arifin',
    jabatan: 'Fullstack Developer',
    jenis_izin: 'TUGAS_LUAR',
    tanggal_mulai: '2026-10-20',
    tanggal_selesai: '2026-10-21',
    total_hari: 2,
    alasan: 'Pemasangan dan konfigurasi server jaringan intranet di kantor dinas mitra daerah Palu Barat.',
    url_bukti: DEFAULT_DUTY_LETTER_SVG,
    status: 'DISETUJUI',
    diverifikasi_oleh: 'ADM001',
    waktu_verifikasi: '2026-10-19 11:30:00',
    catatan_admin: 'Disetujui. Pastikan laporan berita acara serah terima teknis dilampirkan setelah pekerjaan selesai.',
    created_at: '2026-10-18T16:00:00Z'
  },
  {
    id_izin: 5,
    nik: 'F5512530110',
    nama_karyawan: 'Andiardi',
    nama_lengkap: 'Andiardi',
    jabatan: 'Mobile Application Engineer',
    jenis_izin: 'CUTI',
    tanggal_mulai: '2026-10-12',
    tanggal_selesai: '2026-10-14',
    total_hari: 3,
    alasan: 'Permohonan cuti tahunan liburan ke Bali.',
    url_bukti: null,
    status: 'DITOLAK',
    diverifikasi_oleh: 'ADM001',
    waktu_verifikasi: '2026-10-11 13:45:00',
    catatan_admin: 'Mohon maaf permohonan cuti belum dapat disetujui karena jadwal rilis sprint v2.0 sedang berlangsung.',
    created_at: '2026-10-10T10:00:00Z'
  },
  {
    id_izin: 6,
    nik: 'F5512530112',
    nama_karyawan: 'Dian Abdillah Melosovic',
    nama_lengkap: 'Dian Abdillah Melosovic',
    jabatan: 'QA & Test Automation Specialist',
    jenis_izin: 'IZIN',
    tanggal_mulai: '2026-10-22',
    tanggal_selesai: '2026-10-22',
    total_hari: 1,
    alasan: 'Urusan administrasi perpanjangan berkas kependudukan di Dukcapil Palu.',
    url_bukti: null,
    status: 'DISETUJUI',
    diverifikasi_oleh: 'ADM001',
    waktu_verifikasi: '2026-10-21 15:20:00',
    catatan_admin: 'Disetujui. Selesaikan tugas harian sebelum meninggalkan kantor.',
    created_at: '2026-10-21T08:10:00Z'
  }
];

export let mockLogs = [
  {
    id: 1,
    nik: 'F5512530109',
    nama: 'Ilham Arifin',
    jabatan: 'Fullstack Developer',
    cabang: 'Kantor Cabang Palu',
    jamMasuk: '08:04:12',
    jamPulang: '17:05:00',
    jarak: 18.4,
    status: 'TEPAT_WAKTU',
    fotoUrl: null,
    keterangan: 'Tepat Waktu'
  },
  {
    id: 2,
    nik: 'F5512530110',
    nama: 'Andiardi',
    jabatan: 'Mobile Application Engineer',
    cabang: 'Kantor Cabang Palu',
    jamMasuk: '08:24:05',
    jamPulang: '17:15:30',
    jarak: 24.1,
    status: 'TERLAMBAT',
    fotoUrl: null,
    keterangan: 'Terlambat 9 menit (lewat toleransi)'
  },
  {
    id: 3,
    nik: 'F5512530112',
    nama: 'Dian Abdillah Melosovic',
    jabatan: 'QA & Test Automation Specialist',
    cabang: 'Kantor Cabang Palu',
    jamMasuk: '--:--:--',
    jamPulang: '--:--:--',
    jarak: 0,
    status: 'IZIN_SAKIT',
    fotoUrl: null,
    keterangan: 'Surat Keterangan Dokter (ISPA)'
  },
  {
    id: 4,
    nik: 'ADM001',
    nama: 'Admin HRD Utama',
    jabatan: 'HRD Lead Manager',
    cabang: 'Kantor Pusat',
    jamMasuk: '07:55:10',
    jamPulang: '17:02:40',
    jarak: 12.0,
    status: 'TEPAT_WAKTU',
    fotoUrl: null,
    keterangan: 'Tepat Waktu'
  },
  {
    id: 5,
    nik: 'F5512530101',
    nama: 'Rizky Firmansyah',
    jabatan: 'Network & System Administrator',
    cabang: 'Kantor Cabang Palu',
    jamMasuk: '08:09:44',
    jamPulang: '17:08:15',
    jarak: 15.2,
    status: 'TEPAT_WAKTU',
    fotoUrl: null,
    keterangan: 'Tepat Waktu'
  },
  {
    id: 6,
    nik: 'F5512530105',
    nama: 'Nur Fadilah Safitri',
    jabatan: 'UI/UX Product Designer',
    cabang: 'Kantor Pusat',
    jamMasuk: '08:18:20',
    jamPulang: '17:12:00',
    jarak: 32.5,
    status: 'TERLAMBAT',
    fotoUrl: null,
    keterangan: 'Terlambat 3 menit'
  }
];

export let mockAuditTrail = [
  {
    id: 1,
    id_presensi: 2,
    nik: 'F5512530110',
    nama_karyawan: 'Andiardi',
    jabatan: 'Mobile Application Engineer',
    cabang: 'Kantor Cabang Palu',
    status_lama: 'ALPHA',
    status_baru: 'TERLAMBAT',
    diupdate_oleh: 'ADM001',
    nama_admin: 'Admin HRD Utama',
    waktu_update: '2026-10-28 09:30:14',
    alasan_koreksi: 'Staf mengalami kendala sinkronisasi sinyal GPS di area basement, diverifikasi hadir 08:24 WITA.',
    verifikasi_hash: 'SEC-AUD-882194'
  },
  {
    id: 2,
    id_presensi: 1,
    nik: 'F5512530109',
    nama_karyawan: 'Ilham Arifin',
    jabatan: 'Fullstack Developer',
    cabang: 'Kantor Cabang Palu',
    status_lama: 'HADIR_MANUAL',
    status_baru: 'TEPAT_WAKTU',
    diupdate_oleh: 'ADM001',
    nama_admin: 'Admin HRD Utama',
    waktu_update: '2026-10-27 16:45:00',
    alasan_koreksi: 'Verifikasi surat penugasan asistensi perbaikan server lokal Untad telah disahkan oleh Kaprodi.',
    verifikasi_hash: 'SEC-AUD-771203'
  }
];

export let mockAdminActivities = [
  {
    id: 1,
    tipe: 'IZIN_BARU',
    icon: 'ph-bold ph-first-aid',
    badgeColor: 'purple',
    judul: '1 Permohonan Izin Baru Masuk',
    deskripsi: 'Dian Abdillah M. (QA Specialist) mengajukan Izin Sakit 2 hari dengan Surat Dokter.',
    waktu: '10 menit yang lalu',
    timestamp: '2026-10-28 09:15:00',
    actionTab: 'izin'
  },
  {
    id: 2,
    tipe: 'TERLAMBAT',
    icon: 'ph-bold ph-clock-countdown',
    badgeColor: 'amber',
    judul: 'Keterlambatan Presensi Terdeteksi',
    deskripsi: 'Andiardi tercatat masuk pukul 08:24 WITA (+9 mnt lewat batas toleransi kantor).',
    waktu: '25 menit yang lalu',
    timestamp: '2026-10-28 08:24:05',
    actionTab: 'presensi'
  },
  {
    id: 3,
    tipe: 'PRESENSI_SUKSES',
    icon: 'ph-bold ph-check-circle',
    badgeColor: 'emerald',
    judul: 'Log Presensi Hari Ini Aktif',
    deskripsi: 'Ilham Arifin melakukan presensi Tepat Waktu (08:04 WITA) di Kantor Cabang Palu (18.4m).',
    waktu: '45 menit yang lalu',
    timestamp: '2026-10-28 08:04:12',
    actionTab: 'presensi'
  },
  {
    id: 4,
    tipe: 'AUDIT_KOREKSI',
    icon: 'ph-bold ph-shield-check',
    badgeColor: 'blue',
    judul: 'Audit Koreksi Presensi Tersimpan',
    deskripsi: 'Admin ADM001 memperbarui catatan presensi staf Andiardi dengan catatan teknis terverifikasi.',
    waktu: '1 jam yang lalu',
    timestamp: '2026-10-28 07:45:00',
    actionTab: 'audit'
  },
  {
    id: 5,
    tipe: 'GEOFENCE_STATUS',
    icon: 'ph-bold ph-map-pin',
    badgeColor: 'ink',
    judul: 'Geofence 2 Cabang Beroperasi Normal',
    deskripsi: 'Radius Geofence Cabang Palu (50m) dan Kantor Pusat (100m) sinkron dengan koordinat satelit.',
    waktu: '2 jam yang lalu',
    timestamp: '2026-10-28 07:00:00',
    actionTab: 'lokasi'
  }
];

let mockStats = {
  totalPegawai: 120,
  tepatWaktu: 98,
  terlambat: 14,
  izinSakit: 8
};

// Simulated latency helper
const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// Storage Keys
export const TOKEN_STORAGE_KEY = 'auth_token';
export const USER_STORAGE_KEY = 'auth_user';

/**
 * Retrieve saved JWT token from localStorage
 */
export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Retrieve saved user profile object from localStorage
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Save or clear JWT token and user profile in localStorage
 */
export function setStoredToken(token, user = null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      }
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

/**
 * Authenticate user with identifier (Email or NIK) & password
 */
export async function loginUser(identifier, password) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    throw new Error('Email/NIK dan Kata Sandi wajib diisi.');
  }

  // Attempt real backend call first
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Kredensial login tidak cocok.');
    }

    const { token, user } = json.data;
    if (user && !user.cabang && user.nama_kantor) {
      user.cabang = user.nama_kantor;
    }
    if (user && !user.jadwal && user.jam_masuk_jadwal && user.jam_pulang_jadwal) {
      user.jadwal = `${user.jam_masuk_jadwal.slice(0, 5)} - ${user.jam_pulang_jadwal.slice(0, 5)} WITA`;
    }
    setStoredToken(token, user);
    return { token, user };
  } catch (backendError) {
    // If backend responded with an error (HTTP 400/401/etc.), rethrow backend message
    if (backendError.message && !backendError.message.includes('fetch') && !backendError.message.includes('NetworkError') && !backendError.message.includes('Failed to fetch')) {
      throw backendError;
    }

    // Backend is offline / unreachable: Fallback Mock Authentication
    await delay(300);

    const matchedAccount = mockAccounts.find(acc =>
      (acc.email.toLowerCase() === cleanId.toLowerCase() || acc.nik.toLowerCase() === cleanId.toLowerCase()) &&
      acc.passwords.includes(cleanPass)
    );

    if (!matchedAccount) {
      throw new Error('Kredensial login tidak cocok. Pastikan Email/NIK dan Kata Sandi benar.');
    }

    if (matchedAccount.user.status_aktif === false) {
      throw new Error('Akun Anda saat ini dinonaktifkan. Silakan hubungi Admin HRD.');
    }

    const mockToken = `mock_jwt_token_${matchedAccount.user.nik}_${Date.now()}`;
    setStoredToken(mockToken, matchedAccount.user);
    return {
      token: mockToken,
      user: matchedAccount.user
    };
  }
}

/**
 * Logout user by clearing stored token and session
 */
export function logoutUser() {
  setStoredToken(null, null);
  mockAttendanceState = {
    tanggal: new Date().toISOString().slice(0, 10),
    sudah_masuk: false,
    sudah_pulang: false,
    masuk: null,
    pulang: null,
    total_jam_kerja: '',
    durasi_menit: 0
  };
  return true;
}

/**
 * 1. Get Current User Profile (validates stored session)
 */
export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const user = data.data;
      if (!user.cabang && user.nama_kantor) {
        user.cabang = user.nama_kantor;
      }
      if (!user.jadwal && user.jam_masuk_jadwal && user.jam_pulang_jadwal) {
        user.jadwal = `${user.jam_masuk_jadwal.slice(0, 5)} - ${user.jam_pulang_jadwal.slice(0, 5)} WITA`;
      }
      setStoredToken(token, user);
      return user;
    } else if (res.status === 401) {
      logoutUser();
      return null;
    }
  } catch (err) {
    // Backend offline: use fallback from stored profile
  }

  const stored = getStoredUser();
  if (stored) {
    return stored;
  }

  return {
    nik: 'F5512530109',
    nama_lengkap: 'Ilham Arifin',
    email: 'ilham@absensi.com',
    jabatan: 'Fullstack Developer',
    role: 'KARYAWAN',
    cabang: 'Cabang Palu',
    jadwal: '08:00 - 17:00 WITA',
    status_aktif: true
  };
}

/**
 * 2. Get Today's Attendance Status
 */
export async function getTodayAttendance() {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/attendance/today`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(150);
  return mockAttendanceState;
}

/**
 * 3. Punch Attendance (MASUK or PULANG)
 * Supports Multipart Form Data with Selfie Image & Coordinates
 */
export async function punchAttendance({ jenis = 'MASUK', latitude, longitude, accuracy, photoBlob, photoDataUrl }) {
  // Validasi Threshold Akurasi GPS (coords.accuracy <= 100m)
  // Mencegah kecurangan manipulasi sinyal triangulasi BTS seluler kasar
  if (accuracy !== undefined && accuracy !== null && Number(accuracy) > GPS_ACCURACY_THRESHOLD_METERS) {
    const error = new Error(
      `Presensi ditolak. Akurasi sinyal GPS terlalu rendah (±${Math.round(accuracy)}m > ${GPS_ACCURACY_THRESHOLD_METERS}m). Terdeteksi sinyal triangulasi seluler kasar / GPS indoor. Mohon aktifkan GPS satelit presisi tinggi dan berada di area terbuka.`
    );
    error.code = 'LOW_GPS_ACCURACY';
    throw error;
  }

  const currentDist = calculateDistance(
    latitude || OFFICE_COORDS.latitude,
    longitude || OFFICE_COORDS.longitude,
    OFFICE_COORDS.latitude,
    OFFICE_COORDS.longitude
  );

  // Attempt real backend call
  try {
    const formData = new FormData();
    formData.append('jenis', jenis);
    formData.append('latitude', latitude ?? OFFICE_COORDS.latitude);
    formData.append('longitude', longitude ?? OFFICE_COORDS.longitude);
    if (accuracy !== undefined && accuracy !== null) {
      formData.append('accuracy', accuracy);
    }
    if (photoBlob) {
      formData.append('foto', photoBlob, `selfie_${Date.now()}.jpg`);
    }

    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/attendance/punch`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal mencatat presensi');
    }
    return json;
  } catch (backendError) {
    // If backend connection fails or returned error, evaluate mock behavior
    // If backend actually responded with 400 (e.g. Geofence violation), rethrow
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }

    // Backend is offline: execute reliable mock fallback logic
    await delay(350);

    // Validate Geofence (Maximum 50m)
    if (currentDist > OFFICE_COORDS.radiusMeters) {
      const error = new Error(`Presensi ditolak. Anda berada di luar radius kantor (Jarak: ${currentDist} meter, Maksimal: ${OFFICE_COORDS.radiusMeters} meter)`);
      error.code = 'OUT_OF_GEOFENCE';
      throw error;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const dateStr = now.toISOString().slice(0, 10);

    // Update in-memory mock state
    if (jenis === 'MASUK') {
      if (mockAttendanceState.masuk || mockAttendanceState.sudah_masuk) {
        throw new Error('Anda telah melakukan presensi masuk untuk hari ini');
      }

      // Determine status: Late if after 08:15:00
      const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);
      const status = isLate ? 'TERLAMBAT' : 'TEPAT_WAKTU';

      const entry = {
        id_presensi: Date.now(),
        tanggal: dateStr,
        jam: timeStr,
        jenis_presensi: 'MASUK',
        status_kehadiran: status,
        status: status,
        jarak_meter: currentDist,
        jarak: currentDist,
        akurasi_meter: accuracy !== undefined && accuracy !== null ? Math.round(accuracy) : 12,
        url_foto: photoDataUrl || null,
        foto: photoDataUrl || null
      };

      mockAttendanceState.sudah_masuk = true;
      mockAttendanceState.masuk = entry;

      // Prepend to mock logs table
      mockLogs = [
        {
          id: entry.id_presensi,
          nik: 'F5512530109',
          nama: 'Ilham Arifin',
          cabang: 'Cabang Palu',
          jamMasuk: timeStr,
          jarak: currentDist,
          akurasi: accuracy !== undefined && accuracy !== null ? Math.round(accuracy) : 12,
          status: status,
          fotoUrl: photoDataUrl,
          keterangan: isLate ? 'Terlambat' : 'Tepat Waktu'
        },
        ...mockLogs.filter(l => !(l.nik === 'F5512530109' && l.jamMasuk.length > 0))
      ];

      if (status === 'TEPAT_WAKTU') {
        mockStats.tepatWaktu += 1;
      } else {
        mockStats.terlambat += 1;
      }

      return {
        success: true,
        message: 'Presensi masuk berhasil dicatat',
        data: entry
      };
    } else {
      // Clock-Out (PULANG)
      if (!mockAttendanceState.masuk && !mockAttendanceState.sudah_masuk) {
        throw new Error('Anda belum melakukan presensi masuk hari ini');
      }
      if (mockAttendanceState.pulang || mockAttendanceState.sudah_pulang) {
        throw new Error('Anda telah melakukan presensi pulang untuk hari ini');
      }

      // Evaluasi status: PULANG_CEPAT jika < 17:00, sebaliknya PULANG_NORMAL
      const isEarly = now.getHours() < 17;
      const status = isEarly ? 'PULANG_CEPAT' : 'PULANG_NORMAL';

      const entry = {
        id_presensi: Date.now(),
        tanggal: dateStr,
        jam: timeStr,
        jenis_presensi: 'PULANG',
        status_kehadiran: status,
        status: status,
        jarak_meter: currentDist,
        jarak: currentDist,
        akurasi_meter: accuracy !== undefined && accuracy !== null ? Math.round(accuracy) : 12,
        url_foto: photoDataUrl || null,
        foto: photoDataUrl || null
      };

      mockAttendanceState.sudah_pulang = true;
      mockAttendanceState.pulang = entry;

      // Kalkulasi otomatis total durasi kerja efektif hari itu
      const duration = calculateWorkDuration(mockAttendanceState.masuk.jam, timeStr);
      if (duration) {
        mockAttendanceState.total_jam_kerja = duration.formatted;
        mockAttendanceState.durasi_menit = duration.totalMinutes;
      }

      // Update mockLogs log record
      mockLogs = mockLogs.map(l => {
        if (l.nik === 'F5512530109') {
          return {
            ...l,
            jamPulang: timeStr,
            durasiKerja: mockAttendanceState.total_jam_kerja,
            keterangan: `${l.keterangan || 'Hadir'} • Pulang: ${status === 'PULANG_NORMAL' ? 'Normal' : 'Cepat'}`
          };
        }
        return l;
      });

      return {
        success: true,
        message: 'Presensi pulang berhasil dicatat',
        data: entry
      };
    }
  }
}

/**
 * 4. Submit Leave Request
 */
export async function submitLeaveRequest(formDataPayload) {
  let jenisIzin = 'IZIN';
  let tanggalMulai = new Date().toISOString().slice(0, 10);
  let tanggalSelesai = tanggalMulai;
  let alasan = '';
  let fileBukti = null;

  if (formDataPayload instanceof FormData) {
    jenisIzin = (formDataPayload.get('jenis_izin') || 'IZIN').toString();
    tanggalMulai = (formDataPayload.get('tanggal_mulai') || tanggalMulai).toString();
    tanggalSelesai = (formDataPayload.get('tanggal_selesai') || tanggalSelesai).toString();
    alasan = (formDataPayload.get('alasan') || '').toString();
    fileBukti = formDataPayload.get('bukti');
  }

  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/leaves`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formDataPayload
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(300);
  const currentUser = getStoredUser();
  const totalDays = calculateLeaveDays(tanggalMulai, tanggalSelesai);
  const newLeave = {
    id_izin: Date.now(),
    nik: currentUser?.nik || 'F5512530109',
    nama_karyawan: currentUser?.nama_lengkap || 'Ilham Arifin',
    nama_lengkap: currentUser?.nama_lengkap || 'Ilham Arifin',
    jabatan: currentUser?.jabatan || 'Fullstack Developer',
    jenis_izin: jenisIzin.toUpperCase(),
    tanggal_mulai: tanggalMulai,
    tanggal_selesai: tanggalSelesai,
    total_hari: totalDays,
    alasan: alasan || 'Keperluan mendesak yang telah dikonfirmasi.',
    url_bukti: (fileBukti && fileBukti.name) 
      ? URL.createObjectURL(fileBukti) 
      : (jenisIzin.toUpperCase() === 'SAKIT' ? DEFAULT_MEDICAL_CERT_SVG : null),
    status: 'PENDING',
    diverifikasi_oleh: null,
    waktu_verifikasi: null,
    catatan_admin: null,
    created_at: new Date().toISOString()
  };

  mockLeaves.unshift(newLeave);

  return {
    success: true,
    message: 'Pengajuan izin berhasil dikirimkan dan menunggu verifikasi Admin',
    data: newLeave
  };
}

/**
 * 5. Get Admin Dashboard Recap
 */
export async function getAdminRecap() {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/attendance/recap`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(200);
  return {
    stats: {
      ...mockStats,
      totalPegawai: mockEmployees.length
    },
    logs: mockLogs
  };
}

/**
 * 6. Export Attendance CSV
 */
export function exportAttendanceCSV(logs = mockLogs) {
  const headers = ['NIK', 'Nama Karyawan', 'Cabang', 'Jam Masuk', 'Jarak Geofence', 'Status Kehadiran', 'Keterangan'];
  const rows = logs.map(item => [
    item.nik,
    `"${item.nama}"`,
    `"${item.cabang}"`,
    item.jamMasuk,
    `${item.jarak}m`,
    item.status,
    `"${item.keterangan || '-'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rekap_presensi_kelompok10_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Default Manga Biometric SVG Selfie Placeholder
const DEFAULT_RETRO_SELFIE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23242A28"/><circle cx="200" cy="115" r="50" fill="%23D5DAD4" stroke="%231E2322" stroke-width="4"/><circle cx="185" cy="110" r="5" fill="%231E2322"/><circle cx="215" cy="110" r="5" fill="%231E2322"/><path d="M188 128 Q200 138 212 128" stroke="%231E2322" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M120 235 C120 185, 280 185, 280 235 Z" fill="%23EFF3ED" stroke="%231E2322" stroke-width="4"/><path d="M30 30 L55 30 M30 30 L30 55" stroke="%2310B981" stroke-width="3" fill="none"/><path d="M370 30 L345 30 M370 30 L370 55" stroke="%2310B981" stroke-width="3" fill="none"/><path d="M30 270 L55 270 M30 270 L30 245" stroke="%2310B981" stroke-width="3" fill="none"/><path d="M370 270 L345 270 M370 270 L370 245" stroke="%2310B981" stroke-width="3" fill="none"/><rect x="40" y="248" width="320" height="26" rx="6" fill="%231E2322" fill-opacity="0.9"/><text x="200" y="265" fill="%2310B981" font-family="monospace" font-size="10" text-anchor="middle" font-weight="bold">AI BIOMETRIC WEBRTC • GPS VERIFIED 18.4M</text></svg>`;

/**
 * Generate rich, realistic mock history records for calendar visualization
 */
function generateMockHistory(month, year) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const isCurrentMonth = (year === currentYear && month === currentMonth);

  const list = [];
  const pad = (n) => String(n).padStart(2, '0');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0: Sun, 6: Sat
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const dateStr = `${year}-${pad(month)}-${pad(d)}`;

    // Do not generate presensi for weekends
    if (isWeekend) {
      continue;
    }

    // Future days in current month: not yet attended
    if (isCurrentMonth && d > currentDay) {
      continue;
    }

    // Future months
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      continue;
    }

    // Today's attendance in current month: integrate with mockAttendanceState if available
    if (isCurrentMonth && d === currentDay) {
      const masukTime = mockAttendanceState.masuk
        ? mockAttendanceState.masuk.jam.replace(' WITA', '')
        : '08:04:12';
      const pulangTime = mockAttendanceState.pulang
        ? mockAttendanceState.pulang.jam.replace(' WITA', '')
        : (mockAttendanceState.masuk ? '17:05:00' : '17:02:18');
      const status = mockAttendanceState.masuk
        ? mockAttendanceState.masuk.status
        : 'TEPAT_WAKTU';
      const jarak = mockAttendanceState.masuk
        ? mockAttendanceState.masuk.jarak
        : 18.4;
      const foto = mockAttendanceState.masuk?.foto || DEFAULT_RETRO_SELFIE;

      list.push({
        id_presensi: year * 100000 + month * 1000 + d * 2,
        nik: 'F5512530109',
        nama_karyawan: 'Ilham Arifin',
        id_lokasi: 1,
        nama_kantor: 'Kantor Cabang Palu',
        tanggal: dateStr,
        jam: masukTime,
        jam_masuk: masukTime,
        jam_pulang: pulangTime,
        jenis_presensi: 'MASUK',
        status_kehadiran: status,
        latitude: -0.891700,
        longitude: 119.887200,
        jarak_meter: jarak,
        url_foto: foto,
        durasi_kerja: '9 Jam 1 Menit',
        keterangan: 'Presensi Masuk Terverifikasi Geofence (Hari Ini)'
      });

      if (pulangTime) {
        list.push({
          id_presensi: year * 100000 + month * 1000 + d * 2 + 1,
          nik: 'F5512530109',
          nama_karyawan: 'Ilham Arifin',
          id_lokasi: 1,
          nama_kantor: 'Kantor Cabang Palu',
          tanggal: dateStr,
          jam: pulangTime,
          jam_masuk: masukTime,
          jam_pulang: pulangTime,
          jenis_presensi: 'PULANG',
          status_kehadiran: 'PULANG_NORMAL',
          latitude: -0.891700,
          longitude: 119.887200,
          jarak_meter: jarak,
          url_foto: foto,
          durasi_kerja: '9 Jam 1 Menit',
          keterangan: 'Presensi Pulang Selesai'
        });
      }
      continue;
    }

    // Historical past workdays:
    // Introduce variation: day 6 and day 19 are late; day 14 is leave; others on-time
    let status = 'TEPAT_WAKTU';
    let jamMasuk = '08:02:15';
    let jamPulang = '17:08:44';
    let durasi = '9 Jam 6 Menit';
    let jarak = 16.4;
    let keterangan = 'Presensi Masuk Tepat Waktu';

    if (d === 6) {
      status = 'TERLAMBAT';
      jamMasuk = '08:24:05';
      jamPulang = '17:30:10';
      durasi = '9 Jam 6 Menit';
      jarak = 24.1;
      keterangan = 'Terlambat 9 menit (Kondisi Cuaca Hujan Deras)';
    } else if (d === 14) {
      status = 'IZIN_SAKIT';
      jamMasuk = '--:--:--';
      jamPulang = '--:--:--';
      durasi = '--';
      jarak = 0;
      keterangan = 'Izin Sakit: Rawat Jalan Klinik (Surat Dokter Disetujui HRD)';
    } else if (d === 19) {
      status = 'TERLAMBAT';
      jamMasuk = '08:22:15';
      jamPulang = '17:45:00';
      durasi = '9 Jam 22 Menit';
      jarak = 25.6;
      keterangan = 'Terlambat 7 menit (Perbaikan Jalan Jalur Palu Barat)';
    } else {
      // Natural clock variation
      const randomMin = pad(Math.floor(d * 7) % 12);
      const randomSec = pad(Math.floor(d * 13) % 60);
      jamMasuk = `07:5${Math.floor(d % 5) + 4}:${randomSec}`;
      jamPulang = `17:1${Math.floor(d % 8)}:${randomSec}`;
      durasi = '9 Jam 14 Menit';
      jarak = 12 + ((d * 3) % 11);
    }

    list.push({
      id_presensi: year * 100000 + month * 1000 + d * 2,
      nik: 'F5512530109',
      nama_karyawan: 'Ilham Arifin',
      id_lokasi: 1,
      nama_kantor: 'Kantor Cabang Palu',
      tanggal: dateStr,
      jam: jamMasuk,
      jam_masuk: jamMasuk,
      jam_pulang: jamPulang,
      jenis_presensi: 'MASUK',
      status_kehadiran: status,
      latitude: -0.891700,
      longitude: 119.887200,
      jarak_meter: jarak,
      url_foto: DEFAULT_RETRO_SELFIE,
      durasi_kerja: durasi,
      keterangan: keterangan
    });

    if (status !== 'IZIN_SAKIT') {
      list.push({
        id_presensi: year * 100000 + month * 1000 + d * 2 + 1,
        nik: 'F5512530109',
        nama_karyawan: 'Ilham Arifin',
        id_lokasi: 1,
        nama_kantor: 'Kantor Cabang Palu',
        tanggal: dateStr,
        jam: jamPulang,
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        jenis_presensi: 'PULANG',
        status_kehadiran: 'PULANG_NORMAL',
        latitude: -0.891700,
        longitude: 119.887200,
        jarak_meter: jarak,
        url_foto: DEFAULT_RETRO_SELFIE,
        durasi_kerja: durasi,
        keterangan: 'Presensi Pulang Selesai'
      });
    }
  }

  return list;
}

/**
 * 7. Get Personal Attendance History (Kalender Riwayat Kehadiran Karyawan)
 * Fetches attendance history for current user by month and year.
 * When backend is unavailable, automatically falls back to rich interactive mock history.
 */
export async function getMyHistory({ month, year } = {}) {
  const now = new Date();
  const targetMonth = month ? Number(month) : (now.getMonth() + 1);
  const targetYear = year ? Number(year) : now.getFullYear();

  try {
    const token = getStoredToken();
    const query = new URLSearchParams({
      month: String(targetMonth),
      year: String(targetYear)
    });
    const res = await fetch(`${API_BASE_URL}/attendance/my-history?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch (err) {
    // Backend offline: proceed to mock fallback
  }

  await delay(150);
  return generateMockHistory(targetMonth, targetYear);
}

/**
 * 8. CRUD KARYAWAN (EMPLOYEES)
 */

export async function getEmployees(search = '') {
  try {
    const token = getStoredToken();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/employees${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(150);
  let list = [...mockEmployees];
  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    list = list.filter(e =>
      (e.nik && e.nik.toLowerCase().includes(q)) ||
      (e.nama_lengkap && e.nama_lengkap.toLowerCase().includes(q)) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.jabatan && e.jabatan.toLowerCase().includes(q))
    );
  }
  return list;
}

export async function createEmployee(payload) {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal menambahkan karyawan');
    }
    return json;
  } catch (backendError) {
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }
  }

  await delay(250);
  if (!payload.nik || !payload.nama_lengkap || !payload.email || !payload.password) {
    throw new Error('NIK, Nama Lengkap, Email, dan Kata Sandi wajib diisi');
  }

  if (mockEmployees.some(e => e.nik.toLowerCase() === payload.nik.toLowerCase())) {
    throw new Error(`NIK ${payload.nik} sudah terdaftar dalam sistem`);
  }
  if (mockEmployees.some(e => e.email.toLowerCase() === payload.email.toLowerCase())) {
    throw new Error(`Email ${payload.email} sudah digunakan akun lain`);
  }

  const branch = mockLocations.find(l => l.id_lokasi === Number(payload.id_lokasi)) || mockLocations[0];
  const newEmp = {
    nik: payload.nik.trim().toUpperCase(),
    nama_lengkap: payload.nama_lengkap.trim(),
    email: payload.email.trim().toLowerCase(),
    nomor_telepon: payload.nomor_telepon ? payload.nomor_telepon.trim() : '',
    jabatan: payload.jabatan ? payload.jabatan.trim() : 'Staf',
    role: payload.role || 'KARYAWAN',
    id_lokasi: branch ? branch.id_lokasi : 1,
    cabang: branch ? branch.nama_kantor : 'Kantor Cabang Palu',
    nama_kantor: branch ? branch.nama_kantor : 'Kantor Cabang Palu',
    jam_masuk_jadwal: payload.jam_masuk_jadwal ? (payload.jam_masuk_jadwal.length === 5 ? `${payload.jam_masuk_jadwal}:00` : payload.jam_masuk_jadwal) : '08:00:00',
    jam_pulang_jadwal: payload.jam_pulang_jadwal ? (payload.jam_pulang_jadwal.length === 5 ? `${payload.jam_pulang_jadwal}:00` : payload.jam_pulang_jadwal) : '17:00:00',
    jadwal: `${(payload.jam_masuk_jadwal || '08:00').slice(0, 5)} - ${(payload.jam_pulang_jadwal || '17:00').slice(0, 5)} WITA`,
    status_aktif: true,
    created_at: new Date().toISOString()
  };

  mockEmployees.unshift(newEmp);

  // Sync with mockAccounts so user can login immediately
  mockAccounts.unshift({
    nik: newEmp.nik,
    email: newEmp.email,
    passwords: [payload.password, 'karyawan123', 'password123'],
    user: { ...newEmp }
  });

  return {
    success: true,
    message: 'Akun karyawan baru berhasil didaftarkan',
    data: newEmp
  };
}

export async function updateEmployee(nik, payload) {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/employees/${encodeURIComponent(nik)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal memperbarui karyawan');
    }
    return json;
  } catch (backendError) {
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }
  }

  await delay(200);
  const idx = mockEmployees.findIndex(e => e.nik.toLowerCase() === nik.toLowerCase());
  if (idx === -1) {
    throw new Error('Karyawan tidak ditemukan');
  }

  let branch = mockEmployees[idx].cabang;
  if (payload.id_lokasi) {
    const matchedLoc = mockLocations.find(l => l.id_lokasi === Number(payload.id_lokasi));
    if (matchedLoc) branch = matchedLoc.nama_kantor;
  }

  const updatedEmp = {
    ...mockEmployees[idx],
    ...payload,
    cabang: branch,
    nama_kantor: branch,
    jadwal: `${(payload.jam_masuk_jadwal || mockEmployees[idx].jam_masuk_jadwal || '08:00').slice(0, 5)} - ${(payload.jam_pulang_jadwal || mockEmployees[idx].jam_pulang_jadwal || '17:00').slice(0, 5)} WITA`
  };

  mockEmployees[idx] = updatedEmp;

  // Sync to mockAccounts
  const accIdx = mockAccounts.findIndex(a => a.nik.toLowerCase() === nik.toLowerCase());
  if (accIdx !== -1) {
    mockAccounts[accIdx].user = { ...mockAccounts[accIdx].user, ...updatedEmp };
    if (payload.password) {
      mockAccounts[accIdx].passwords.unshift(payload.password);
    }
  }

  return {
    success: true,
    message: 'Data karyawan berhasil diperbarui',
    data: updatedEmp
  };
}

export async function toggleEmployeeStatus(nik, statusAktif) {
  return await updateEmployee(nik, { status_aktif: statusAktif });
}

/**
 * 9. CRUD LOKASI KANTOR CABANG (GEOFENCE LOCATIONS)
 */

export async function getLocations() {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/locations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const data = await res.json();
      return data.data;
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(150);
  return [...mockLocations];
}

export async function createLocation(payload) {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal menambahkan lokasi kantor');
    }
    return json;
  } catch (backendError) {
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }
  }

  await delay(200);
  if (!payload.nama_kantor || !payload.alamat) {
    throw new Error('Nama kantor dan Alamat fisik wajib diisi');
  }

  const newLoc = {
    id_lokasi: mockLocations.length > 0 ? Math.max(...mockLocations.map(l => l.id_lokasi)) + 1 : 1,
    nama_kantor: payload.nama_kantor.trim(),
    alamat: payload.alamat.trim(),
    latitude: Number(payload.latitude) || OFFICE_COORDS.latitude,
    longitude: Number(payload.longitude) || OFFICE_COORDS.longitude,
    radius_meter: Number(payload.radius_meter) || 50,
    status_aktif: true,
    created_at: new Date().toISOString()
  };

  mockLocations.push(newLoc);

  return {
    success: true,
    message: 'Cabang kantor baru berhasil ditambahkan',
    data: newLoc
  };
}

export async function updateLocation(id, payload) {
  try {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE_URL}/admin/locations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Gagal memperbarui lokasi kantor');
    }
    return json;
  } catch (backendError) {
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }
  }

  await delay(200);
  const idx = mockLocations.findIndex(l => l.id_lokasi === Number(id));
  if (idx === -1) {
    throw new Error('Lokasi kantor tidak ditemukan');
  }

  const updatedLoc = {
    ...mockLocations[idx],
    ...payload,
    latitude: payload.latitude !== undefined ? Number(payload.latitude) : mockLocations[idx].latitude,
    longitude: payload.longitude !== undefined ? Number(payload.longitude) : mockLocations[idx].longitude,
    radius_meter: payload.radius_meter !== undefined ? Number(payload.radius_meter) : mockLocations[idx].radius_meter
  };

  mockLocations[idx] = updatedLoc;

  return {
    success: true,
    message: 'Data cabang kantor berhasil diperbarui',
    data: updatedLoc
  };
}

/**
 * 10. ADMIN LEAVE APPROVAL / REVIEW (FITUR F-04)
 * Mendukung peninjauan izin, pembaruan status, kalkulasi sisa kuota cuti tahunan,
 * dan penyediaan berkas bukti dokumen medis.
 */

export async function getAdminLeaves(status = '') {
  const cleanStatus = (typeof status === 'object' && status !== null ? status.status : status) || '';
  const filterStatus = cleanStatus && cleanStatus !== 'ALL' ? cleanStatus.toUpperCase() : '';

  try {
    const token = getStoredToken();
    const query = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/leaves${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        return json.data.map(item => {
          const totalDays = Number(item.total_hari) || calculateLeaveDays(item.tanggal_mulai, item.tanggal_selesai);
          const evidenceUrl = item.url_bukti || (item.jenis_izin === 'SAKIT' ? DEFAULT_MEDICAL_CERT_SVG : null);
          return {
            ...item,
            total_hari: totalDays,
            url_bukti: evidenceUrl,
            quota_info: calculateEmployeeLeaveQuota(item.nik, json.data)
          };
        });
      }
    }
  } catch (err) {
    // Backend offline: use fallback
  }

  await delay(150);
  let list = [...mockLeaves];
  if (filterStatus) {
    list = list.filter(l => (l.status || '').toUpperCase() === filterStatus);
  }

  return list.map(item => {
    const totalDays = Number(item.total_hari) || calculateLeaveDays(item.tanggal_mulai, item.tanggal_selesai);
    const evidenceUrl = item.url_bukti || (item.jenis_izin === 'SAKIT' ? DEFAULT_MEDICAL_CERT_SVG : null);
    return {
      ...item,
      total_hari: totalDays,
      url_bukti: evidenceUrl,
      quota_info: calculateEmployeeLeaveQuota(item.nik, mockLeaves)
    };
  });
}

/**
 * reviewLeaveRequest: Memverifikasi permohonan izin (DISETUJUI / DITOLAK)
 * beserta catatan admin dan update otomatis sisa kuota cuti tahunan.
 */
export async function reviewLeaveRequest(id, payload = {}) {
  const cleanStatus = (payload.status || '').toUpperCase().trim();
  const catatan = (payload.catatanAdmin !== undefined ? payload.catatanAdmin : payload.catatan_admin) || '';

  if (cleanStatus !== 'DISETUJUI' && cleanStatus !== 'DITOLAK') {
    throw new Error("Status verifikasi harus berupa 'DISETUJUI' atau 'DITOLAK'");
  }

  const token = getStoredToken();
  const currentUser = getStoredUser();
  const adminNIK = currentUser?.nik || 'ADM001';

  try {
    const res = await fetch(`${API_BASE_URL}/admin/leaves/${id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        status: cleanStatus,
        catatan_admin: catatan
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      const item = json.data || {};
      const totalDays = Number(item.total_hari) || calculateLeaveDays(item.tanggal_mulai, item.tanggal_selesai);
      return {
        ...item,
        total_hari: totalDays,
        quota_info: calculateEmployeeLeaveQuota(item.nik, mockLeaves)
      };
    }
    if (!res.ok) {
      throw new Error(json.message || 'Gagal memproses verifikasi izin');
    }
  } catch (backendError) {
    if (backendError.message && !backendError.message.includes('fetch')) {
      throw backendError;
    }
  }

  await delay(250);
  const idx = mockLeaves.findIndex(l => String(l.id_izin) === String(id));
  if (idx === -1) {
    throw new Error('Pengajuan izin tidak ditemukan');
  }

  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const existing = mockLeaves[idx];
  const updatedItem = {
    ...existing,
    status: cleanStatus,
    catatan_admin: catatan || (cleanStatus === 'DISETUJUI' ? 'Permohonan disetujui oleh HRD.' : 'Permohonan ditolak oleh HRD.'),
    diverifikasi_oleh: adminNIK,
    waktu_verifikasi: nowIso
  };

  mockLeaves[idx] = updatedItem;

  // Jika status disetujui dan jenis adalah SAKIT, perbarui mockStats
  if (cleanStatus === 'DISETUJUI' && existing.status !== 'DISETUJUI' && updatedItem.jenis_izin === 'SAKIT') {
    mockStats.izinSakit = Math.max(0, mockStats.izinSakit + 1);
  }

  const quota = calculateEmployeeLeaveQuota(updatedItem.nik, mockLeaves);

  return {
    success: true,
    message: `Permohonan izin berhasil ${cleanStatus === 'DISETUJUI' ? 'disetujui' : 'ditolak'}`,
    data: {
      ...updatedItem,
      total_hari: updatedItem.total_hari || calculateLeaveDays(updatedItem.tanggal_mulai, updatedItem.tanggal_selesai),
      quota_info: quota
    }
  };
}

/**
 * Backward-compatible alias for reviewLeave
 */
export const reviewLeave = reviewLeaveRequest;

/**
 * 7. Get Audit Trail Logs (F-07)
 */
export async function getAuditTrailLogs() {
  await delay(120);
  return [...mockAuditTrail];
}

/**
 * 8. Correct Attendance Record & Register into Audit Trail (F-07)
 */
export async function correctAttendanceLog({ id, statusKehadiran, catatanKoreksi, adminNIK = 'ADM001' }) {
  if (!statusKehadiran || !catatanKoreksi) {
    throw new Error('Status kehadiran dan alasan koreksi wajib diisi.');
  }

  const token = getStoredToken();
  const payload = {
    status_kehadiran: statusKehadiran,
    catatan_koreksi: catatanKoreksi
  };

  try {
    const res = await fetch(`${API_BASE_URL}/admin/attendance/${id}/correct`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      // Backend updated successfully
    }
  } catch (err) {
    // Backend offline: proceed with memory fallback
  }

  await delay(200);
  const logItem = mockLogs.find(l => String(l.id) === String(id));
  const oldStatus = logItem ? logItem.status : 'ALPHA';
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

  if (logItem) {
    logItem.status = statusKehadiran;
    logItem.keterangan = catatanKoreksi;
    logItem.diupdate_oleh = adminNIK;
    logItem.waktu_update = nowStr;
    logItem.catatan_koreksi = catatanKoreksi;
  }

  // Create audit trail entry
  const newAudit = {
    id: Date.now(),
    id_presensi: id,
    nik: logItem?.nik || 'STAFF',
    nama_karyawan: logItem?.nama || 'Karyawan',
    jabatan: logItem?.jabatan || 'Staf Operasional',
    cabang: logItem?.cabang || 'Kantor Cabang Palu',
    status_lama: oldStatus,
    status_baru: statusKehadiran,
    diupdate_oleh: adminNIK,
    nama_admin: 'Admin HRD Utama',
    waktu_update: nowStr,
    alasan_koreksi: catatanKoreksi,
    verifikasi_hash: `SEC-AUD-${Math.floor(100000 + Math.random() * 900000)}`
  };
  mockAuditTrail.unshift(newAudit);

  // Register activity feed event
  mockAdminActivities.unshift({
    id: Date.now(),
    tipe: 'AUDIT_KOREKSI',
    icon: 'ph-bold ph-shield-check',
    badgeColor: 'blue',
    judul: `Audit Koreksi: ${logItem?.nama || 'Presensi'}`,
    deskripsi: `Status diubah dari ${oldStatus} menjadi ${statusKehadiran} oleh ${adminNIK}. Catatan: "${catatanKoreksi}"`,
    waktu: 'Baru saja',
    timestamp: nowStr,
    actionTab: 'audit'
  });

  return {
    success: true,
    message: 'Koreksi presensi berhasil disimpan dan dicatat dalam audit trail.',
    data: logItem,
    audit: newAudit
  };
}

/**
 * 9. Get Admin Notification & Activity Feed (F-07)
 */
export async function getAdminActivities() {
  await delay(120);
  return [...mockAdminActivities];
}

/**
 * 10. Get 30-Day Attendance Analytics & Weekly Breakdown (F-06)
 */
export function getAttendanceAnalytics() {
  return {
    totalHariKerja: 22,
    totalCatatan: 120,
    tepatWaktu: 98,
    tepatWaktuPct: 81.7,
    terlambat: 14,
    terlambatPct: 11.6,
    izinSakit: 8,
    izinSakitPct: 6.7,
    skorDisiplin: 92,
    rataRataKeterlambatanMenit: 8.4,
    mingguan: [
      { pekan: 'Pekan 1', onTime: 24, late: 4, leave: 2, total: 30, pctOnTime: 80.0 },
      { pekan: 'Pekan 2', onTime: 26, late: 2, leave: 2, total: 30, pctOnTime: 86.7 },
      { pekan: 'Pekan 3', onTime: 23, late: 5, leave: 2, total: 30, pctOnTime: 76.7 },
      { pekan: 'Pekan 4', onTime: 25, late: 3, leave: 2, total: 30, pctOnTime: 83.3 }
    ]
  };
}


