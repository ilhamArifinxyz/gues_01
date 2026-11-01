import React, { useState } from 'react';

/**
 * Big Tactile Punch Button (Solid Charcoal Manga Aesthetic)
 * Captures image frame from WebRTC video or offscreen canvas,
 * validates geofence, and triggers attendance recording with loading state.
 */
export default function PunchButton({
  videoRef,
  isWebcamActive,
  isWithinRadius,
  distanceMeters,
  userCoords,
  onPunch,
  onSetSimulation,
  todayAttendance,
  isSubmitting
}) {
  // Determine whether this punch is for MASUK or PULANG (3 dynamic status logic)
  const hasCheckedIn = Boolean(todayAttendance?.masuk || todayAttendance?.sudah_masuk);
  const hasCheckedOut = Boolean(todayAttendance?.pulang || todayAttendance?.sudah_pulang);
  const isCompleted = hasCheckedIn && hasCheckedOut;
  const punchType = !hasCheckedIn ? 'MASUK' : 'PULANG';

  /**
   * Helper to capture image frame from video element or generate SVG snapshot
   */
  const captureFrame = () => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      if (isWebcamActive && videoRef?.current && videoRef.current.readyState >= 2) {
        // Draw mirrored video frame to canvas
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        // Draw retro manga simulated avatar snapshot
        ctx.fillStyle = '#1E2322';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw decorative retro manga grid lines
        ctx.strokeStyle = '#2A3330';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw avatar circle and text
        ctx.fillStyle = '#D5DAD4';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MANGA SELFIE CAPTURE', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillText(`GEO-TAG: PALU BRANCH (${new Date().toLocaleTimeString('id-ID')})`, canvas.width / 2, canvas.height / 2 + 15);
      }

      // Add watermark overlay on the captured frame
      ctx.fillStyle = 'rgba(30, 35, 34, 0.85)';
      ctx.fillRect(16, canvas.height - 46, 320, 32);
      ctx.strokeStyle = '#D5DAD4';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, canvas.height - 46, 320, 32);
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VERIFIED • ${new Date().toLocaleString('id-ID')}`, 28, canvas.height - 25);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      canvas.toBlob((blob) => {
        resolve({ blob, dataUrl });
      }, 'image/jpeg', 0.85);
    });
  };

  const handleClick = async () => {
    if (!isWithinRadius || isCompleted || isSubmitting) {
      return;
    }

    const { blob, dataUrl } = await captureFrame();
    onPunch({
      jenis: punchType,
      photoBlob: blob,
      photoDataUrl: dataUrl,
      latitude: userCoords?.latitude,
      longitude: userCoords?.longitude
    });
  };

  // Determine dynamic tactile button classes based on presence state
  let buttonStyleClasses = '';
  if (isCompleted || !isWithinRadius) {
    buttonStyleClasses = 'bg-ink/20 text-ink/40 border-2 border-ink/30 cursor-not-allowed shadow-none';
  } else if (hasCheckedIn) {
    // Kondisi B: Sudah absen masuk namun belum absen pulang (Warna Aksen Retro Terracotta / Vermilion)
    buttonStyleClasses = 'bg-[#D9532F] hover:bg-[#C24422] text-white shadow-art active:translate-x-[2px] active:translate-y-[2px] active:shadow-art-sm cursor-pointer border-2 border-ink';
  } else {
    // Kondisi A: Belum absen masuk (Tombol Taktil Solid Hitam)
    buttonStyleClasses = 'bg-ink hover:bg-[#2C3331] text-canvas shadow-art active:translate-x-[2px] active:translate-y-[2px] active:shadow-art-sm cursor-pointer border-2 border-ink';
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Big Manga Bento Dynamic Presence Button */}
      <button
        type="button"
        disabled={!isWithinRadius || isSubmitting || isCompleted}
        onClick={handleClick}
        className={`w-full py-4 px-4 font-bold font-tech text-sm tracking-wider rounded-[20px] transition-all flex items-center justify-center gap-2 uppercase select-none ${buttonStyleClasses}`}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            {punchType === 'MASUK' ? 'Mencatat Presensi Masuk...' : 'Mencatat Presensi Pulang...'}
          </span>
        ) : isCompleted ? (
          <span className="flex items-center gap-2 font-tech font-bold">
            ✅ KEHADIRAN HARI INI LENGKAP
          </span>
        ) : hasCheckedIn ? (
          <span className="flex items-center gap-2 font-tech font-bold">
            <i className="ph-bold ph-camera text-lg"></i>
            AMBIL FOTO & CATAT PRESENSI PULANG
          </span>
        ) : (
          <span className="flex items-center gap-2 font-tech font-bold">
            <i className="ph-bold ph-camera text-lg"></i>
            AMBIL FOTO & CATAT PRESENSI MASUK
          </span>
        )}
      </button>

      {/* Warning banner if outside geofence */}
      {!isWithinRadius && (
        <div className="p-2.5 rounded-xl bg-rose-200 border-2 border-ink text-ink text-center text-xs font-bold font-tech shadow-art-sm animate-pulse">
          ⛔ Anda berada di luar radius kantor ({distanceMeters} meter). Presensi ditolak!
        </div>
      )}

      {/* GPS Quick Simulator Drawer (Collapsible for Clean Production View) */}
      <details className="pt-1 border-t border-ink/20 group">
        <summary className="text-[10px] text-ink-muted hover:text-ink font-mono font-bold tracking-tight cursor-pointer select-none flex items-center justify-between py-0.5 transition">
          <span className="flex items-center gap-1.5">
            <span>⚙️</span>
            <span>Simulasi Uji Jarak GPS</span>
          </span>
          <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="flex items-center justify-between pt-2 pb-0.5 text-[10px] text-ink-muted">
          <span className="font-mono font-bold tracking-tight text-[10px]">JARAK:</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onSetSimulation(true)}
              className={`px-2 py-0.5 rounded-lg border border-ink font-bold font-tech transition shadow-art-sm cursor-pointer ${
                isWithinRadius
                  ? 'bg-emerald-300 text-ink'
                  : 'bg-emerald-100/70 text-ink/70 hover:bg-emerald-200'
              }`}
            >
              18m (Dalam)
            </button>
            <button
              type="button"
              onClick={() => onSetSimulation(false)}
              className={`px-2 py-0.5 rounded-lg border border-ink font-bold font-tech transition shadow-art-sm cursor-pointer ${
                !isWithinRadius
                  ? 'bg-rose-300 text-ink'
                  : 'bg-rose-100/70 text-ink/70 hover:bg-rose-200'
              }`}
            >
              340m (Luar)
            </button>
            <button
              type="button"
              onClick={() => onSetSimulation('weak')}
              className="px-2 py-0.5 rounded-lg border border-ink font-bold font-tech transition shadow-art-sm bg-amber-100/70 text-ink/80 hover:bg-amber-200 cursor-pointer"
              title="Simulasi sinyal GPS lemah / triangulasi seluler > 100m"
            >
              ±145m (Kasar)
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
