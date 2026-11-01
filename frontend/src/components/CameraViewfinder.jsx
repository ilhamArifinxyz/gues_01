import React, { useState, useEffect } from 'react';

/**
 * Camera Viewfinder Component
 * Integrates WebRTC camera stream (navigator.mediaDevices.getUserMedia)
 * Features retro manga comic overlay, HUD watermark timestamp, GPS coordinates, and camera toggle.
 */
export default function CameraViewfinder({ videoRef, isWebcamActive, setIsWebcamActive, userCoords }) {
  const [hudTimestamp, setHudTimestamp] = useState('');
  const [cameraError, setCameraError] = useState(null);

  // Update HUD Watermark Timestamp every second
  useEffect(() => {
    const updateHud = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setHudTimestamp(`${datePart} ${timePart}`);
    };

    updateHud();
    const interval = setInterval(updateHud, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleWebcam = async () => {
    setCameraError(null);
    if (!isWebcamActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.warn('Video play warning:', err));
        }
        setIsWebcamActive(true);
      } catch (err) {
        console.error('Camera access error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak oleh browser. Anda tetap dapat melakukan presensi dengan mode tangkapan simulasi grafis.'
            : 'Perangkat kamera tidak ditemukan atau sedang digunakan oleh aplikasi lain.'
        );
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsWebcamActive(false);
    }
  };

  return (
    <div className="bg-widget rounded-[28px] p-3.5 border-2 border-ink shadow-art relative flex flex-col gap-3">
      {/* Header Viewfinder */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink font-tech">
          <i className="ph-bold ph-camera text-sm"></i>
          <span>LIVE SELFIE VERIFICATION</span>
        </div>
        <button
          type="button"
          onClick={toggleWebcam}
          className={`text-[10px] font-tech font-bold px-3 py-1 rounded-xl border-2 border-ink transition shadow-art-sm ${
            isWebcamActive
              ? 'bg-rose-200 hover:bg-rose-300 text-ink'
              : 'bg-canvas hover:bg-widget-pure text-ink'
          }`}
        >
          {isWebcamActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}
        </button>
      </div>

      {/* Camera Viewfinder Box (Retro Comic Vignette) */}
      <div className="relative w-full aspect-[4/3] bg-ink rounded-[22px] overflow-hidden border-2 border-ink shadow-inner flex items-center justify-center">
        {/* Real Webcam Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${isWebcamActive ? 'block' : 'hidden'}`}
        />

        {/* Fallback Simulated Manga Oval Target when camera is inactive */}
        {!isWebcamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#242A28] to-[#171A19]">
            {/* Oval Face Guide with Corner Crosshairs */}
            <div className="w-32 h-44 rounded-full border-2 border-dashed border-canvas/70 flex flex-col items-center justify-center relative shadow-inner">
              <span className="text-4xl select-none">👤</span>
              <span className="text-[9px] font-tech tracking-wider text-canvas/80 mt-1 uppercase font-bold">
                Wajah Di Sini
              </span>
              {/* Crosshair accents */}
              <span className="absolute -top-2 text-canvas/70 text-xs font-mono font-bold">+</span>
              <span className="absolute -bottom-2 text-canvas/70 text-xs font-mono font-bold">+</span>
              <span className="absolute -left-2 text-canvas/70 text-xs font-mono font-bold">+</span>
              <span className="absolute -right-2 text-canvas/70 text-xs font-mono font-bold">+</span>
            </div>
            <p className="text-[10px] text-canvas/60 font-tech mt-2 text-center">
              Tekan &ldquo;Nyalakan Kamera&rdquo; untuk membuka feed WebRTC
            </p>
          </div>
        )}

        {/* Bottom Left HUD Watermark (Manga / Anime HUD style) */}
        <div className="absolute bottom-2.5 left-2.5 bg-pill/90 text-white border border-canvas/30 px-2.5 py-1 rounded-xl text-[10px] font-mono flex items-center gap-2 shadow-sm pointer-events-none">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            REC
          </span>
          <span>{hudTimestamp}</span>
        </div>

        {/* Top Right GPS Coordinates Badge */}
        <div className="absolute top-2.5 right-2.5 bg-pill/90 text-[#D5DAD4] border border-canvas/30 px-2 py-0.5 rounded-lg text-[9px] font-mono shadow-sm pointer-events-none">
          GPS: {userCoords?.latitude?.toFixed(4) ?? '-0.8917'}, {userCoords?.longitude?.toFixed(4) ?? '119.8872'}
        </div>
      </div>

      {/* Permission / Status Warning message if any */}
      {cameraError && (
        <div className="p-2.5 rounded-xl bg-amber-100 border-2 border-ink text-ink text-[11px] font-medium font-tech">
          ⚠️ {cameraError}
        </div>
      )}
    </div>
  );
}
