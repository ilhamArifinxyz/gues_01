import React from 'react';
import { calculateWorkDuration } from '../services/api';

/**
 * Attendance Summary Component (Retro Manga Bento Style)
 * Displays Masuk & Pulang status capsules with LCD digital fonts
 * and automatically computes & displays effective working hours:
 * "Total Jam Kerja: X Jam Y Menit" when both check-in and check-out are present.
 */
export default function AttendanceSummary({ todayAttendance }) {
  const masuk = todayAttendance?.masuk;
  const pulang = todayAttendance?.pulang;

  const statusMasuk = masuk?.status_kehadiran || masuk?.status;
  const statusPulang = pulang?.status_kehadiran || pulang?.status;

  const hasBoth = Boolean(masuk && pulang);

  // Calculate or retrieve formatted work duration
  let durationText = '';
  if (hasBoth) {
    if (todayAttendance?.total_jam_kerja) {
      durationText = todayAttendance.total_jam_kerja;
    } else {
      const calc = calculateWorkDuration(masuk.jam, pulang.jam);
      durationText = calc ? calc.formatted : '-- Jam -- Menit';
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 2-Column Bento Grid for Masuk and Pulang Capsules */}
      <div className="grid grid-cols-2 gap-3">
        {/* Masuk Status Capsule */}
        <div className="bg-widget rounded-[22px] p-3 border-2 border-ink shadow-art flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-tech font-bold text-ink-muted tracking-wider uppercase">
              Presensi Masuk
            </span>
            <i className="ph-bold ph-sign-in text-ink text-sm"></i>
          </div>
          <p className="text-base font-digital font-bold text-ink mt-2 tracking-wide leading-none">
            {masuk ? masuk.jam : '--:--:--'}
          </p>
          <div className="mt-2">
            {masuk ? (
              <span
                className={`inline-block text-[9px] font-bold font-tech px-2 py-0.5 rounded-full border ${
                  statusMasuk === 'TEPAT_WAKTU'
                    ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                    : 'bg-amber-200 text-amber-900 border-amber-400'
                }`}
              >
                {statusMasuk === 'TEPAT_WAKTU' ? 'TEPAT WAKTU' : 'TERLAMBAT'}
              </span>
            ) : (
              <span className="inline-block text-[9px] font-bold font-tech px-2 py-0.5 rounded-full bg-ink/10 text-ink-muted border border-ink/20">
                Belum Masuk
              </span>
            )}
          </div>
        </div>

        {/* Pulang Status Capsule */}
        <div className="bg-widget rounded-[22px] p-3 border-2 border-ink shadow-art flex flex-col justify-between transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-tech font-bold text-ink-muted tracking-wider uppercase">
              Presensi Pulang
            </span>
            <i className="ph-bold ph-sign-out text-ink text-sm"></i>
          </div>
          <p className="text-base font-digital font-bold text-ink mt-2 tracking-wide leading-none">
            {pulang ? pulang.jam : '--:--:--'}
          </p>
          <div className="mt-2">
            {pulang ? (
              <span
                className={`inline-block text-[9px] font-bold font-tech px-2 py-0.5 rounded-full border ${
                  statusPulang === 'PULANG_NORMAL'
                    ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                    : 'bg-rose-200 text-rose-900 border-rose-400'
                }`}
              >
                {statusPulang === 'PULANG_NORMAL' ? 'PULANG NORMAL' : 'PULANG CEPAT'}
              </span>
            ) : (
              <span className="inline-block text-[9px] font-bold font-tech px-2 py-0.5 rounded-full bg-ink/10 text-ink-muted border border-ink/20">
                Jadwal: 17:00
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bento Card: Total Jam Kerja Efektif (Appears when both Masuk & Pulang recorded) */}
      {hasBoth && (
        <div className="bg-[#1E2322] text-[#D5DAD4] rounded-[22px] p-3.5 border-2 border-ink shadow-art flex items-center justify-between transition-all animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A3330] border-2 border-[#3E4A46] flex items-center justify-center text-emerald-400 shadow-art-sm">
              <i className="ph-fill ph-timer text-xl"></i>
            </div>
            <div>
              <span className="text-[9px] font-tech font-bold text-[#8A9490] tracking-wider uppercase block">
                Durasi Kerja Efektif
              </span>
              <span className="text-xs font-tech font-bold text-white mt-0.5 block">
                Total Jam Kerja: <span className="text-emerald-400 font-digital text-sm font-bold tracking-wider">{durationText}</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-digital font-bold text-emerald-400 tracking-wider block leading-none">
              {durationText}
            </span>
            <span className="text-[9px] font-tech font-bold text-emerald-300 mt-1 inline-block uppercase bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
              Presensi Lengkap
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
