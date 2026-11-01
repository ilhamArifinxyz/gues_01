import React, { useState } from 'react';
import { getAttendanceAnalytics } from '../services/api';

/**
 * AttendanceAnalyticsCard (Fitur F-06)
 * Visualisasi distribusi kehadiran 30 hari terakhir bergaya Retro Manga Bento.
 * - Bar persentase distribusi (Tepat Waktu, Terlambat, Izin/Sakit)
 * - Komparasi tren 4 pekan kerja
 * - Metrik performa LCD (Punctuality score, rata-rata keterlambatan)
 */
export default function AttendanceAnalyticsCard({ stats }) {
  const [analytics] = useState(() => getAttendanceAnalytics());
  const [selectedPekan, setSelectedPekan] = useState(null);

  // Gunakan data stats live jika tersedia, fallback ke analytics 30 hari
  const total = (stats?.tepatWaktu || 0) + (stats?.terlambat || 0) + (stats?.izinSakit || 0) || analytics.totalCatatan;
  const onTimeCount = stats?.tepatWaktu ?? analytics.tepatWaktu;
  const lateCount = stats?.terlambat ?? analytics.terlambat;
  const leaveCount = stats?.izinSakit ?? analytics.izinSakit;

  const onTimePct = total > 0 ? ((onTimeCount / total) * 100).toFixed(1) : 0;
  const latePct = total > 0 ? ((lateCount / total) * 100).toFixed(1) : 0;
  const leavePct = total > 0 ? ((leaveCount / total) * 100).toFixed(1) : 0;

  return (
    <div className="bg-widget rounded-[32px] p-6 border-3 border-ink shadow-art-lg flex flex-col justify-between gap-6 transition hover:border-black">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-ink/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-tech text-[10px] uppercase tracking-widest font-bold">
              ANALISIS TREN PRESENSI
            </span>
            <span className="text-[11px] font-mono text-ink-muted font-bold">
              Periode 30 Hari Terakhir
            </span>
          </div>
          <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1 flex items-center gap-2">
            <i className="ph-bold ph-chart-bar text-xl text-emerald-800"></i>
            <span>Distribusi Tren & Rasio Kehadiran Pegawai</span>
          </h3>
        </div>

        {/* Quick Discipline Score Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-canvas px-3.5 py-1.5 rounded-2xl border-2 border-ink shadow-art-sm">
          <i className="ph-bold ph-seal-check text-emerald-800 text-lg"></i>
          <div>
            <div className="text-[9px] font-tech uppercase tracking-wider text-ink-muted font-bold">
              Punctuality Index
            </div>
            <div className="text-sm font-digital font-bold text-ink leading-none">
              {analytics.skorDisiplin}/100 <span className="text-[10px] text-emerald-700 font-mono">(SANGAT BAIK)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Retro Manga Segmented Distribution Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-tech font-bold text-ink">
          <span className="flex items-center gap-1.5">
            <i className="ph-bold ph-chart-pie-slice text-ink"></i>
            <span>SEBARAN STATUS KEHADIRAN (TOTAL {total} LOG PRESENSI)</span>
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            Tingkat Hadir: <b className="text-emerald-800">{((total - leaveCount) / (total || 1) * 100).toFixed(1)}%</b>
          </span>
        </div>

        {/* Stacked Bento Bar Container */}
        <div className="w-full h-10 rounded-2xl bg-canvas border-2 border-ink shadow-art-sm p-1 flex gap-1 overflow-hidden">
          {/* Segment 1: Tepat Waktu */}
          <div
            style={{ width: `${Math.max(Number(onTimePct), 12)}%` }}
            className="h-full bg-emerald-500 rounded-xl border border-ink flex items-center justify-center px-2 text-white font-tech font-bold text-xs tracking-wider transition-all relative overflow-hidden group cursor-pointer"
            title={`Tepat Waktu: ${onTimeCount} staf (${onTimePct}%)`}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#1E2322_1px,transparent_1px)] [background-size:6px_6px]"></div>
            <span className="relative z-10 truncate text-[11px] flex items-center gap-1">
              <span>✓</span>
              <span>{onTimePct}%</span>
            </span>
          </div>

          {/* Segment 2: Terlambat */}
          <div
            style={{ width: `${Math.max(Number(latePct), 10)}%` }}
            className="h-full bg-amber-400 rounded-xl border border-ink flex items-center justify-center px-2 text-ink font-tech font-bold text-xs tracking-wider transition-all relative overflow-hidden group cursor-pointer"
            title={`Terlambat: ${lateCount} staf (${latePct}%)`}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#1E2322_1px,transparent_1px)] [background-size:6px_6px]"></div>
            <span className="relative z-10 truncate text-[11px] flex items-center gap-1">
              <span>⏱</span>
              <span>{latePct}%</span>
            </span>
          </div>

          {/* Segment 3: Izin / Sakit */}
          <div
            style={{ width: `${Math.max(Number(leavePct), 8)}%` }}
            className="h-full bg-purple-400 rounded-xl border border-ink flex items-center justify-center px-2 text-ink font-tech font-bold text-xs tracking-wider transition-all relative overflow-hidden group cursor-pointer"
            title={`Izin / Sakit: ${leaveCount} staf (${leavePct}%)`}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#1E2322_1px,transparent_1px)] [background-size:6px_6px]"></div>
            <span className="relative z-10 truncate text-[11px] flex items-center gap-1">
              <span>📋</span>
              <span>{leavePct}%</span>
            </span>
          </div>
        </div>

        {/* Legend Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="bg-canvas/70 rounded-xl p-2.5 border-2 border-ink/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-lg bg-emerald-500 border border-ink flex-shrink-0"></span>
              <span className="text-xs font-tech font-bold text-ink">Tepat Waktu</span>
            </div>
            <span className="font-digital text-base font-bold text-emerald-800">
              {onTimeCount} <span className="text-[10px] font-mono text-ink-muted font-normal">({onTimePct}%)</span>
            </span>
          </div>

          <div className="bg-canvas/70 rounded-xl p-2.5 border-2 border-ink/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-lg bg-amber-400 border border-ink flex-shrink-0"></span>
              <span className="text-xs font-tech font-bold text-ink">Terlambat</span>
            </div>
            <span className="font-digital text-base font-bold text-amber-800">
              {lateCount} <span className="text-[10px] font-mono text-ink-muted font-normal">({latePct}%)</span>
            </span>
          </div>

          <div className="bg-canvas/70 rounded-xl p-2.5 border-2 border-ink/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-lg bg-purple-400 border border-ink flex-shrink-0"></span>
              <span className="text-xs font-tech font-bold text-ink">Izin / Sakit</span>
            </div>
            <span className="font-digital text-base font-bold text-purple-800">
              {leaveCount} <span className="text-[10px] font-mono text-ink-muted font-normal">({leavePct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Trend 4-Week Columns & Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-t-2 border-ink/15 pt-4">
        {/* Weekly Mini Bars */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-tech font-bold text-ink-muted">
            <span className="uppercase tracking-wider">KOMPARASI TREN 4 MINGGU TERAKHIR</span>
            <span className="text-[10px] font-mono">Target On-Time &ge; 80%</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {analytics.mingguan.map((m, idx) => {
              const isSelected = selectedPekan === idx;
              return (
                <div
                  key={m.pekan}
                  onClick={() => setSelectedPekan(isSelected ? null : idx)}
                  className={`p-2.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-widget-pure border-ink shadow-art'
                      : 'bg-canvas/80 border-ink/40 hover:border-ink hover:bg-widget-pure'
                  }`}
                >
                  <div className="text-[10px] font-tech font-bold text-ink flex items-center justify-between">
                    <span>{m.pekan}</span>
                    <span className="text-[9px] font-mono text-ink-muted">{m.total} Rekap</span>
                  </div>

                  {/* Vertical Progress Bar */}
                  <div className="my-2 h-14 w-full bg-widget rounded-lg border border-ink/30 p-1 flex items-end">
                    <div
                      style={{ height: `${m.pctOnTime}%` }}
                      className="w-full bg-emerald-500 rounded border border-ink flex items-center justify-center transition-all"
                    ></div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-digital font-bold text-emerald-800">
                      {m.pctOnTime}%
                    </span>
                    <span className="text-[9px] font-mono text-ink-muted">
                      {m.onTime}/{m.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bento Sub-Metrics Box */}
        <div className="bg-canvas/80 rounded-2xl p-3 border-2 border-ink/40 flex flex-col justify-between gap-2">
          <div className="text-[10px] font-tech font-bold uppercase tracking-wider text-ink-muted">
            INSIGHT DISIPLIN & GEOLOKASI
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-ink-muted font-tech">Rata-rata Terlambat:</span>
              <span className="font-digital text-sm font-bold text-amber-800">
                +{analytics.rataRataKeterlambatanMenit} Menit
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-ink-muted font-tech">Hari Kerja Aktif:</span>
              <span className="font-digital text-sm font-bold text-ink">
                {analytics.totalHariKerja} Hari
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-ink-muted font-tech">Akurasi Geofence:</span>
              <span className="font-digital text-sm font-bold text-emerald-800">
                99.2% Valid GPS
              </span>
            </div>
          </div>

          <div className="text-[9px] font-mono text-ink-muted border-t border-ink/20 pt-1.5 flex items-center justify-between">
            <span>Standar Toleransi Kantor:</span>
            <span className="font-bold text-ink">15 Menit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
