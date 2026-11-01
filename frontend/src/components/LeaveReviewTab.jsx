import React, { useState, useEffect, useMemo } from 'react';
import {
  getAdminLeaves,
  reviewLeaveRequest,
  calculateEmployeeLeaveQuota,
  calculateLeaveDays,
  DEFAULT_ANNUAL_LEAVE_QUOTA,
  DEFAULT_MEDICAL_CERT_SVG
} from '../services/api';

/**
 * Komponen: LeaveReviewTab (F-04 Manajemen Kuota Cuti & Pratinjau Bukti Medis)
 * Tema: Retro Manga Bento (Neo-Brutalist Soft UI)
 * Fitur:
 * 1. Filter Status (Semua, Menunggu Verifikasi/Pending, Disetujui, Ditolak)
 * 2. Filter Jenis Izin & Search (NIK, Nama, Alasan)
 * 3. 4 Bento Stats Cards & Kebijakan Kuota Cuti 12 Hari/Tahun
 * 4. Tabel Transaksi Pengajuan Izin & Badge Kuota Cuti Real-time
 * 5. Modal Pratinjau Surat Medis / Bukti Dokumen dengan Zoom (+/-/Reset),
 *    Analisis Dampak Kuota Cuti, Input Catatan HRD, dan Tombol Taktil Setujui/Tolak.
 */
