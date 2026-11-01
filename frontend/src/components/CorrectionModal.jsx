import React, { useState, useEffect } from 'react';
import { correctAttendanceLog, getCurrentUser } from '../services/api';

/**
 * CorrectionModal (Fitur F-07)
 * Dialog koreksi status kehadiran staf dengan pencatatan audit trail otomatis.
 */
export default function CorrectionModal({ isOpen, onClose, logItem, onSuccess }) {
  const [newStatus, setNewStatus] = useState('TEPAT_WAKTU');
  const [alasan, setAlasan] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (logItem) {
      setNewStatus(logItem.status || 'TEPAT_WAKTU');
      setAlasan(logItem.catatan_koreksi || logItem.keterangan || '');
      setErrorMessage('');
    }
  }, [logItem]);

  useEffect(() => {
    getCurrentUser().then((u) => setAdminUser(u)).catch(() => {});
  }, []);

  if (!isOpen || !logItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alasan.trim()) {
      setErrorMessage('Alasan atau justifikasi perubahan status wajib diisi untuk keperluan audit.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const adminNik = adminUser?.nik || 'ADM001';
      await correctAttendanceLog({
        id: logItem.id,
        statusKehadiran: newStatus,
        catatanKoreksi: alasan.trim(),
        adminNIK: adminNik
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan koreksi data presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-widget w-full max-w-lg rounded-[32px] border-3 border-ink shadow-art-lg p-6 flex flex-col gap-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-tech text-[10px] uppercase tracking-widest font-bold">
                KOREKSI DATA PRESENSI
              </span>
              <span className="text-[11px] font-mono text-ink-muted font-bold">
                ID Presensi: #{logItem.id}
              </span>
            </div>
            <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1 flex items-center gap-2">
              <i className="ph-bold ph-pencil-simple-line text-ink"></i>
              <span>Koreksi Catatan Kehadiran</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-canvas border-2 border-ink flex items-center justify-center text-ink font-bold hover:bg-widget-pure transition shadow-art-sm"
          >
            ✕
          </button>
        </div>

        {/* Staff Target Information */}
        <div className="bg-canvas/80 rounded-2xl p-4 border-2 border-ink/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted font-tech uppercase">Karyawan:</span>
            <span className="font-bold text-ink font-tech text-sm">{logItem.nama}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted font-tech uppercase">NIK / Cabang:</span>
            <span className="font-mono text-ink font-bold">
              {logItem.nik} • {logItem.cabang}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted font-tech uppercase">Jam Tercatat:</span>
            <span className="font-mono text-sm text-ink font-bold">
              {logItem.jamMasuk || '--:--:--'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-ink/15 pt-2">
            <span className="text-ink-muted font-tech uppercase">Status Saat Ini:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-tech border ${
                logItem.status === 'TEPAT_WAKTU'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                  : logItem.status === 'TERLAMBAT'
                  ? 'bg-amber-100 text-amber-900 border-amber-400'
                  : 'bg-purple-100 text-purple-900 border-purple-400'
              }`}
            >
              {logItem.status}
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 text-xs font-tech font-bold flex items-center gap-2">
            <i className="ph-bold ph-warning-circle text-base"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-tech font-bold uppercase tracking-wider text-ink mb-1.5">
              Status Kehadiran Baru
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
            >
              <option value="TEPAT_WAKTU">TEPAT WAKTU (Disetujui Hadir Normal)</option>
              <option value="TERLAMBAT">TERLAMBAT (Melewati Jam Toleransi)</option>
              <option value="IZIN_SAKIT">IZIN / SAKIT (Surat Keterangan)</option>
              <option value="HADIR_MANUAL">HADIR MANUAL (Dinas Luar / Bypass)</option>
              <option value="ALPHA">ALPHA (Tanpa Keterangan Sah)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-tech font-bold uppercase tracking-wider text-ink">
                Alasan / Justifikasi Koreksi <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-mono text-ink-muted">Wajib untuk Audit</span>
            </div>
            <textarea
              rows={3}
              required
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Pegawai mengalami kendala teknis jaringan GPS di lobi kantor, diverifikasi kehadiran fisiknya."
              className="w-full p-3 rounded-2xl bg-canvas border-2 border-ink text-xs font-medium placeholder-ink-muted focus:outline-none shadow-art-sm resize-none"
            />
          </div>

          {/* Admin Auditor Info */}
          <div className="bg-canvas/60 rounded-xl p-2.5 border border-ink/30 flex items-center justify-between text-[11px] font-mono text-ink-muted">
            <span>Admin Auditor:</span>
            <span className="font-bold text-ink">
              {adminUser?.nik || 'ADM001'} ({adminUser?.nama_lengkap || 'Admin HRD Utama'})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs hover:bg-widget-pure transition shadow-art-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs hover:bg-[#2C3331] transition shadow-art flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
            >
              <i className="ph-bold ph-floppy-disk text-base"></i>
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Koreksi & Catat Audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
