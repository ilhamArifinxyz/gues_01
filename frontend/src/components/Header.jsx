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
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <h2 className="text-xs font-bold tracking-tight text-ink uppercase font-tech">
              {user?.nama_lengkap || 'Ilham Arifin'}
            </h2>
          </div>
          <p className="text-[11px] text-ink-muted font-medium">
            {user?.jabatan || 'Staf IT'} • {user?.nik || 'F5512530109'}
          </p>
          <p className="text-[10px] text-ink-light font-mono mt-0.5">
            Jadwal: {user?.jadwal || '08:00 - 17:00 WITA'}
          </p>
        </div>
      </div>

      {/* Quote / Mood Capsule (Retro Manga Bento Style) */}
      <div className="hidden sm:flex flex-col items-end text-right border-l-2 border-ink/20 pl-3">
        <span className="text-[9px] font-tech text-ink-muted uppercase font-bold">
          {user?.cabang || 'Palu Branch'}
        </span>
        <span className="text-[10px] font-bold text-ink italic">
          Work with art & precision.
        </span>
      </div>
    </div>
  );
}
