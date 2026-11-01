import React, { useState, useEffect } from 'react';

/**
 * Real-Time Digital Clock with VT323 LCD font
 * Seamlessly integrates the Geofence mini-badge (meter distance & inside/outside radius status).
 * Eliminates the need for any redundant standalone 'Lokasi Acuan Kantor' card.
 */
export default function DigitalClock({ distanceMeters = 18.4, isWithinRadius = true, onOpenRadar }) {
  const [timeStr, setTimeStr] = useState('08:00:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      setTimeStr(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-widget rounded-[24px] px-5 py-3 border-2 border-ink shadow-art flex items-center justify-between transition-all">
      <div>
        <span className="text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase block">
          WAKTU SERVER
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-digital tracking-widest font-bold text-ink leading-none">
            {timeStr}
          </span>
          <span className="text-xs font-tech font-bold text-ink-muted">
            WITA
          </span>
        </div>
      </div>

      {/* Geofence Mini Status Badge & Radar Chip Button */}
      <div className="flex flex-col items-end">
        <span className="text-[9px] font-mono font-bold text-ink-muted uppercase">
          RADIUS KANTOR
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Status Badge */}
          <div
            onClick={onOpenRadar}
            title={onOpenRadar ? 'Klik untuk membuka Radar Peta Geofence' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-ink text-ink text-[10px] font-bold shadow-art-sm transition-colors ${
              onOpenRadar ? 'cursor-pointer hover:brightness-95 active:translate-y-0.5' : ''
            } ${isWithinRadius ? 'bg-emerald-200/90' : 'bg-rose-200/90'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isWithinRadius ? 'bg-emerald-600' : 'bg-rose-600 animate-ping'
              }`}
            />
            <span className="font-tech tracking-wide">
              {distanceMeters}m ({isWithinRadius ? 'Aman' : 'Luar'})
            </span>
          </div>

          {/* Quick Chip Button: Radar GPS */}
          {onOpenRadar && (
            <button
              type="button"
              onClick={onOpenRadar}
              title="Buka Radar Geofencing GPS Interaktif"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-widget-pure hover:bg-canvas border-2 border-ink text-ink text-[10px] font-tech font-bold shadow-art-sm transition cursor-pointer active:translate-y-0.5"
            >
              <span>🛰️ Radar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
