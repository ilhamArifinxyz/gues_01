import React, { useState } from 'react';
import { submitLeaveRequest } from '../services/api';

/**
 * Leave Request Modal Component
 * Retro manga modal with form fields for submitting leave/sick requests
 */
export default function LeaveModal({ isOpen, onClose, onSuccess }) {
  const [jenisIzin, setJenisIzin] = useState('IZIN');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().slice(0, 10));
  const [tanggalSelesai, setTanggalSelesai] = useState(new Date().toISOString().slice(0, 10));
  const [alasan, setAlasan] = useState('');
  const [fileBukti, setFileBukti] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alasan.trim()) {
      alert('Mohon isi alasan lengkap permohonan izin Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('jenis_izin', jenisIzin);
      formData.append('tanggal_mulai', tanggalMulai);
      formData.append('tanggal_selesai', tanggalSelesai);
      formData.append('alasan', alasan);
      if (fileBukti) {
        formData.append('bukti', fileBukti);
      }

      const res = await submitLeaveRequest(formData);
      alert('✅ Pengajuan izin Anda telah terkirim ke sistem dan sedang menunggu persetujuan Admin/HRD.');
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      alert(`Gagal mengirim izin: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h3 className="text-sm font-bold font-tech uppercase text-ink tracking-tight">
              Formulir Pengajuan Izin
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-canvas border-2 border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure transition shadow-art-sm"
          >
            <i className="ph-bold ph-x text-sm"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-tech">
          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
              Jenis Permohonan:
            </label>
            <select
              value={jenisIzin}
              onChange={(e) => setJenisIzin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink font-bold text-ink focus:outline-none shadow-art-sm"
            >
              <option value="IZIN">IZIN (Keperluan Pribadi / Keluarga)</option>
              <option value="SAKIT">SAKIT (Dilengkapi Surat Dokter)</option>
              <option value="TUGAS_LUAR">TUGAS_LUAR (Dinas Luar Kantor)</option>
              <option value="CUTI">CUTI TAHUNAN</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                Tanggal Mulai:
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink font-mono text-xs text-ink focus:outline-none shadow-art-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
                Sampai Tanggal:
              </label>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink font-mono text-xs text-ink focus:outline-none shadow-art-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
              Alasan Lengkap:
            </label>
            <textarea
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Tuliskan keterangan dan alasan permohonan izin Anda..."
              className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs focus:outline-none font-medium text-ink shadow-art-sm"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-ink-muted uppercase mb-1">
              Lampirkan Surat Bukti (Opsional):
            </label>
            <input
              type="file"
              onChange={(e) => setFileBukti(e.target.files[0] || null)}
              className="w-full text-xs font-mono text-ink file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-2 file:border-ink file:bg-canvas file:text-ink file:font-bold file:cursor-pointer"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-ink text-canvas font-bold uppercase shadow-art hover:bg-[#2C3331] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-canvas border-t-transparent rounded-full animate-spin"></span>
                  Mengirimkan Permohonan...
                </>
              ) : (
                <>
                  <i className="ph-bold ph-paper-plane-tilt text-sm"></i>
                  Kirim Pengajuan ke HRD
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
