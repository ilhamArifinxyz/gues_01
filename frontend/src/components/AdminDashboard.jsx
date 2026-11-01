import React, { useState, useEffect } from 'react';
import { getAdminRecap, exportAttendanceCSV, getAuditTrailLogs } from '../services/api';
import SelfieModal from './SelfieModal';
import EmployeeCrudTab from './EmployeeCrudTab';
import LocationCrudTab from './LocationCrudTab';
import LeaveReviewTab from './LeaveReviewTab';
import AttendanceAnalyticsCard from './AttendanceAnalyticsCard';
import AdminActivityFeed from './AdminActivityFeed';
import CorrectionModal from './CorrectionModal';
import AuditTrailModal from './AuditTrailModal';
import OfficialReportPdfModal from './OfficialReportPdfModal';

/**
 * Admin HRD Dashboard Component
 * Fitur Lengkap:
 * - 4 Bento Numeric LCD Cards (Total Pegawai, Tepat Waktu, Terlambat, Izin/Sakit)
 * - Horizontal Bento Sub-Navigation Bar:
 *   1. 📊 Log Presensi
 *   2. 📝 Persetujuan Izin
 *   3. 👥 Kelola Karyawan
 *   4. 🏢 Kelola Kantor Cabang
 * - F-06: Grafik Analitik Tren Kehadiran 30 Hari Terakhir (Stacked Bento Bar & Tren Mingguan)
 * - F-06: Tombol & Generator Ekspor PDF Cetak Resmi A4 Ber-Kop Akademik Universitas Tadulako S1 TI
 * - F-07: Panel Notifikasi & Aktivitas Admin (Live feed aktivitas, permohonan izin baru, alert keterlambatan)
 * - F-07: Audit Trail Koreksi Kehadiran Pegawai (Modal Koreksi Presensi & Panel Riwayat Audit Trail ADM001)
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPegawai: 120,
    tepatWaktu: 98,
    terlambat: 14,
    izinSakit: 8
  });
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedSelfie, setSelectedSelfie] = useState(null);
  const [isSelfieOpen, setIsSelfieOpen] = useState(false);

  // F-06 & F-07 Modal States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedCorrectionLog, setSelectedCorrectionLog] = useState(null);
  const [auditCount, setAuditCount] = useState(2);

  // Sub-Navigation Tab State: 'presensi' | 'izin' | 'karyawan' | 'lokasi'
  const [activeSubTab, setActiveSubTab] = useState('presensi');

  const loadData = async () => {
    try {
      const data = await getAdminRecap();
      if (data) {
        if (data.stats) setStats(data.stats);
        if (data.logs) setLogs(data.logs);
      }
      const audits = await getAuditTrailLogs();
      if (Array.isArray(audits)) {
        setAuditCount(audits.length);
      }
    } catch (err) {
      console.warn('Gagal memuat rekap admin:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePreviewSelfie = (log) => {
    setSelectedSelfie(log);
    setIsSelfieOpen(true);
  };

  const handleExportCSV = () => {
    exportAttendanceCSV(filteredLogs);
  };

  const handleOpenCorrection = (logItem) => {
    setSelectedCorrectionLog(logItem);
    setIsCorrectionOpen(true);
  };

  // Filter logs based on search and selected branch
  const filteredLogs = logs.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch =
      selectedBranch === 'ALL' ||
      (selectedBranch === 'PALU' && item.cabang.toLowerCase().includes('palu')) ||
      (selectedBranch === 'PUSAT' && item.cabang.toLowerCase().includes('pusat'));
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Admin Top Header Banner */}
      <div className="bg-widget rounded-[32px] p-6 border-3 border-ink shadow-art-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs uppercase tracking-widest font-bold">
              HRD CONTROL PANEL
            </span>
            <span className="text-xs text-ink-muted font-mono font-bold">
              Palu Regional Center • Untad TI
            </span>
          </div>
          <h2 className="text-2xl font-bold font-tech uppercase tracking-tight text-ink mt-1">
            Portal Administrasi & Rekapitulasi Presensi
          </h2>
          <p className="text-xs text-ink-muted font-medium">
            Rabu, 28 Oktober 2026 • Monitoring Waktu-Nyata Geofence, Kamera & Master Data Pegawai
          </p>
        </div>

        {/* Header Action Buttons (Ekspor PDF Cetak Resmi, Ekspor CSV, Audit Log, Kelola) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tombol F-06: Cetak Laporan PDF Resmi A4 */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs shadow-art hover:bg-widget-pure transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
            title="Buka Pratinjau & Ekspor Dokumen Resmi A4 Ber-Kop Untad"
          >
            <i className="ph-bold ph-printer text-base"></i>
            <span>📄 Cetak Laporan PDF</span>
          </button>

          {/* Tombol Ekspor CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs shadow-art hover:bg-widget-pure transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <i className="ph-bold ph-file-csv text-base"></i>
            <span>Ekspor CSV</span>
          </button>

          {/* Tombol F-07: Panel Riwayat Audit Trail */}
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs shadow-art hover:bg-widget-pure transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
            title="Lihat riwayat audit koreksi data presensi"
          >
            <i className="ph-bold ph-shield-check text-base"></i>
            <span>📜 Log Audit</span>
            {auditCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs font-bold leading-none">
                {auditCount}
              </span>
            )}
          </button>

          {/* Tombol Kelola Karyawan Shortcut */}
          <button
            type="button"
            onClick={() => setActiveSubTab('karyawan')}
            className={`px-4 py-2.5 rounded-2xl border-2 border-ink font-tech font-bold text-xs shadow-art transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] ${
              activeSubTab === 'karyawan'
                ? 'bg-widget-pure text-ink'
                : 'bg-ink text-canvas hover:bg-[#2C3331]'
            }`}
          >
            <i className="ph-bold ph-user-plus text-base"></i>
            <span>+ Kelola Karyawan</span>
          </button>
        </div>
      </div>

      {/* 4 Bento Stats Cards (Inverted LCD Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pegawai */}
        <div
          onClick={() => setActiveSubTab('karyawan')}
          className="bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between cursor-pointer hover:border-black transition"
          title="Klik untuk membuka tab Kelola Karyawan"
        >
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider">
              TOTAL PEGAWAI
            </span>
            <i className="ph-bold ph-users text-lg text-ink"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-ink leading-none">
              {stats.totalPegawai}
            </span>
            <span className="text-xs font-tech font-semibold text-ink-muted">
              ORANG
            </span>
          </div>
          <div className="text-[10px] font-mono text-ink-muted border-t border-ink/15 pt-2 font-medium flex items-center justify-between">
            <span>Master Data Staf</span>
            <span className="font-bold text-ink underline">Kelola ➔</span>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-emerald-800">
              TEPAT WAKTU
            </span>
            <i className="ph-bold ph-check-circle text-lg text-emerald-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-emerald-800 leading-none">
              {stats.tepatWaktu}
            </span>
            <span className="text-xs font-tech font-bold text-emerald-700">
              ({stats.totalPegawai > 0 ? ((stats.tepatWaktu / stats.totalPegawai) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 border-t border-ink/15 pt-2 font-medium">
            Masuk &lt; 08:15 WITA
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-amber-800">
              TERLAMBAT
            </span>
            <i className="ph-bold ph-clock-countdown text-lg text-amber-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-amber-800 leading-none">
              {stats.terlambat}
            </span>
            <span className="text-xs font-tech font-bold text-amber-700">
              ({stats.totalPegawai > 0 ? ((stats.terlambat / stats.totalPegawai) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-amber-800 border-t border-ink/15 pt-2 font-medium">
            Lewat Toleransi 15 Mnt
          </div>
        </div>

        {/* Izin / Sakit */}
        <div
          onClick={() => setActiveSubTab('izin')}
          className="bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between cursor-pointer hover:border-black transition"
          title="Klik untuk membuka tab Persetujuan Izin"
        >
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-purple-800">
              IZIN / SAKIT
            </span>
            <i className="ph-bold ph-first-aid text-lg text-purple-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-purple-800 leading-none">
              {String(stats.izinSakit).padStart(2, '0')}
            </span>
            <span className="text-xs font-tech font-bold text-purple-700">
              PENGAJUAN
            </span>
          </div>
          <div className="text-[10px] font-mono text-purple-700 border-t border-ink/15 pt-2 font-medium flex items-center justify-between">
            <span>Verifikasi Berkas</span>
            <span className="font-bold text-purple-900 underline">Review ➔</span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL BENTO SUB-NAVIGATION BAR (4 Tabs) */}
      <div className="bg-widget rounded-[28px] p-2 sm:p-2.5 border-3 border-ink shadow-art-lg grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Tab 1: Log Presensi */}
        <button
          type="button"
          onClick={() => setActiveSubTab('presensi')}
          className={`py-3 px-4 rounded-2xl font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition active:translate-x-[1px] active:translate-y-[1px] ${
            activeSubTab === 'presensi'
              ? 'bg-ink text-canvas border-2 border-ink shadow-art'
              : 'bg-canvas/70 text-ink border-2 border-ink/30 hover:border-ink hover:bg-widget-pure'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Log Presensi</span>
        </button>

        {/* Tab 2: Persetujuan Izin */}
        <button
          type="button"
          onClick={() => setActiveSubTab('izin')}
          className={`py-3 px-4 rounded-2xl font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition active:translate-x-[1px] active:translate-y-[1px] ${
            activeSubTab === 'izin'
              ? 'bg-ink text-canvas border-2 border-ink shadow-art'
              : 'bg-canvas/70 text-ink border-2 border-ink/30 hover:border-ink hover:bg-widget-pure'
          }`}
        >
          <span className="text-base">📝</span>
          <span>Persetujuan Izin</span>
        </button>

        {/* Tab 3: Kelola Karyawan */}
        <button
          type="button"
          onClick={() => setActiveSubTab('karyawan')}
          className={`py-3 px-4 rounded-2xl font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition active:translate-x-[1px] active:translate-y-[1px] ${
            activeSubTab === 'karyawan'
              ? 'bg-ink text-canvas border-2 border-ink shadow-art'
              : 'bg-canvas/70 text-ink border-2 border-ink/30 hover:border-ink hover:bg-widget-pure'
          }`}
        >
          <span className="text-base">👥</span>
          <span>Kelola Karyawan</span>
        </button>

        {/* Tab 4: Kelola Kantor Cabang */}
        <button
          type="button"
          onClick={() => setActiveSubTab('lokasi')}
          className={`py-3 px-4 rounded-2xl font-tech font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition active:translate-x-[1px] active:translate-y-[1px] ${
            activeSubTab === 'lokasi'
              ? 'bg-ink text-canvas border-2 border-ink shadow-art'
              : 'bg-canvas/70 text-ink border-2 border-ink/30 hover:border-ink hover:bg-widget-pure'
          }`}
        >
          <span className="text-base">🏢</span>
          <span>Kelola Kantor Cabang</span>
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}
      {/* 1. Tab: Log Presensi (Integrated with F-06 Analytics Card & F-07 Activity Feed) */}
      {activeSubTab === 'presensi' && (
        <div className="space-y-6 animate-fade-in">
          {/* F-06 Bento Analytics & F-07 Notification Activity Feed Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Grafik Analitik Tren Kehadiran 30 Hari Terakhir */}
            <div className="lg:col-span-7">
              <AttendanceAnalyticsCard stats={stats} />
            </div>

            {/* Right 5 Cols: Panel Notifikasi & Aktivitas Admin */}
            <div className="lg:col-span-5">
              <AdminActivityFeed
                onNavigateTab={(tab) => setActiveSubTab(tab)}
                onOpenAudit={() => setIsAuditModalOpen(true)}
              />
            </div>
          </div>

          {/* Presensi Live Table */}
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg overflow-hidden">
            {/* Table Header & Filter Bar */}
            <div className="p-5 border-b-2 border-ink flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-tech uppercase text-ink">
                  Catatan Log Transaksi Presensi Harian
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-pill text-white text-[10px] font-mono font-bold">
                  LIVE FEED
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari NIK / Nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-medium placeholder-ink-muted focus:outline-none shadow-art-sm"
                />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
                >
                  <option value="ALL">Semua Cabang Kantor</option>
                  <option value="PALU">Kantor Cabang Palu (Untad)</option>
                  <option value="PUSAT">Kantor Pusat</option>
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas/80 text-ink-muted font-tech uppercase text-[10px] tracking-wider border-b-2 border-ink">
                  <tr>
                    <th className="py-3.5 px-5 font-bold">NIK</th>
                    <th className="py-3.5 px-5 font-bold">Nama Karyawan</th>
                    <th className="py-3.5 px-5 font-bold">Cabang</th>
                    <th className="py-3.5 px-5 font-bold">Jam Masuk</th>
                    <th className="py-3.5 px-5 font-bold">Jarak Geofence</th>
                    <th className="py-3.5 px-5 font-bold">Status</th>
                    <th className="py-3.5 px-5 text-center font-bold">Bukti Swafoto</th>
                    <th className="py-3.5 px-5 text-center font-bold">Aksi Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink/10 font-medium">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-ink-muted font-tech">
                        Tidak ada data catatan presensi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item) => (
                      <tr key={item.id} className="hover:bg-widget-pure transition">
                        <td className="py-4 px-5 font-mono font-bold text-ink">{item.nik}</td>
                        <td className="py-4 px-5 font-bold font-tech text-ink">
                          {item.nama}
                          {item.jabatan && (
                            <span className="block text-[10px] font-mono text-ink-muted font-normal">
                              {item.jabatan}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">{item.cabang}</td>
                        <td
                          className={`py-4 px-5 font-digital text-base font-bold ${
                            item.status === 'TEPAT_WAKTU'
                              ? 'text-emerald-800'
                              : item.status === 'TERLAMBAT'
                              ? 'text-amber-800'
                              : 'text-ink-muted'
                          }`}
                        >
                          {item.jamMasuk}
                        </td>
                        <td className="py-4 px-5 font-mono text-emerald-700 font-bold">
                          {item.jarak > 0 ? `${item.jarak}m (Valid)` : '-'}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border ${
                              item.status === 'TEPAT_WAKTU'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                : item.status === 'TERLAMBAT'
                                ? 'bg-amber-100 text-amber-900 border-amber-400'
                                : 'bg-purple-100 text-purple-900 border-purple-400'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          {item.status === 'IZIN_SAKIT' ? (
                            <span
                              onClick={() => setActiveSubTab('izin')}
                              className="text-[11px] font-mono text-ink-muted underline cursor-pointer hover:text-ink"
                            >
                              {item.keterangan || 'SuratDokter.pdf'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePreviewSelfie(item)}
                              className="px-3 py-1 rounded-xl bg-canvas border border-ink text-[11px] font-bold font-tech hover:bg-widget-pure transition shadow-art-sm"
                            >
                              👁️ Buka Foto
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.status === 'IZIN_SAKIT') {
                                setActiveSubTab('izin');
                              } else {
                                handleOpenCorrection(item);
                              }
                            }}
                            className="px-3 py-1 rounded-xl bg-canvas border border-ink font-tech font-bold text-xs text-ink hover:bg-widget-pure transition shadow-art-sm cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                          >
                            {item.status === 'IZIN_SAKIT' ? 'Verifikasi Izin' : '✏️ Koreksi'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Tab: Persetujuan Izin */}
      {activeSubTab === 'izin' && (
        <div className="animate-fade-in">
          <LeaveReviewTab onDataChanged={loadData} />
        </div>
      )}

      {/* 3. Tab: Kelola Karyawan (F-05) */}
      {activeSubTab === 'karyawan' && (
        <div className="animate-fade-in">
          <EmployeeCrudTab onDataChanged={loadData} />
        </div>
      )}

      {/* 4. Tab: Kelola Kantor Cabang (F-05) */}
      {activeSubTab === 'lokasi' && (
        <div className="animate-fade-in">
          <LocationCrudTab onDataChanged={loadData} />
        </div>
      )}

      {/* Selfie Evidence Preview Modal */}
      <SelfieModal
        isOpen={isSelfieOpen}
        onClose={() => setIsSelfieOpen(false)}
        data={selectedSelfie}
      />

      {/* F-07: Interactive Correction Modal */}
      <CorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        logItem={selectedCorrectionLog}
        onSuccess={loadData}
      />

      {/* F-07: Audit Trail History Modal */}
      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* F-06: Official Report PDF Modal (A4 Untad Letterhead) */}
      <OfficialReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        logs={filteredLogs}
        stats={stats}
      />
    </div>
  );
}
