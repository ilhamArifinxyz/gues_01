import React, { useState } from 'react';
import { logoutUser } from '../services/api';

/**
 * ProfileTab Component - Retro Manga Bento (Neo-Brutalist Soft UI)
 * Displays full employee details (Nama Lengkap, NIK, Email, Jabatan, Cabang Kantor,
 * Jadwal Jam Kerja, Status Aktif) and a tactile logout button that clears session token.
 */
export default function ProfileTab({ user, onLogout }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setIsLoggingOut(true);
    try {
      logoutUser();
      if (onLogout) {
        onLogout();
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const jadwalKerja =
    user?.jadwal ||
    (user?.jam_masuk_jadwal && user?.jam_pulang_jadwal
      ? `${user.jam_masuk_jadwal.slice(0, 5)} - ${user.jam_pulang_jadwal.slice(0, 5)} WITA`
      : '08:00 - 17:00 WITA');

  const cabangKantor = user?.cabang || user?.nama_kantor || 'Kantor Cabang Palu (Untad)';
  const statusAktif = user?.status_aktif !== false;

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
      {/* ==================== 1. HERO IDENTITY CARD ==================== */}
      <div className="bg-widget rounded-[26px] p-4 border-2 border-ink shadow-art flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-pill border-2 border-ink flex items-center justify-center text-canvas text-lg font-tech font-bold tracking-wider shadow-art-sm shrink-0">
          {getInitials(user?.nama_lengkap || 'Ilham Arifin')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold font-tech uppercase text-ink truncate">
              {user?.nama_lengkap || 'Ilham Arifin'}
            </h2>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-pill text-emerald-400 border border-ink">
              {user?.role || 'KARYAWAN'}
            </span>
          </div>
          <p className="text-xs font-semibold text-ink-muted mt-0.5 truncate">
            {user?.jabatan || 'Fullstack Developer'}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                statusAktif
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                  : 'bg-rose-100 text-rose-800 border-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusAktif ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                }`}
              ></span>
              {statusAktif ? 'STATUS: AKTIF' : 'STATUS: NON-AKTIF'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 2. DETAILED BENTO FIELDS ==================== */}
      <div className="bg-widget rounded-[28px] p-4 sm:p-5 border-2 border-ink shadow-art flex flex-col gap-3">
        <div className="flex items-center justify-between border-b-2 border-ink/15 pb-2">
          <span className="text-[10px] font-tech font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg bg-pill text-white shadow-art-sm">
            Biodata Karyawan
          </span>
          <span className="text-[10px] font-mono text-ink-muted font-bold">
            ID: {user?.nik || 'F5512530109'}
          </span>
        </div>

        {/* Field List */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* NIK */}
          <div className="bg-[#EFF3ED] rounded-xl p-2.5 border-2 border-ink shadow-art-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-identification-card text-ink text-base"></i>
              <span className="text-[10px] font-tech font-bold uppercase text-ink-muted">
                Nomor Induk Karyawan (NIK)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-ink">
              {user?.nik || 'F5512530109'}
            </span>
          </div>

          {/* Email */}
          <div className="bg-[#EFF3ED] rounded-xl p-2.5 border-2 border-ink shadow-art-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-envelope text-ink text-base"></i>
              <span className="text-[10px] font-tech font-bold uppercase text-ink-muted">
                Email Perusahaan
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-ink truncate max-w-[190px]">
              {user?.email || 'ilham@absensi.com'}
            </span>
          </div>

          {/* Jabatan */}
          <div className="bg-[#EFF3ED] rounded-xl p-2.5 border-2 border-ink shadow-art-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-briefcase text-ink text-base"></i>
              <span className="text-[10px] font-tech font-bold uppercase text-ink-muted">
                Jabatan / Posisi
              </span>
            </div>
            <span className="text-xs font-tech font-bold text-ink">
              {user?.jabatan || 'Fullstack Developer'}
            </span>
          </div>

          {/* Cabang Kantor */}
          <div className="bg-[#EFF3ED] rounded-xl p-2.5 border-2 border-ink shadow-art-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-buildings text-ink text-base"></i>
              <span className="text-[10px] font-tech font-bold uppercase text-ink-muted">
                Cabang Penugasan
              </span>
            </div>
            <span className="text-xs font-tech font-bold text-ink truncate max-w-[180px]">
              {cabangKantor}
            </span>
          </div>

          {/* Jadwal Jam Kerja */}
          <div className="bg-[#EFF3ED] rounded-xl p-2.5 border-2 border-ink shadow-art-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-bold ph-clock text-ink text-base"></i>
              <span className="text-[10px] font-tech font-bold uppercase text-ink-muted">
                Jadwal Shift Kerja
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-ink">
              {jadwalKerja}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 3. TACTILE LOGOUT BUTTON ==================== */}
      <div className="bg-widget rounded-[24px] p-3 border-2 border-ink shadow-art flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          className="w-full py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border-2 border-rose-800 font-tech font-bold text-xs sm:text-sm uppercase tracking-wider shadow-art active:translate-x-0.5 active:translate-y-0.5 active:shadow-art-pressed transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isLoggingOut ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-base"></i>
              <span>Mengakhiri Sesi...</span>
            </>
          ) : (
            <>
              <i className="ph-bold ph-sign-out text-base text-rose-700"></i>
              <span>Keluar dari Sesi (Logout)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