export default function LeaveReviewTab({ onStatsUpdate, onDataChanged }) {
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'DISETUJUI' | 'DITOLAK'
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'CUTI' | 'SAKIT' | 'TUGAS_LUAR' | 'IZIN'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Review & Bukti Medis State
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docZoom, setDocZoom] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Muat data permohonan izin dari API / mock fallback
  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminLeaves();
      if (Array.isArray(data)) {
        setLeaves(data);
        if (onStatsUpdate) {
          const pendingCount = data.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
          onStatsUpdate(pendingCount);
        }
      }
    } catch (err) {
      console.error('Gagal memuat antrean izin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Filter leaves berdasarkan status, jenis, dan kata kunci pencarian
  const filteredLeaves = useMemo(() => {
    return leaves.filter(item => {
      const itemStatus = (item.status || '').toUpperCase();
      const itemType = (item.jenis_izin || item.jenis || '').toUpperCase();
      const itemNik = (item.nik || '').toLowerCase();
      const itemNama = (item.nama_karyawan || item.nama_lengkap || '').toLowerCase();
      const itemAlasan = (item.alasan || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesStatus = statusFilter === 'ALL' || itemStatus === statusFilter;
      const matchesType = typeFilter === 'ALL' || itemType === typeFilter;
      const matchesSearch = !q || itemNik.includes(q) || itemNama.includes(q) || itemAlasan.includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [leaves, statusFilter, typeFilter, searchQuery]);

  // Statistik Agregasi Bento
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalCuti = 0;

    leaves.forEach(l => {
      const s = (l.status || '').toUpperCase();
      const t = (l.jenis_izin || l.jenis || '').toUpperCase();
      if (s === 'PENDING') pending++;
      else if (s === 'DISETUJUI') approved++;
      else if (s === 'DITOLAK') rejected++;
      if (t === 'CUTI') totalCuti++;
    });

    return {
      total: leaves.length,
      pending,
      approved,
      rejected,
      totalCuti
    };
  }, [leaves]);

  // Buka modal verifikasi permohonan izin
  const handleOpenReview = (leave) => {
    setSelectedLeave(leave);
    setAdminNotes(leave.catatan_admin || '');
    setDocZoom(1);
    setIsModalOpen(true);
  };

  // Tutup modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLeave(null);
    setAdminNotes('');
    setDocZoom(1);
  };

  // Eksekusi verifikasi Setujui / Tolak
  const handleDecision = async (decisionStatus) => {
    if (!selectedLeave) return;

    if (decisionStatus === 'DITOLAK' && !adminNotes.trim()) {
      alert('⚠️ Mohon tuliskan alasan penolakan pada input Catatan HRD agar karyawan memahami keputusan ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reviewLeaveRequest(selectedLeave.id_izin, {
        status: decisionStatus,
        catatanAdmin: adminNotes.trim()
      });

      // Update state leaves lokal
      setLeaves(prev =>
        prev.map(item =>
          String(item.id_izin) === String(selectedLeave.id_izin)
            ? {
                ...item,
                status: decisionStatus,
                catatan_admin: adminNotes.trim() || (decisionStatus === 'DISETUJUI' ? 'Disetujui HRD.' : 'Ditolak HRD.'),
                diverifikasi_oleh: res.data?.diverifikasi_oleh || 'ADM001',
                waktu_verifikasi: res.data?.waktu_verifikasi || new Date().toISOString()
              }
            : item
        )
      );

      setFeedbackMsg({
        success: true,
        type: decisionStatus,
        title: decisionStatus === 'DISETUJUI' ? '✅ PENGAJUAN DISETUJUI!' : '⛔ PENGAJUAN DITOLAK!',
        message: `Permohonan izin karyawan ${selectedLeave.nama_karyawan || selectedLeave.nama_lengkap} berhasil diperbarui.`
      });

      if (onDataChanged) onDataChanged();

      handleCloseModal();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      alert(`Gagal menyimpan verifikasi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper render badge tipe izin
  const renderBadgeJenis = (jenis) => {
    const j = (jenis || '').toUpperCase();
    if (j === 'CUTI') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-amber-100 text-amber-900 border-amber-400 flex items-center gap-1">
          <i className="ph-bold ph-calendar text-xs"></i>
          CUTI TAHUNAN
        </span>
      );
    }
    if (j === 'SAKIT') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-rose-100 text-rose-900 border-rose-400 flex items-center gap-1">
          <i className="ph-bold ph-first-aid text-xs"></i>
          SAKIT
        </span>
      );
    }
    if (j === 'TUGAS_LUAR') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-purple-100 text-purple-900 border-purple-400 flex items-center gap-1">
          <i className="ph-bold ph-briefcase text-xs"></i>
          TUGAS LUAR
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-sky-100 text-sky-900 border-sky-400 flex items-center gap-1">
        <i className="ph-bold ph-notepad text-xs"></i>
        IZIN
      </span>
    );
  };

  // Helper render badge status
  const renderBadgeStatus = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-amber-100 text-amber-900 border-amber-400 flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
          MENUNGGU VERIFIKASI
        </span>
      );
    }
    if (s === 'DISETUJUI') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-emerald-100 text-emerald-900 border-emerald-400 flex items-center gap-1">
          <i className="ph-bold ph-check text-xs"></i>
          DISETUJUI
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech border bg-rose-100 text-rose-900 border-rose-400 flex items-center gap-1">
        <i className="ph-bold ph-x text-xs"></i>
        DITOLAK
      </span>
    );
  };

  // Perhitungan kuota untuk modal tinjauan
  const selectedQuota = useMemo(() => {
    if (!selectedLeave) return null;
    return calculateEmployeeLeaveQuota(selectedLeave.nik, leaves);
  }, [selectedLeave, leaves]);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className="bg-widget rounded-[24px] p-4 border-3 border-ink shadow-art flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span
              className={`w-8 h-8 rounded-xl border-2 border-ink flex items-center justify-center font-bold text-sm shadow-art-sm ${
                feedbackMsg.type === 'DISETUJUI' ? 'bg-emerald-400 text-ink' : 'bg-rose-400 text-ink'
              }`}
            >
              {feedbackMsg.type === 'DISETUJUI' ? '✓' : '✕'}
            </span>
            <div>
              <h4 className="font-tech font-bold text-xs uppercase text-ink">{feedbackMsg.title}</h4>
              <p className="font-medium text-xs text-ink-muted">{feedbackMsg.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="w-6 h-6 rounded-full bg-canvas border border-ink flex items-center justify-center text-xs font-bold text-ink hover:bg-widget-pure"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-widget rounded-[32px] p-6 border-3 border-ink shadow-art-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs uppercase tracking-widest font-bold">
              MODUL F-04
            </span>
            <span className="text-xs text-ink-muted font-mono font-bold">
              HRD Verification Desk • Palu Central
            </span>
          </div>
          <h2 className="text-2xl font-bold font-tech uppercase tracking-tight text-ink mt-1">
            Antrean Permohonan Izin & Cuti
          </h2>
          <p className="text-xs text-ink-muted font-medium mt-0.5">
            Manajemen persetujuan ketidakhadiran, pemeriksaan pratinjau bukti medis dokter, dan saldo kuota cuti tahunan.
          </p>
        </div>

        {/* Action Reload */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLeaves}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs shadow-art hover:bg-widget-pure transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
          >
            <i className={`ph-bold ph-arrows-clockwise text-base ${isLoading ? 'animate-spin' : ''}`}></i>
            <span>Segarkan Antrean</span>
          </button>
        </div>
      </div>

      {/* 4 Bento LCD Style Stats & Policy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Menunggu Verifikasi */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between cursor-pointer transition hover:translate-y-[-2px] ${
            statusFilter === 'PENDING' ? 'ring-2 ring-amber-500 bg-amber-50/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-amber-800">
              MENUNGGU VERIFIKASI
            </span>
            <i className="ph-bold ph-clock-countdown text-lg text-amber-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-amber-800 leading-none">
              {String(stats.pending).padStart(2, '0')}
            </span>
            <span className="text-xs font-tech font-bold text-amber-700">BERKAS</span>
          </div>
          <div className="text-[10px] font-mono text-amber-800 border-t border-ink/15 pt-2 font-medium flex items-center justify-between">
            <span>Memerlukan Aksi HRD</span>
            <span>➜</span>
          </div>
        </div>

        {/* 2. Permohonan Disetujui */}
        <div
          onClick={() => setStatusFilter('DISETUJUI')}
          className={`bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between cursor-pointer transition hover:translate-y-[-2px] ${
            statusFilter === 'DISETUJUI' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-emerald-800">
              DISETUJUI
            </span>
            <i className="ph-bold ph-check-circle text-lg text-emerald-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-emerald-800 leading-none">
              {String(stats.approved).padStart(2, '0')}
            </span>
            <span className="text-xs font-tech font-bold text-emerald-700">BERKAS</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 border-t border-ink/15 pt-2 font-medium flex items-center justify-between">
            <span>Izin Sah Dikonfirmasi</span>
            <span>➜</span>
          </div>
        </div>

        {/* 3. Permohonan Ditolak */}
        <div
          onClick={() => setStatusFilter('DITOLAK')}
          className={`bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between cursor-pointer transition hover:translate-y-[-2px] ${
            statusFilter === 'DITOLAK' ? 'ring-2 ring-rose-500 bg-rose-50/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider text-rose-800">
              DITOLAK
            </span>
            <i className="ph-bold ph-x-circle text-lg text-rose-700"></i>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-digital font-bold text-rose-800 leading-none">
              {String(stats.rejected).padStart(2, '0')}
            </span>
            <span className="text-xs font-tech font-bold text-rose-700">BERKAS</span>
          </div>
          <div className="text-[10px] font-mono text-rose-700 border-t border-ink/15 pt-2 font-medium flex items-center justify-between">
            <span>Audit Catatan Tersimpan</span>
            <span>➜</span>
          </div>
        </div>

        {/* 4. Kebijakan Kuota Cuti Tahunan */}
        <div className="bg-widget rounded-[26px] p-5 border-2 border-ink shadow-art flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-ink">
            <span className="text-[10px] font-tech font-bold uppercase tracking-wider">
              KEBIJAKAN KUOTA CUTI
            </span>
            <i className="ph-bold ph-scales text-lg text-ink"></i>
          </div>
          <div className="my-2 space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-digital font-bold text-ink leading-none">
                12
              </span>
              <span className="text-xs font-tech font-bold text-ink-muted">
                HARI / TAHUN
              </span>
            </div>
            <p className="text-[10px] font-tech text-ink-muted leading-tight">
              ⚡ <strong className="text-ink">Hanya jenis CUTI</strong> yang memotong saldo tahunan. Sakit, Tugas Luar, & Izin tidak memotong.
            </p>
          </div>
          <div className="text-[10px] font-mono text-ink-muted border-t border-ink/15 pt-1.5 font-bold">
            Standar Aturan HRD Kelompok 10
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg overflow-hidden space-y-0">
        {/* Table Header & Controls Bar */}
        <div className="p-5 border-b-2 border-ink flex flex-col md:flex-row md:items-center justify-between gap-4 bg-widget">
          {/* Status Filter Tabs (Pills) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-tech font-bold text-xs border transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-ink text-canvas border-ink shadow-art-sm'
                  : 'bg-canvas text-ink border-ink hover:bg-widget-pure'
              }`}
            >
              Semua ({leaves.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-1.5 rounded-xl font-tech font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white border-ink shadow-art-sm'
                  : 'bg-canvas text-amber-900 border-ink hover:bg-widget-pure'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISETUJUI')}
              className={`px-3.5 py-1.5 rounded-xl font-tech font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'DISETUJUI'
                  ? 'bg-emerald-700 text-white border-ink shadow-art-sm'
                  : 'bg-canvas text-emerald-900 border-ink hover:bg-widget-pure'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Disetujui ({stats.approved})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DITOLAK')}
              className={`px-3.5 py-1.5 rounded-xl font-tech font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'DITOLAK'
                  ? 'bg-rose-700 text-white border-ink shadow-art-sm'
                  : 'bg-canvas text-rose-900 border-ink hover:bg-widget-pure'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Ditolak ({stats.rejected})
            </button>
          </div>

          {/* Search & Type Filter Dropdown */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold text-ink focus:outline-none shadow-art-sm cursor-pointer"
            >
              <option value="ALL">Semua Jenis Izin</option>
              <option value="CUTI">Cuti Tahunan</option>
              <option value="SAKIT">Sakit (Dokter)</option>
              <option value="TUGAS_LUAR">Tugas Luar</option>
              <option value="IZIN">Izin Keperluan</option>
            </select>

            <div className="relative">
              <input
                type="text"
                placeholder="Cari NIK, Nama, Alasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-medium placeholder-ink-muted focus:outline-none shadow-art-sm"
              />
              <i className="ph-bold ph-magnifying-glass absolute left-2.5 top-2.5 text-xs text-ink-muted"></i>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas/80 text-ink-muted font-tech uppercase text-[10px] tracking-wider border-b-2 border-ink">
              <tr>
                <th className="py-3.5 px-4 font-bold">Karyawan</th>
                <th className="py-3.5 px-4 font-bold">Jenis Izin</th>
                <th className="py-3.5 px-4 font-bold">Periode Tanggal</th>
                <th className="py-3.5 px-4 text-center font-bold">Total Hari</th>
                <th className="py-3.5 px-4 font-bold">Sisa Kuota Cuti</th>
                <th className="py-3.5 px-4 font-bold">Alasan Pengajuan</th>
                <th className="py-3.5 px-4 text-center font-bold">Bukti / Dokumen</th>
                <th className="py-3.5 px-4 text-center font-bold">Status</th>
                <th className="py-3.5 px-4 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/10 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted font-tech">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin"></span>
                      <span>Memuat antrean permohonan izin & cuti...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ink-muted font-tech">
                    <p className="font-bold text-sm text-ink mb-1">Tidak Ada Permohonan Izin</p>
                    <p className="text-xs">
                      Tidak ditemukan catatan yang cocok dengan filter status "{statusFilter}" dan pencarian saat ini.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((item) => {
                  const quota = item.quota_info || calculateEmployeeLeaveQuota(item.nik, leaves);
                  const isCutiType = (item.jenis_izin || item.jenis || '').toUpperCase() === 'CUTI';
                  const totalDays = Number(item.total_hari) || calculateLeaveDays(item.tanggal_mulai, item.tanggal_selesai);

                  return (
                    <tr key={item.id_izin} className="hover:bg-widget-pure transition">
                      {/* 1. Karyawan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-canvas border-2 border-ink flex items-center justify-center font-bold font-tech text-xs text-ink shrink-0 shadow-art-sm">
                            {(item.nama_karyawan || item.nama_lengkap || 'K').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold font-tech text-ink leading-tight">
                              {item.nama_karyawan || item.nama_lengkap}
                            </div>
                            <div className="font-mono text-[10px] text-ink-muted font-bold">
                              {item.nik}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Jenis Izin Badge */}
                      <td className="py-3.5 px-4">
                        {renderBadgeJenis(item.jenis_izin || item.jenis)}
                      </td>

                      {/* 3. Periode Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-ink">
                        <div>{item.tanggal_mulai}</div>
                        <div className="text-[10px] text-ink-muted">s/d {item.tanggal_selesai}</div>
                      </td>

                      {/* 4. Total Hari */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-digital text-lg font-bold text-ink">
                          {totalDays}
                        </span>
                        <span className="text-[10px] font-tech text-ink-muted block -mt-1">
                          HARI
                        </span>
                      </td>

                      {/* 5. Informasi Sisa Kuota Cuti Karyawan */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-digital text-base font-bold text-ink">
                              {quota.remainingDays}
                            </span>
                            <span className="text-[10px] font-mono text-ink-muted font-semibold">
                              / {quota.baseQuota} Hari
                            </span>
                          </div>

                          {/* Keterangan dampak terhadap kuota tahunan */}
                          {isCutiType ? (
                            <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-bold">
                              Memotong {totalDays} Hari
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-canvas text-ink-muted font-medium">
                              Bebas Kuota
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Alasan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-xs font-medium text-ink leading-snug">
                          {item.alasan || '-'}
                        </p>
                      </td>

                      {/* 7. Bukti / Dokumen */}
                      <td className="py-3.5 px-4 text-center">
                        {item.url_bukti || (item.jenis_izin === 'SAKIT') ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(item)}
                            title="Pratinjau Surat Medis / Bukti"
                            className="px-2.5 py-1 rounded-xl bg-canvas border border-ink text-[11px] font-bold font-tech text-ink hover:bg-widget-pure transition shadow-art-sm flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <i className="ph-bold ph-file-text text-emerald-700"></i>
                            <span>Bukti Medis</span>
                          </button>
                        ) : (
                          <span className="text-ink-muted font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* 8. Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderBadgeStatus(item.status)}
                      </td>

                      {/* 9. Aksi Verifikasi / Detail */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className={`px-3 py-1.5 rounded-xl font-tech font-bold text-xs border-2 border-ink shadow-art-sm transition cursor-pointer flex items-center gap-1 mx-auto active:translate-x-[1px] active:translate-y-[1px] ${
                            item.status === 'PENDING'
                              ? 'bg-ink text-canvas hover:bg-[#2C3331]'
                              : 'bg-canvas text-ink hover:bg-widget-pure'
                          }`}
                        >
                          {item.status === 'PENDING' ? (
                            <>
                              <i className="ph-bold ph-scales text-sm text-emerald-400"></i>
                              <span>Verifikasi</span>
                            </>
                          ) : (
                            <>
                              <i className="ph-bold ph-eye text-sm"></i>
                              <span>Detail</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL PRATINJAU SURAT MEDIS / DOKUMEN & KEPUTUSAN VERIFIKASI HRD    */}
      {/* ===================================================================== */}
      {isModalOpen && selectedLeave && (
        <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg max-w-4xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b-2 border-ink flex items-center justify-between bg-widget shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs uppercase tracking-wider font-bold">
                  VERIFIKASI HRD
                </span>
                <h3 className="text-sm sm:text-base font-bold font-tech uppercase text-ink tracking-tight">
                  Pratinjau Bukti Medis &amp; Keputusan Izin
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-canvas border-2 border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure transition shadow-art-sm cursor-pointer"
              >
                <i className="ph-bold ph-x text-sm"></i>
              </button>
            </div>

            {/* Modal Body: Two Columns (Desktop) / Stacked (Mobile) */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto">
              {/* KOLOM KIRI: Frame Pratinjau Dokumen Medis (MD: 7 Cols) */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between text-xs font-tech font-bold text-ink">
                  <span className="flex items-center gap-1.5">
                    <i className="ph-bold ph-file-medical text-base text-rose-700"></i>
                    Lampiran Berkas / Surat Dokter
                  </span>

                  {/* Zoom Controls Bar */}
                  <div className="flex items-center gap-1 bg-canvas p-1 rounded-xl border border-ink shadow-art-sm">
                    <button
                      type="button"
                      onClick={() => setDocZoom(z => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}
                      title="Perkecil Dokumen"
                      className="w-6 h-6 rounded bg-widget hover:bg-widget-pure border border-ink flex items-center justify-center text-xs font-bold font-mono text-ink cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-mono text-[10px] font-bold text-ink min-w-[40px] text-center">
                      {Math.round(docZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocZoom(z => Math.min(2.0, Math.round((z + 0.2) * 10) / 10))}
                      title="Perbesar Dokumen"
                      className="w-6 h-6 rounded bg-widget hover:bg-widget-pure border border-ink flex items-center justify-center text-xs font-bold font-mono text-ink cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocZoom(1)}
                      title="Reset Zoom Normal"
                      className="px-1.5 py-0.5 rounded bg-widget hover:bg-widget-pure border border-ink text-[10px] font-bold font-tech text-ink cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Viewport Dokumen Frame */}
                <div className="bg-[#1C201F] rounded-2xl border-2 border-ink overflow-auto h-[380px] sm:h-[440px] p-2 flex items-center justify-center relative shadow-inner">
                  {selectedLeave.url_bukti || selectedLeave.jenis_izin === 'SAKIT' ? (
                    <div
                      style={{
                        transform: `scale(${docZoom})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.15s ease-out'
                      }}
                      className="w-full flex justify-center py-2"
                    >
                      <img
                        src={selectedLeave.url_bukti || DEFAULT_MEDICAL_CERT_SVG}
                        alt="Surat Dokter / Bukti Medis"
                        className="max-w-full rounded shadow-lg border border-canvas/20 object-contain bg-white"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2 text-canvas/70">
                      <span className="text-5xl block">📄</span>
                      <p className="font-tech font-bold text-sm text-canvas">Tidak Ada Lampiran Berkas Fisik</p>
                      <p className="font-mono text-xs max-w-xs">
                        Pengajuan ini bertipe {selectedLeave.jenis_izin}. Karyawan tidak melampirkan berkas dokumen digital.
                      </p>
                    </div>
                  )}

                  {/* Watermark HUD Tag */}
                  <div className="absolute bottom-3 left-3 bg-pill/90 text-white px-2.5 py-1 rounded-xl text-[10px] font-mono border border-canvas/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>DOKUMEN MEDIS DIVERIFIKASI KLINIK</span>
                  </div>
                </div>

                {/* Info status berkas */}
                <div className="text-[11px] font-mono text-ink-muted flex items-center justify-between px-1">
                  <span>Format: Digital Medika SVG / PDF</span>
                  <a
                    href={selectedLeave.url_bukti || DEFAULT_MEDICAL_CERT_SVG}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Buka Penuh</span>
                    <i className="ph-bold ph-arrow-square-out"></i>
                  </a>
                </div>
              </div>

              {/* KOLOM KANAN: Detail Permohonan & Keputusan HRD (MD: 5 Cols) */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                {/* 1. Profil Pemohon Card */}
                <div className="bg-canvas p-3.5 rounded-2xl border-2 border-ink space-y-2 shadow-art-sm text-xs font-tech">
                  <div className="flex items-center justify-between border-b border-ink/20 pb-2">
                    <div>
                      <div className="font-bold text-sm text-ink leading-tight">
                        {selectedLeave.nama_karyawan || selectedLeave.nama_lengkap}
                      </div>
                      <div className="font-mono text-[11px] text-ink-muted">
                        NIK: {selectedLeave.nik} • {selectedLeave.jabatan || 'Staf Operasional'}
                      </div>
                    </div>
                    {renderBadgeJenis(selectedLeave.jenis_izin || selectedLeave.jenis)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-ink-muted block text-[10px]">TANGGAL PENGAJUAN:</span>
                      <span className="font-mono font-bold text-ink">{selectedLeave.tanggal_mulai}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-[10px]">TOTAL HARI:</span>
                      <span className="font-mono font-bold text-ink">
                        {Number(selectedLeave.total_hari) || calculateLeaveDays(selectedLeave.tanggal_mulai, selectedLeave.tanggal_selesai)} Hari
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Informasi Sisa Kuota Cuti Karyawan */}
                {selectedQuota && (
                  <div className="bg-widget-pure p-3.5 rounded-2xl border-2 border-ink space-y-2 text-xs font-tech shadow-art-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-[10px] text-ink-muted">
                        SALDO KUOTA CUTI TAHUNAN
                      </span>
                      <span className="text-[10px] font-mono font-bold text-ink bg-canvas px-2 py-0.5 rounded-lg border border-ink">
                        {DEFAULT_ANNUAL_LEAVE_QUOTA} Hari/Tahun
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-ink/15 pb-2">
                      <span className="text-ink-muted">Sisa Kuota Saat Ini:</span>
                      <span className="font-digital text-xl font-bold text-ink">
                        {selectedQuota.remainingDays} Hari
                      </span>
                    </div>

                    {/* Analisis Aturan Bisnis Pemotongan Kuota */}
                    {(selectedLeave.jenis_izin || selectedLeave.jenis || '').toUpperCase() === 'CUTI' ? (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] leading-snug">
                        <span className="font-bold block">⚠️ Pemotongan Kuota Cuti Tahunan:</span>
                        Permohonan ini bertipe <strong>CUTI</strong> ({Number(selectedLeave.total_hari) || 1} hari). Jika disetujui, sisa kuota cuti tahunan karyawan akan menjadi <strong>{Math.max(0, selectedQuota.remainingDays - (Number(selectedLeave.total_hari) || 1))} hari</strong>.
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-[11px] leading-snug">
                        <span className="font-bold block">✨ Kebijakan Bebas Potong Kuota:</span>
                        Permohonan bertipe <strong>{selectedLeave.jenis_izin}</strong>. Sesuai aturan bisnis, pengajuan ini <strong>TIDAK MEMOTONG</strong> sisa kuota cuti tahunan karyawan.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Uraian Alasan Karyawan */}
                <div className="space-y-1 text-xs font-tech">
                  <label className="block text-[10px] font-bold text-ink-muted uppercase">
                    Uraian Alasan Karyawan:
                  </label>
                  <div className="p-2.5 rounded-xl bg-canvas border-2 border-ink font-medium text-xs text-ink italic shadow-art-sm leading-relaxed">
                    "{selectedLeave.alasan || 'Tidak ada uraian alasan tambahan.'}"
                  </div>
                </div>

                {/* 4. Input Catatan HRD & Preset */}
                <div className="space-y-1.5 text-xs font-tech">
                  <label className="block text-[10px] font-bold text-ink-muted uppercase">
                    Catatan Keputusan HRD (Wajib jika menolak):
                  </label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Tuliskan catatan verifikasi, instruksi kerja, atau alasan penolakan..."
                    className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs focus:outline-none font-medium text-ink shadow-art-sm resize-none"
                  />

                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setAdminNotes('✅ Disetujui. Surat keterangan medis dokter terverifikasi valid.')}
                      className="px-2 py-0.5 rounded-lg bg-canvas hover:bg-widget-pure border border-ink text-[10px] font-bold text-emerald-900 cursor-pointer"
                    >
                      + Bukti Medis Valid
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminNotes('✅ Disetujui sesuai alokasi hak cuti tahunan.')}
                      className="px-2 py-0.5 rounded-lg bg-canvas hover:bg-widget-pure border border-ink text-[10px] font-bold text-emerald-900 cursor-pointer"
                    >
                      + Hak Cuti Cukup
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminNotes('⛔ Ditolak. Surat dokter tidak terbaca dengan jelas / mohon unggah ulang.')}
                      className="px-2 py-0.5 rounded-lg bg-canvas hover:bg-widget-pure border border-ink text-[10px] font-bold text-rose-900 cursor-pointer"
                    >
                      + Surat Tidak Jelas
                    </button>
                  </div>
                </div>

                {/* 5. Tombol Aksi Taktil Setujui & Tolak */}
                <div className="pt-2 space-y-2 border-t border-ink/15">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Tombol Setujui */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision('DISETUJUI')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-tech font-bold text-xs uppercase border-2 border-ink shadow-art active:translate-x-[2px] active:translate-y-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <i className="ph-bold ph-check text-sm"></i>
                          <span>Setujui Izin</span>
                        </>
                      )}
                    </button>

                    {/* Tombol Tolak */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDecision('DITOLAK')}
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-tech font-bold text-xs uppercase border-2 border-ink shadow-art active:translate-x-[2px] active:translate-y-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <i className="ph-bold ph-x text-sm"></i>
                          <span>Tolak Izin</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full py-1.5 rounded-xl bg-canvas border border-ink text-ink font-tech font-bold text-[11px] hover:bg-widget-pure transition cursor-pointer"
                  >
                    Batal / Tutup Dialog
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
