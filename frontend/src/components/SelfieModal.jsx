import React from 'react';

/**
 * Selfie Verification Preview Modal Component
 * Displays the captured selfie snapshot with HUD comic frame, timestamp, GPS coordinate, and distance info.
 */
export default function SelfieModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-ink/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-sm font-bold font-tech uppercase text-ink tracking-tight">
              Bukti Swafoto: {data.nama || 'Karyawan'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-canvas border border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure transition shadow-art-sm"
          >
            <i className="ph-bold ph-x text-xs"></i>
          </button>
        </div>

        {/* Selfie Frame */}
        <div className="aspect-[4/3] bg-ink rounded-2xl border-2 border-ink overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
          {data.fotoUrl ? (
            <img
              src={data.fotoUrl}
              alt="Bukti Swafoto"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-canvas select-none">
              <span className="text-6xl mb-1">🧑‍💻</span>
              <span className="text-[10px] font-tech text-canvas/70">Pratinjau Swafoto</span>
            </div>
          )}

          {/* HUD Overlay inside photo */}
          <div className="absolute bottom-2 left-2 bg-pill/90 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono border border-canvas/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Area Kantor Palu
          </div>
        </div>

        {/* Detailed Metadata Pill */}
        <div className="space-y-1 text-xs font-tech text-ink bg-canvas p-3 rounded-2xl border-2 border-ink shadow-art-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Waktu Catat:</span>
            <span className="font-mono text-xs font-bold text-ink">{data.jamMasuk || data.jam || '08:04:12'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Jarak ke Titik:</span>
            <span className="font-mono font-bold text-emerald-800">{data.jarak ? `${data.jarak}m` : '18.4m'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-muted">Status:</span>
            <span
              className={`font-bold uppercase ${
                data.status === 'TEPAT_WAKTU' ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {data.status || 'TEPAT_WAKTU'}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-ink text-canvas font-tech font-bold text-xs uppercase shadow-art-sm hover:bg-[#2C3331] transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
