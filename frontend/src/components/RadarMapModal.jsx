import React, { useState } from 'react';
import { OFFICE_COORDS, GPS_ACCURACY_THRESHOLD_METERS, getCurrentCoordinates } from '../services/api';

/**
 * RadarMapModal - Interactive Geofencing GPS Radar Map
 * Aesthetic: Retro Manga Bento (Neo-Brutalist Soft UI)
 * Features:
 * - 2px-3px Black Ink Contoured SVG Tactical Canvas
 * - Real-time Concentric Grid Radar with Sweep Scanner Animation
 * - 50m Geofence Office Boundary Circle with Pulse Animation
 * - Central Flag/Building Marker for Kantor Acuan Palu
 * - User GPS Position Pin with Distance Vector Line & Accuracy Radius
 * - Telemetry Bento Cards: Distance to Office, GPS Accuracy & Signal Quality
 * - Quick Simulation & Live GPS Refresh Switcher
 */
export default function RadarMapModal({
  isOpen,
  onClose,
  userCoords,
  distanceMeters = 18.4,
  isWithinRadius = true,
  gpsAccuracy = 12.5,
  gpsAccuracyWarning = null,
  officeCoords = OFFICE_COORDS,
  onSetSimulation
}) {
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState(null);

  if (!isOpen) return null;

  // Active office configuration
  const targetOffice = officeCoords || OFFICE_COORDS;
  const radiusOffice = targetOffice.radiusMeters || 50;

  // Handle hardware GPS acquisition refresh
  const handleLiveGpsRefresh = async () => {
    setIsRefreshingGps(true);
    setRefreshNotice(null);
    try {
      const live = await getCurrentCoordinates({ timeout: 7000 });
      if (onSetSimulation) {
        // If host provided custom coordinate updater
        onSetSimulation({
          latitude: live.latitude,
          longitude: live.longitude,
          accuracy: live.accuracy
        });
      }
      setRefreshNotice({
        type: live.isValidAccuracy ? 'success' : 'warning',
        text: `GPS Terbaca: ±${live.accuracy}m (${live.isValidAccuracy ? 'Sinyal Valid' : 'Akurasi Rendah > 100m'})`
      });
    } catch (err) {
      setRefreshNotice({
        type: 'error',
        text: `Gagal membaca GPS: ${err.message}`
      });
    } finally {
      setIsRefreshingGps(false);
    }
  };

  // ==========================================
  // SVG RADAR MATHEMATICAL PROJECTION
  // ==========================================
  const svgCenter = 170;
  const maxScopeRadius = 145;

  // Adaptive scale: ensure both geofence (50m) and user distance are visible
  const displayMaxMeters = Math.max(75, Math.min(distanceMeters * 1.35, 750));
  const pixelsPerMeter = (maxScopeRadius - 20) / displayMaxMeters;

  // SVG radius for 50m geofence circle
  const geofenceRadiusSvg = Math.max(26, radiusOffice * pixelsPerMeter);

  // User bearing relative to office
  const latDelta = (userCoords?.latitude ?? targetOffice.latitude) - targetOffice.latitude;
  const lonDelta = (userCoords?.longitude ?? targetOffice.longitude) - targetOffice.longitude;

  let bearingAngle = Math.atan2(latDelta, lonDelta);
  if (latDelta === 0 && lonDelta === 0) {
    // Default diagonal offset when exact match
    bearingAngle = Math.PI / 4;
  }

  // Clamped SVG coordinates for user pin
  const userDistSvg = Math.min(maxScopeRadius - 15, Math.max(14, distanceMeters * pixelsPerMeter));
  const userSvgX = svgCenter + userDistSvg * Math.cos(bearingAngle);
  // Invert Y axis for screen projection (North is upward)
  const userSvgY = svgCenter - userDistSvg * Math.sin(bearingAngle);

  // GPS accuracy uncertainty circle in SVG pixels
  const accuracyRadiusSvg = Math.max(8, Math.min(42, (gpsAccuracy ?? 15) * pixelsPerMeter));

  // Determine accuracy validation status
  const isAccuracyValid = (gpsAccuracy ?? 0) <= GPS_ACCURACY_THRESHOLD_METERS;

  return (
    <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Inline styles for tactical radar sweep & pulse animations */}
      <style>{`
        @keyframes sweepScan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes geofencePulse {
          0% { r: ${geofenceRadiusSvg}px; opacity: 0.8; }
          100% { r: ${geofenceRadiusSvg + 12}px; opacity: 0; }
        }
        @keyframes userPing {
          0% { r: 6px; opacity: 0.9; }
          100% { r: 18px; opacity: 0; }
        }
      `}</style>

      {/* Main Bento Modal Dialog */}
      <div className="bg-canvas rounded-[32px] border-3 border-ink shadow-[6px_7px_0px_#1E2322] max-w-lg w-full p-4 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ========================================================= */}
        {/* MODAL HEADER: Title, Target Office Info & Close Button    */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-ink text-canvas flex items-center justify-center font-bold text-lg shadow-art-sm">
              🛰️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-tech uppercase text-ink tracking-tight">
                  PETA RADIUS KANTOR
                </h3>
                <span className="px-1.5 py-0.5 rounded-md bg-ink text-[#E6EAE4] font-mono text-[9px] font-bold">
                  LIVE GPS
                </span>
              </div>
              <p className="text-[11px] font-tech text-ink-muted flex items-center gap-1 font-semibold">
                <span>Kantor Acuan:</span>
                <span className="text-ink font-bold">{targetOffice.name || 'Kantor Cabang Palu'}</span>
                <span>• Radius {radiusOffice}m</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Tutup Radar"
            className="w-8 h-8 rounded-full bg-widget hover:bg-widget-pure border-2 border-ink flex items-center justify-center font-bold text-ink shadow-art-sm transition cursor-pointer active:translate-y-0.5"
          >
            <i className="ph-bold ph-x text-sm"></i>
          </button>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE RETRO MANGA SVG RADAR CANVAS                  */}
        {/* ========================================================= */}
        <div className="relative bg-[#151C19] rounded-[24px] border-3 border-ink shadow-art p-3 sm:p-4 flex flex-col items-center overflow-hidden">
          {/* Tactical Manga Corner Brackets */}
          <div className="w-full flex justify-between items-center text-[9px] font-mono font-bold text-[#4E685E] px-1 select-none pointer-events-none">
            <span>⌜ STATUS: AKTIF</span>
            <span>RADIUS: {radiusOffice}M ⌝</span>
          </div>

          {/* SVG Tactical Display */}
          <div className="relative w-full max-w-[320px] aspect-square my-1">
            <svg
              viewBox="0 0 340 340"
              className="w-full h-full select-none"
            >
              <defs>
                {/* Radial Gradient for Rotating Sweep Cone */}
                <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#10B981" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>

                {/* Manga Dot Hatching Pattern for Geofence Interior */}
                <pattern id="mangaHatch" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="1" fill="#10B981" opacity="0.3" />
                </pattern>
              </defs>

              {/* 1. Tactical Outer Scope Circle */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={maxScopeRadius}
                fill="#121816"
                stroke="#2C3D36"
                strokeWidth="2.5"
              />

              {/* 2. Concentric Range Grid Rings (25m, 50m geofence, 100m) */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={maxScopeRadius * 0.35}
                fill="none"
                stroke="#24342E"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={maxScopeRadius * 0.7}
                fill="none"
                stroke="#24342E"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* 3. Crosshair Axes & Cardinal Guides */}
              <line
                x1={svgCenter - maxScopeRadius}
                y1={svgCenter}
                x2={svgCenter + maxScopeRadius}
                y2={svgCenter}
                stroke="#2C3D36"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
              <line
                x1={svgCenter}
                y1={svgCenter - maxScopeRadius}
                x2={svgCenter}
                y2={svgCenter + maxScopeRadius}
                stroke="#2C3D36"
                strokeWidth="1"
                strokeDasharray="4 3"
              />

              {/* Cardinal Labels (N, E, S, W) */}
              <text x={svgCenter} y={svgCenter - maxScopeRadius + 14} textAnchor="middle" fill="#5E786E" fontSize="10" fontWeight="bold" fontFamily="monospace">U (UTARA)</text>
              <text x={svgCenter + maxScopeRadius - 14} y={svgCenter + 4} textAnchor="middle" fill="#5E786E" fontSize="10" fontWeight="bold" fontFamily="monospace">T</text>
              <text x={svgCenter} y={svgCenter + maxScopeRadius - 6} textAnchor="middle" fill="#5E786E" fontSize="10" fontWeight="bold" fontFamily="monospace">S</text>
              <text x={svgCenter - maxScopeRadius + 14} y={svgCenter + 4} textAnchor="middle" fill="#5E786E" fontSize="10" fontWeight="bold" fontFamily="monospace">B</text>

              {/* 4. Rotating Sweep Scanner Animation */}
              <g
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  animation: 'sweepScan 4.2s linear infinite'
                }}
              >
                <path
                  d={`M ${svgCenter} ${svgCenter} L ${svgCenter} ${svgCenter - maxScopeRadius} A ${maxScopeRadius} ${maxScopeRadius} 0 0 1 ${svgCenter + maxScopeRadius * 0.707} ${svgCenter - maxScopeRadius * 0.707} Z`}
                  fill="url(#sweepGradient)"
                />
                <line
                  x1={svgCenter}
                  y1={svgCenter}
                  x2={svgCenter}
                  y2={svgCenter - maxScopeRadius}
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* 5. Geofence Office Boundary Circle (50m) with Soft Green + Pulse */}
              {/* Pulsing expand wave */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={geofenceRadiusSvg}
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                style={{
                  transformOrigin: `${svgCenter}px ${svgCenter}px`,
                  animation: 'geofencePulse 2.4s ease-out infinite'
                }}
              />
              {/* Solid geofence filled zone */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={geofenceRadiusSvg}
                fill="rgba(16, 185, 129, 0.16)"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeDasharray="6 3"
              />
              {/* Geofence hatch fill */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r={geofenceRadiusSvg}
                fill="url(#mangaHatch)"
              />
              {/* Geofence 50m Perimeter Tag */}
              <text
                x={svgCenter}
                y={Math.max(34, svgCenter - geofenceRadiusSvg - 6)}
                textAnchor="middle"
                fill="#34D399"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ● RADIUS KANTOR 50M ●
              </text>

              {/* 6. Distance Vector Connector Line: Office -> User */}
              <line
                x1={svgCenter}
                y1={svgCenter}
                x2={userSvgX}
                y2={userSvgY}
                stroke={isWithinRadius ? '#10B981' : '#EF4444'}
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              {/* 7. Center Pin: Kantor Acuan Palu (Golden Badge & Icon) */}
              <circle
                cx={svgCenter}
                cy={svgCenter}
                r="13"
                fill="#FBBF24"
                stroke="#1E2322"
                strokeWidth="2.5"
              />
              <text
                x={svgCenter}
                y={svgCenter + 4}
                textAnchor="middle"
                fontSize="12"
                dominantBaseline="middle"
              >
                🏢
              </text>
              {/* Center Office Badge Label */}
              <rect
                x={svgCenter - 54}
                y={svgCenter + 15}
                width="108"
                height="17"
                rx="4"
                fill="#1E2322"
                stroke="#FBBF24"
                strokeWidth="1.2"
              />
              <text
                x={svgCenter}
                y={svgCenter + 26}
                textAnchor="middle"
                fill="#FDE68A"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                KANTOR PALU (0m)
              </text>

              {/* 8. User Coordinate Marker */}
              {/* GPS Accuracy Uncertainty Ring */}
              <circle
                cx={userSvgX}
                cy={userSvgY}
                r={accuracyRadiusSvg}
                fill={isWithinRadius ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}
                stroke={isAccuracyValid ? (isWithinRadius ? '#10B981' : '#EF4444') : '#F59E0B'}
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />

              {/* Ping Ring Animation */}
              <circle
                cx={userSvgX}
                cy={userSvgY}
                r="7"
                fill="none"
                stroke={isWithinRadius ? '#34D399' : '#F87171'}
                strokeWidth="2"
                style={{
                  transformOrigin: `${userSvgX}px ${userSvgY}px`,
                  animation: 'userPing 1.8s ease-out infinite'
                }}
              />

              {/* User Solid Center Dot */}
              <circle
                cx={userSvgX}
                cy={userSvgY}
                r="7"
                fill={isWithinRadius ? '#10B981' : '#EF4444'}
                stroke="#1E2322"
                strokeWidth="2.5"
              />

              {/* User Callout Label Badge */}
              <g transform={`translate(${userSvgX > svgCenter ? userSvgX - 90 : userSvgX + 10}, ${userSvgY > svgCenter ? userSvgY - 32 : userSvgY + 8})`}>
                <rect
                  width="84"
                  height="26"
                  rx="6"
                  fill="#1E2322"
                  stroke={isWithinRadius ? '#10B981' : '#EF4444'}
                  strokeWidth="1.5"
                />
                <text
                  x="42"
                  y="10"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  📍 Posisi Anda
                </text>
                <text
                  x="42"
                  y="20"
                  textAnchor="middle"
                  fill={isWithinRadius ? '#34D399' : '#F87171'}
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {distanceMeters}m ({isWithinRadius ? 'AMAN' : 'LUAR'})
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom Tactical Footer Notice */}
          <div className="w-full flex justify-between items-center text-[9px] font-mono font-bold text-[#4E685E] px-1 select-none pointer-events-none">
            <span>⌞ THRESHOLD: ≤ 100m ACCURACY</span>
            <span>BEARING: {Math.round((bearingAngle * 180) / Math.PI)}° ⌟</span>
          </div>
        </div>

        {/* Live Hardware GPS Refresh Notice */}
        {refreshNotice && (
          <div
            className={`p-2.5 rounded-xl border-2 border-ink text-xs font-tech font-bold shadow-art-sm flex items-center justify-between gap-2 ${
              refreshNotice.type === 'success'
                ? 'bg-emerald-100 text-ink'
                : refreshNotice.type === 'warning'
                ? 'bg-amber-100 text-ink'
                : 'bg-rose-100 text-ink'
            }`}
          >
            <span>{refreshNotice.text}</span>
            <button
              type="button"
              onClick={() => setRefreshNotice(null)}
              className="text-xs font-bold text-ink hover:opacity-75 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TELEMETRY BENTO STATUS CARDS (3 Cards)                   */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-tech">
          
          {/* Card 1: Jarak ke Kantor */}
          <div className="bg-widget p-3 rounded-2xl border-2 border-ink shadow-art-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold text-ink-muted uppercase">
              📏 Jarak ke Kantor
            </span>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl font-bold font-digital tracking-wider text-ink">
                {distanceMeters}
              </span>
              <span className="text-xs font-bold text-ink-muted">METER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isWithinRadius ? 'bg-emerald-600' : 'bg-rose-600 animate-ping'
                }`}
              />
              <span className="text-[11px] font-bold text-ink">
                {isWithinRadius
                  ? '🟢 Dalam Radius (Maks 50m)'
                  : `⛔ Di Luar Radius (+${Math.max(0, distanceMeters - radiusOffice).toFixed(1)}m)`}
              </span>
            </div>
          </div>

          {/* Card 2: Akurasi GPS & Threshold 100m */}
          <div className="bg-widget p-3 rounded-2xl border-2 border-ink shadow-art-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase">
                🛰️ Akurasi Sinyal GPS
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-ink/10 border border-ink/30 text-ink font-bold">
                Maks: 100m
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="text-2xl font-bold font-digital tracking-wider text-ink">
                ±{gpsAccuracy}
              </span>
              <span className="text-xs font-bold text-ink-muted">METER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAccuracyValid ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="text-[11px] font-bold text-ink">
                {isAccuracyValid
                  ? '🟢 Presisi Tinggi (GPS Sah)'
                  : '⚠️ Akurasi Rendah (> 100m)'}
              </span>
            </div>
          </div>

        </div>

        {/* Card 3: Rekomendasi Sinyal & Geofence Guidance */}
        <div
          className={`p-3 rounded-2xl border-2 border-ink shadow-art-sm text-xs font-tech flex items-start gap-2.5 ${
            !isAccuracyValid
              ? 'bg-amber-100 text-ink'
              : !isWithinRadius
              ? 'bg-rose-100 text-ink'
              : 'bg-emerald-100 text-ink'
          }`}
        >
          <span className="text-lg leading-none mt-0.5">
            {!isAccuracyValid ? '⚠️' : !isWithinRadius ? '⛔' : '✅'}
          </span>
          <div className="space-y-0.5">
            <p className="font-bold text-[11px] uppercase tracking-wide">
              {!isAccuracyValid
                ? 'Sinyal GPS Kurang Akurat'
                : !isWithinRadius
                ? 'Lokasi Anda Di Luar Area Kantor Cabang'
                : 'Status Lokasi & Akurasi Memenuhi Syarat Presensi'}
            </p>
            <p className="text-[11px] font-medium leading-relaxed opacity-90">
              {!isAccuracyValid
                ? 'Sinyal GPS terdeteksi belum cukup stabil (> 100m). Mohon pastikan berada di area terbuka dan aktifkan GPS akurasi tinggi.'
                : !isWithinRadius
                ? 'Anda berjarak ' + distanceMeters + 'm dari titik kantor (batas maksimal ' + radiusOffice + 'm). Dekatilah area kantor Palu untuk melakukan presensi.'
                : 'Posisi GPS terverifikasi dan berada di dalam batas kantor. Anda dapat mencatat kehadiran dengan sah.'}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ACTION BAR: Quick Simulator Bar & Live Hardware Refresh   */}
        {/* ========================================================= */}
        <div className="pt-2 border-t-2 border-ink flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Quick Simulation Drawer (Collapsible) */}
          <details className="w-full sm:w-auto text-[10px] group">
            <summary className="font-mono font-bold text-ink-muted hover:text-ink cursor-pointer select-none flex items-center gap-1">
              <span>⚙️ Uji Posisi</span>
              <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="flex items-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => onSetSimulation && onSetSimulation(true)}
                className={`px-2 py-0.5 rounded-lg border border-ink font-tech font-bold text-[10px] shadow-art-sm transition cursor-pointer ${
                  isWithinRadius && isAccuracyValid
                    ? 'bg-emerald-300 text-ink'
                    : 'bg-canvas hover:bg-emerald-100 text-ink'
                }`}
              >
                18m
              </button>
              <button
                type="button"
                onClick={() => onSetSimulation && onSetSimulation(false)}
                className={`px-2 py-0.5 rounded-lg border border-ink font-tech font-bold text-[10px] shadow-art-sm transition cursor-pointer ${
                  !isWithinRadius
                    ? 'bg-rose-300 text-ink'
                    : 'bg-canvas hover:bg-rose-100 text-ink'
                }`}
              >
                340m
              </button>
              <button
                type="button"
                onClick={() => onSetSimulation && onSetSimulation('weak')}
                className={`px-2 py-0.5 rounded-lg border border-ink font-tech font-bold text-[10px] shadow-art-sm transition cursor-pointer ${
                  !isAccuracyValid
                    ? 'bg-amber-300 text-ink'
                    : 'bg-canvas hover:bg-amber-100 text-ink'
                }`}
              >
                ±145m
              </button>
            </div>
          </details>

          {/* Hardware Live GPS Refresh Button */}
          <button
            type="button"
            onClick={handleLiveGpsRefresh}
            disabled={isRefreshingGps}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-ink hover:bg-[#2C3331] text-canvas font-tech font-bold text-xs shadow-art-sm flex items-center justify-center gap-2 transition cursor-pointer active:translate-y-0.5 disabled:opacity-50"
          >
            {isRefreshingGps ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                <span>Mencari Satelit...</span>
              </>
            ) : (
              <>
                <i className="ph-bold ph-crosshair text-sm"></i>
                <span>📡 Perbarui Titik GPS</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
