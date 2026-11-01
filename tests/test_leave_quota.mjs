// Test Suite: F-04 Manajemen Kuota Cuti & Pratinjau Bukti Medis
import assert from 'assert';
import {
  calculateLeaveDays,
  calculateEmployeeLeaveQuota,
  DEFAULT_ANNUAL_LEAVE_QUOTA,
  getAdminLeaves,
  reviewLeaveRequest,
  mockLeaves
} from '../frontend/src/services/api.js';

console.log('🧪 [TEST SUITE] Menjalankan Pengujian Logika Bisnis & API Fitur F-04...');

// 1. Uji Hitung Selisih Hari
console.log('\n--- UJI 1: calculateLeaveDays ---');
const oneDay = calculateLeaveDays('2026-10-28', '2026-10-28');
assert.strictEqual(oneDay, 1, '1 hari jika tanggal mulai sama dengan tanggal selesai');

const threeDays = calculateLeaveDays('2026-11-03', '2026-11-05');
assert.strictEqual(threeDays, 3, '3 hari (3, 4, 5 November)');

console.log('✅ Uji calculateLeaveDays lolos.');

// 2. Uji Aturan Bisnis Pemotongan Kuota Cuti Tahunan:
// Aturan: HANYA jenis 'CUTI' yang memotong kuota cuti tahunan (12 hari/tahun).
// Sakit, Tugas Luar, dan Izin TIDAK memotong kuota.
console.log('\n--- UJI 2: calculateEmployeeLeaveQuota & Aturan Bisnis ---');

const testCases = [
  {
    nik: 'TEST001',
    leaves: [
      { nik: 'TEST001', jenis_izin: 'SAKIT', total_hari: 3, status: 'DISETUJUI' },
      { nik: 'TEST001', jenis_izin: 'TUGAS_LUAR', total_hari: 5, status: 'DISETUJUI' },
      { nik: 'TEST001', jenis_izin: 'IZIN', total_hari: 2, status: 'DISETUJUI' }
    ],
    expectedUsed: 0,
    expectedRemaining: 12,
    desc: 'Semua jenis non-CUTI (Sakit, Tugas Luar, Izin) tidak memotong saldo 12 hari'
  },
  {
    nik: 'TEST002',
    leaves: [
      { nik: 'TEST002', jenis_izin: 'CUTI', total_hari: 4, status: 'DISETUJUI' },
      { nik: 'TEST002', jenis_izin: 'SAKIT', total_hari: 2, status: 'DISETUJUI' }
    ],
    expectedUsed: 4,
    expectedRemaining: 8,
    desc: 'Hanya CUTI 4 hari yang memotong kuota, Sakit 2 hari tidak memotong'
  },
  {
    nik: 'TEST003',
    leaves: [
      { nik: 'TEST003', jenis_izin: 'CUTI', total_hari: 3, status: 'DITOLAK' },
      { nik: 'TEST003', jenis_izin: 'CUTI', total_hari: 2, status: 'PENDING' }
    ],
    expectedUsed: 0,
    expectedRemaining: 12,
    desc: 'CUTI ditolak tidak memotong, CUTI pending hanya tercatat di pendingQuota'
  }
];

testCases.forEach((tc, idx) => {
  const result = calculateEmployeeLeaveQuota(tc.nik, tc.leaves, 12);
  assert.strictEqual(result.usedDays, tc.expectedUsed, `Case ${idx + 1} usedDays salah`);
  assert.strictEqual(result.remainingDays, tc.expectedRemaining, `Case ${idx + 1} remainingDays salah`);
  console.log(`✅ Case ${idx + 1} Passed: ${tc.desc}`);
});

// 3. Uji getAdminLeaves
console.log('\n--- UJI 3: getAdminLeaves ---');
async function testGetAdminLeaves() {
  const all = await getAdminLeaves('ALL');
  assert(Array.isArray(all) && all.length >= 3, 'Semua data antrean izin harus berupa array');

  const pending = await getAdminLeaves('PENDING');
  assert(pending.every(l => l.status === 'PENDING'), 'Filter PENDING harus hanya mengembalikan status PENDING');

  const approved = await getAdminLeaves('DISETUJUI');
  assert(approved.every(l => l.status === 'DISETUJUI'), 'Filter DISETUJUI harus hanya mengembalikan status DISETUJUI');

  console.log(`✅ getAdminLeaves lolos: Total ${all.length} berkas, ${pending.length} pending, ${approved.length} disetujui.`);
}

// 4. Uji reviewLeaveRequest (Persetujuan & Penolakan)
console.log('\n--- UJI 4: reviewLeaveRequest ---');
async function testReviewLeaveRequest() {
  // Temukan satu pengajuan yang PENDING
  const target = mockLeaves.find(l => l.status === 'PENDING');
  assert(target, 'Harus ada pengajuan pending untuk diuji verifikasi');

  const idTarget = target.id_izin;
  const initialRemaining = calculateEmployeeLeaveQuota(target.nik, mockLeaves).remainingDays;

  // A. Setujui Pengajuan
  const resApproved = await reviewLeaveRequest(idTarget, {
    status: 'DISETUJUI',
    catatanAdmin: 'Uji otomatis: Disetujui dengan surat dokter valid.'
  });

  assert.strictEqual(resApproved.data.status, 'DISETUJUI');
  assert(resApproved.data.catatan_admin.includes('Disetujui'), 'Catatan admin harus tersimpan');

  // Jika yang disetujui bertipe CUTI, kuota harus terpotong
  if (target.jenis_izin === 'CUTI') {
    const afterQuota = calculateEmployeeLeaveQuota(target.nik, mockLeaves);
    assert(afterQuota.remainingDays < initialRemaining, 'Kuota cuti harus berkurang setelah CUTI disetujui');
    console.log(`✅ Kuota cuti berkurang dari ${initialRemaining} menjadi ${afterQuota.remainingDays} hari.`);
  }

  // B. Uji Penolakan
  const resRejected = await reviewLeaveRequest(idTarget, {
    status: 'DITOLAK',
    catatanAdmin: 'Uji otomatis: Ditolak karena bentrok jadwal rilis.'
  });
  assert.strictEqual(resRejected.data.status, 'DITOLAK');
  console.log('✅ reviewLeaveRequest penolakan berhasil disimpan.');
}

(async () => {
  await testGetAdminLeaves();
  await testReviewLeaveRequest();
  console.log('\n🎉 SELURUH PENGUJIAN LOGIKA F-04 BERHASIL DENGAN SEMPURNA (100% PASSED)!');
})();
