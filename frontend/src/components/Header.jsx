import React from 'react';

/**
 * Bento Header Component
 * Contains Inverted Black Pill Calendar Widget, User Info, Shift Schedule, and Branch Motto
 */
export default function Header({ user }) {
  const currentDate = new Date();
  const dayNumber = currentDate.getDate();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  
  const monthStr = monthNames[currentDate.getMonth()];
  const dayNameStr = dayNames[currentDate.getDay()];

  return (
    <div className="bg-widget rounded-[26px] p-3.5 border-2 border-ink shadow-art flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        {/* Calendar Inverted Pill */}
        <div className="bg-pill text-white px-3 py-2 rounded-2xl border-2 border-ink text-center flex flex-col items-center justify-center min-w-[58px] shadow-art-sm">
          <span className="text-[9px] font-tech tracking-widest text-[#9AA5A1] uppercase font-bold">
            {monthStr}
          </span>
          <span className="text-2xl font-digital font-bold leading-none text-white my-0.5">
            {dayNumber}
          </span>
          <span className="text-[8px] font-mono font-bold text-emerald-400">
            {dayNameStr}
          </span>
        </div>

        {/* User Info & Shift Schedule */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <h2 className="text-sm font-bold tracking-tight text-ink uppercase font-tech">
              {user?.nama_lengkap || 'Ilham Arifin'}
            </h2>
          </div>
          <p className="text-xs text-ink-muted font-bold font-tech">
            {user?.jabatan || 'Staf IT'} • <span className="font-mono font-medium">{user?.nik || 'F5512530109'}</span>
          </p>
          <p className="text-[11px] text-ink-light font-mono">
            Jadwal: {user?.jadwal || '08:00 - 17:00 WITA'}
          </p>
        </div>
      </div>

      {/* Branch Location Capsule (Clean & Responsive) */}
      <div className="flex flex-col items-end text-right pl-2">
        <div className="px-2.5 py-1 rounded-xl bg-canvas border-2 border-ink text-[11px] font-tech font-bold text-ink shadow-art-sm flex items-center gap-1.5">
          <i className="ph-fill ph-buildings text-xs text-ink"></i>
          <span>{user?.cabang || 'Kantor Cabang Palu'}</span>
        </div>
      </div>
    </div>
  );
}
