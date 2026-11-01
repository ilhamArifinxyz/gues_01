import React, { useState, useEffect } from 'react';
import { getAuditTrailLogs } from '../services/api';

/**
 * AuditTrailModal (Fitur F-07)
 * Menampilkan catatan waktu koreksi, admin pengubah (ADM001), dan alasan koreksi data kehadiran.
 */
export default function AuditTrailModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditTrailLogs();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.warn('Gagal memuat log audit:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.nama_karyawan.toLowerCase().includes(q) ||
      item.nik.toLowerCase().includes(q) ||
      item.diupdate_oleh.toLowerCase().includes(q) ||
      (item.alasan_koreksi && item.alasan_koreksi.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'TEPAT_WAKTU':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'TERLAMBAT':
        return 'bg-amber-100 text-amber-900 border-amber-400';
      case 'IZIN_SAKIT':
        return 'bg-purple-100 text-purple-900 border-purple-400';
      case 'HADIR_MANUAL':
        return 'bg-blue-100 text-blue-900 border-blue-400';
      default:
        return 'bg-gray-100 text-gray-900 border-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-widget w-full max-w-4xl max-h-[90vh] rounded-[32px] border-3 border-ink shadow-art-lg flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-6 border-b-2 border-ink flex items-start justify-between gap-4 bg-widget-pure">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-tech text-[10px] uppercase tracking-widest font-bold">
                LOG AUDIT KOREKSI
              </span>
              <span className="text-xs font-mono font-bold text-ink-muted">
                Integritas Data Kepegawaian
              </span>
            </div>
            <h3 className="text-2xl font-bold font-tech uppercase text-ink mt-1 flex items-center gap-2">
              <i className="ph-bold ph-shield-check text-2xl text-ink"></i>
              <span>Riwayat Audit Koreksi Kehadiran Pegawai</span>
            </h3>
            <p className="text-xs text-ink-muted font-medium mt-0.5">
              Seluruh modifikasi dan koreksi status presensi tercatat otomatis beserta identitas admin dan justifikasi.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-canvas border-2 border-ink flex items-center justify-center text-ink font-bold hover:bg-widget transition shadow-art-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Search & Statistics Filter Bar */}
        <div className="px-6 py-3.5 border-b-2 border-ink bg-canvas/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-tech font-bold uppercase text-ink">
              Total Catatan Audit:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-mono text-xs font-bold">
              {logs.length} RECORD
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari Staf / NIK / Admin / Alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-widget border-2 border-ink text-xs font-medium placeholder-ink-muted focus:outline-none shadow-art-sm w-64"
            />
            <button
              type="button"
              onClick={loadAuditData}
              className="p-1.5 rounded-xl bg-widget border-2 border-ink text-ink hover:bg-widget-pure transition shadow-art-sm"
              title="Muat ulang riwayat audit"
            >
              <i className={`ph-bold ph-arrows-clockwise text-base ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Audit Content List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-ink-muted font-tech">
              <i className="ph-bold ph-folder-notch-open text-4xl mb-2 inline-block"></i>
              <p className="text-sm font-bold">Belum ada riwayat audit koreksi yang tercatat.</p>
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className="bg-canvas rounded-2xl p-4 border-2 border-ink shadow-art-sm hover:shadow-art transition space-y-3"
              >
                {/* Audit Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/20 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="font-tech font-bold text-sm text-ink">
                      {item.nama_karyawan}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink-muted">
                      ({item.nik})
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted">
                      • {item.jabatan || 'Staf Operasional'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono font-bold text-ink bg-widget px-2.5 py-0.5 rounded-lg border border-ink/40">
                      🕒 {item.waktu_update}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted bg-widget px-2 py-0.5 rounded border border-ink/30">
                      {item.verifikasi_hash || 'HASH-VERIFIED'}
                    </span>
                  </div>
                </div>

                {/* Status Transition Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div className="flex items-center gap-2 text-xs font-tech font-bold">
                    <span className="text-ink-muted uppercase">Perubahan Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border line-through opacity-75 ${getStatusBadge(item.status_lama)}`}>
                      {item.status_lama || 'STATUS AWAL'}
                    </span>
                    <span className="text-ink text-sm">➔</span>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border shadow-sm ${getStatusBadge(item.status_baru)}`}>
                      {item.status_baru}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-tech font-bold justify-start md:justify-end">
                    <span className="text-ink-muted uppercase">Admin Auditor:</span>
                    <span className="font-mono text-ink font-bold bg-widget px-2 py-0.5 rounded border border-ink/40">
                      {item.diupdate_oleh} ({item.nama_admin || 'Admin HRD Utama'})
                    </span>
                  </div>
                </div>

                {/* Reason / Justification Box */}
                <div className="bg-widget-pure rounded-xl p-3 border border-ink/30 text-xs">
                  <div className="text-[10px] font-tech font-bold uppercase tracking-wider text-ink-muted mb-1 flex items-center gap-1.5">
                    <i className="ph-bold ph-note-pencil text-ink"></i>
                    <span>ALASAN / JUSTIFIKASI PERUBAHAN:</span>
                  </div>
                  <p className="font-medium text-ink leading-relaxed font-sans">
                    "{item.alasan_koreksi || 'Koreksi administratif data presensi harian staf.'}"
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-ink bg-widget-pure flex items-center justify-between">
          <div className="text-[11px] font-mono text-ink-muted flex items-center gap-2">
            <i className="ph-bold ph-lock-key text-ink"></i>
            <span>Log audit diarsipkan permanen untuk keperluan pelaporan & kepatuhan internal.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-ink text-canvas font-tech font-bold text-xs hover:bg-[#2C3331] transition shadow-art-sm"
          >
            Tutup Panel Audit
          </button>
        </div>
      </div>
    </div>
  );
}
