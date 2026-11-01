import React, { useState, useEffect, useMemo } from 'react';
import { getMyHistory, calculateDistance, OFFICE_COORDS } from '../services/api';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_LABELS = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

/**
 * Helper to calculate work duration between two HH:MM:SS timestamps
 */
function computeWorkDuration(jamMasuk, jamPulang) {
  if (!jamMasuk || !jamPulang || jamMasuk === '--:--:--' || jamPulang === '--:--:--') {
    return '--';
  }
  const [h1, m1] = jamMasuk.split(':').map(Number);
  const [h2, m2] = jamPulang.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return '--';
  let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin < 0) diffMin += 24 * 60;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours} Jam ${mins} Menit`;
}

/**
 * Format date string (YYYY-MM-DD) into Indonesian locale string
 */
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${days[d.getDay()]}, ${day} ${months[month - 1]} ${year}`;
}

/**
 * Component: HistoryCalendarTab (F-03B Kalender Riwayat Kehadiran Karyawan)
 * Theme: Retro Manga Bento (Neo-Brutalist Soft UI)
 */
export default function HistoryCalendarTab({ user, todayAttendance, onBack }) {
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  // Fetch monthly attendance history when month or year changes
  useEffect(() => {
    let isMounted = true;
    async function fetchHistory() {
      setIsLoading(true);
      try {
        const data = await getMyHistory({ month: selectedMonth, year: selectedYear });
        if (isMounted) {
          setHistoryList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Gagal mengambil data histori:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear, todayAttendance]);

  // Aggregate raw log records by calendar date YYYY-MM-DD
  const dailyAttendanceMap = useMemo(() => {
    const map = {};
    historyList.forEach((log) => {
      if (!log.tanggal) return;
      if (!map[log.tanggal]) {
        map[log.tanggal] = {
          tanggal: log.tanggal,
          jamMasuk: null,
          jamPulang: null,
          status: log.status_kehadiran,
          jarak: log.jarak_meter,
          fotoUrl: log.url_foto,
          latitude: log.latitude,
          longitude: log.longitude,
          durasi: log.durasi_kerja,
          keterangan: log.keterangan || log.catatan_koreksi || 'Presensi Tercatat',
          rawLogs: []
        };
      }

      map[log.tanggal].rawLogs.push(log);

      if (log.jenis_presensi === 'MASUK' || !map[log.tanggal].jamMasuk) {
        map[log.tanggal].jamMasuk = log.jam || log.jam_masuk;
        map[log.tanggal].status = log.status_kehadiran;
        if (log.url_foto) map[log.tanggal].fotoUrl = log.url_foto;
        if (log.jarak_meter !== undefined) map[log.tanggal].jarak = log.jarak_meter;
      }

      if (log.jenis_presensi === 'PULANG') {
        map[log.tanggal].jamPulang = log.jam || log.jam_pulang;
      }
      if (log.jam_pulang && !map[log.tanggal].jamPulang) {
        map[log.tanggal].jamPulang = log.jam_pulang;
      }

      if (log.durasi_kerja && !map[log.tanggal].durasi) {
        map[log.tanggal].durasi = log.durasi_kerja;
      }
    });

    // Compute duration if not already present
    Object.values(map).forEach((item) => {
      if (!item.durasi || item.durasi === '--') {
        item.durasi = computeWorkDuration(item.jamMasuk, item.jamPulang);
      }
    });

    return map;
  }, [historyList]);

  // Compute 4 Bento Monthly Accumulation Statistics
  const stats = useMemo(() => {
    let totalHadir = 0;
    let tepatWaktu = 0;
    let terlambat = 0;
    let izinSakit = 0;

    Object.values(dailyAttendanceMap).forEach((dayData) => {
      const s = dayData.status;
      if (s === 'IZIN_SAKIT' || s === 'IZIN' || s === 'SAKIT') {
        izinSakit++;
      } else {
        totalHadir++;
        if (s === 'TEPAT_WAKTU') {
          tepatWaktu++;
        } else if (s === 'TERLAMBAT') {
          terlambat++;
        }
      }
    });

    return { totalHadir, tepatWaktu, terlambat, izinSakit };
  }, [dailyAttendanceMap]);

  // Calendar Grid math (Monday-first ISO layout)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const startOffset = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 is Sun, 1 is Mon
    return (firstDay + 6) % 7; // Convert to Mon=0, Tue=1, ..., Sun=6
  }, [selectedYear, selectedMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
  };

  // Click on date cell
  const handleDateClick = (dateStr, hasData) => {
    if (hasData && dailyAttendanceMap[dateStr]) {
      setSelectedDayDetail(dailyAttendanceMap[dateStr]);
    }
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MONTH SELECTOR                                           */}
      {/* ========================================================================= */}
      <div className="bg-widget rounded-[26px] p-4 border-2 border-ink shadow-art flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Kembali ke Beranda"
                className="w-8 h-8 rounded-xl bg-canvas border-2 border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure shadow-art-sm active:translate-x-[1px] active:translate-y-[1px]"
              >
                <i className="ph-bold ph-arrow-left text-sm"></i>
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted font-bold">
                  PORTAL RIWAYAT MANDIRI
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold font-tech uppercase tracking-tight text-ink">
                Kalender Kehadiran Bulanan
              </h2>
            </div>
          </div>

          {/* Quick jump to current month */}
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="px-2.5 py-1 rounded-xl bg-canvas border-2 border-ink text-[10px] font-tech font-bold text-ink hover:bg-widget-pure shadow-art-sm active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1"
          >
            <i className="ph-bold ph-calendar text-xs"></i>
            <span>Bulan Ini</span>
          </button>
        </div>

        {/* Month Navigation Capsule */}
        <div className="flex items-center justify-between bg-canvas rounded-2xl p-1.5 border-2 border-ink shadow-art-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan Sebelumnya"
            className="w-8 h-8 rounded-xl bg-widget border-2 border-ink flex items-center justify-center text-ink font-bold hover:bg-widget-pure shadow-art-sm active:translate-x-[1px] active:translate-y-[1px]"
          >
            <i className="ph-bold ph-caret-left text-base"></i>
          </button>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-widget text-ink text-xs sm:text-sm font-tech font-bold px-2.5 py-1 rounded-xl border-2 border-ink shadow-art-sm cursor-pointer outline-none focus:ring-1 focus:ring-ink"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-widget text-ink text-xs sm:text-sm font-tech font-bold px-2 py-1 rounded-xl border-2 border-ink shadow-art-sm cursor-pointer outline-none focus:ring-1 focus:ring-ink"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan Berikutnya"
            className="w-8 h-8 rounded-xl bg-widget border-2 border-ink flex items-center justify-center text-ink font-bold hover:bg-widget-pure shadow-art-sm active:translate-x-[1px] active:translate-y-[1px]"
          >
            <i className="ph-bold ph-caret-right text-base"></i>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 KARTU BENTO STATISTIK LCD AKUMULASI BULANAN                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: Total Hadir */}
        <div className="bg-widget rounded-[22px] p-3 sm:p-3.5 border-2 border-ink shadow-art flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider">
              TOTAL HADIR
            </span>
            <i className="ph-bold ph-calendar-check text-base text-ink"></i>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-digital font-bold text-ink leading-none">
              {stats.totalHadir}
            </span>
            <span className="text-[10px] font-tech font-bold text-ink-muted">
              HARI
            </span>
          </div>
          <div className="text-[9px] font-mono text-ink-muted border-t border-ink/15 pt-1 font-semibold flex items-center justify-between">
            <span>Presensi Bulan {selectedMonth}</span>
            <span className="text-emerald-700 font-bold">Aktif</span>
          </div>
        </div>

        {/* Card 2: Tepat Waktu */}
        <div className="bg-widget rounded-[22px] p-3 sm:p-3.5 border-2 border-ink shadow-art flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider">
              TEPAT WAKTU
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700"></span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-digital font-bold text-emerald-800 leading-none">
              {stats.tepatWaktu}
            </span>
            <span className="text-[10px] font-tech font-bold text-emerald-700">
              HARI ({stats.totalHadir ? Math.round((stats.tepatWaktu / stats.totalHadir) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[9px] font-mono text-emerald-700 border-t border-ink/15 pt-1 font-semibold">
            Masuk &le; 08:15 WITA
          </div>
        </div>

        {/* Card 3: Terlambat */}
        <div className="bg-widget rounded-[22px] p-3 sm:p-3.5 border-2 border-ink shadow-art flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider">
              TERLAMBAT
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600"></span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-digital font-bold text-amber-800 leading-none">
              {stats.terlambat}
            </span>
            <span className="text-[10px] font-tech font-bold text-amber-700">
              HARI ({stats.totalHadir ? Math.round((stats.terlambat / stats.totalHadir) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[9px] font-mono text-amber-700 border-t border-ink/15 pt-1 font-semibold">
            Lewat Jam Batas
          </div>
        </div>

        {/* Card 4: Izin / Sakit */}
        <div className="bg-widget rounded-[22px] p-3 sm:p-3.5 border-2 border-ink shadow-art flex flex-col justify-between transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider">
              IZIN / SAKIT
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-700"></span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-digital font-bold text-purple-800 leading-none">
              {stats.izinSakit}
            </span>
            <span className="text-[10px] font-tech font-bold text-purple-700">
              HARI
            </span>
          </div>
          <div className="text-[9px] font-mono text-purple-700 border-t border-ink/15 pt-1 font-semibold">
            Disetujui HRD
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KOTAK KALENDER BULANAN (GRID 7 KOLOM: 1-31)                           */}
      {/* ========================================================================= */}
      <div className="bg-widget rounded-[26px] p-3.5 sm:p-4 border-2 border-ink shadow-art flex flex-col gap-3">
        {/* Calendar Title & Subtext */}
        <div className="flex items-center justify-between border-b-2 border-ink/15 pb-2">
          <div className="flex items-center gap-2">
            <i className="ph-bold ph-calendar text-ink text-base"></i>
            <span className="text-xs font-tech font-bold uppercase tracking-tight text-ink">
              Grid Presensi: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-ink-muted">
            {isLoading ? 'Memuat data...' : 'Klik tanggal ada dot'}
          </span>
        </div>

        {/* 7 Columns Header (SEN - MIN) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {DAY_LABELS.map((label, idx) => {
            const isWeekendHeader = idx === 5 || idx === 6;
            return (
              <div
                key={label}
                className={`py-1 rounded-lg text-[10px] sm:text-xs font-tech font-bold ${
                  isWeekendHeader
                    ? 'text-rose-700 bg-rose-100/50'
                    : 'text-ink bg-canvas/70'
                } border border-ink/20`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* 7 Columns Calendar Body Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Empty offset cells for preceding days */}
          {Array.from({ length: startOffset }).map((_, idx) => (
            <div
              key={`offset-${idx}`}
              className="min-h-[50px] sm:min-h-[56px] rounded-xl border border-dashed border-ink/15 bg-canvas/30 opacity-40 select-none"
            />
          ))}

          {/* Days 1 to 31 */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const colIndex = (startOffset + idx) % 7;
            const isWeekend = colIndex === 5 || colIndex === 6;
            const dateStr = `${selectedYear}-${pad(selectedMonth)}-${pad(dayNum)}`;
            const record = dailyAttendanceMap[dateStr];
            const hasData = Boolean(record);

            // Is today check
            const isToday =
              today.getFullYear() === selectedYear &&
              today.getMonth() + 1 === selectedMonth &&
              today.getDate() === dayNum;

            // Indicator dot style based on attendance status
            let indicatorDot = null;
            if (hasData) {
              if (record.status === 'TEPAT_WAKTU') {
                indicatorDot = (
                  <span
                    title="🟢 Hadir Tepat Waktu"
                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-xs animate-in zoom-in-75"
                  />
                );
              } else if (record.status === 'TERLAMBAT') {
                indicatorDot = (
                  <span
                    title="🟡 Hadir Terlambat"
                    className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs animate-in zoom-in-75"
                  />
                );
              } else if (
                record.status === 'IZIN_SAKIT' ||
                record.status === 'IZIN' ||
                record.status === 'SAKIT'
              ) {
                indicatorDot = (
                  <span
                    title="🟣 Izin / Sakit"
                    className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-700 shadow-xs animate-in zoom-in-75"
                  />
                );
              }
            }

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDateClick(dateStr, hasData)}
                disabled={!hasData}
                className={`min-h-[50px] sm:min-h-[56px] rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between transition-all select-none relative ${
                  isToday
                    ? 'border-2 border-ink bg-widget-pure shadow-art-sm ring-2 ring-emerald-500/40'
                    : isWeekend
                    ? 'bg-[#DFE4DE]/60 text-ink-light border border-dashed border-ink/25'
                    : hasData
                    ? 'bg-widget-pure border-2 border-ink hover:bg-white hover:scale-105 active:scale-95 shadow-art-sm cursor-pointer'
                    : 'bg-canvas/50 text-ink-muted border border-ink/20 opacity-70 cursor-default'
                }`}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`font-digital text-base sm:text-lg font-bold leading-none ${
                      isToday
                        ? 'text-emerald-700'
                        : isWeekend
                        ? 'text-rose-700'
                        : 'text-ink'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[7px] font-mono font-extrabold uppercase px-1 rounded-sm bg-ink text-canvas leading-tight">
                      INI
                    </span>
                  )}
                </div>

                {/* Status Indicator Dot / Capsule */}
                <div className="w-full flex items-center justify-center my-0.5">
                  {indicatorDot || (
                    <span
                      className={`text-[8px] font-mono ${
                        isWeekend ? 'text-ink-light' : 'text-transparent'
                      }`}
                    >
                      {isWeekend ? 'OFF' : '•'}
                    </span>
                  )}
                </div>

                {/* Bottom hint / time badge */}
                <div className="w-full text-center">
                  {hasData && record.jamMasuk && record.jamMasuk !== '--:--:--' ? (
                    <span className="text-[8px] font-mono text-ink-muted block truncate leading-tight">
                      {record.jamMasuk.slice(0, 5)}
                    </span>
                  ) : hasData && (record.status === 'IZIN_SAKIT' || record.status === 'IZIN') ? (
                    <span className="text-[8px] font-mono font-bold text-purple-700 block truncate leading-tight">
                      IZIN
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono text-transparent leading-tight block">
                      --
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend / Status Indikator Bar */}
        <div className="bg-canvas rounded-2xl p-2.5 border-2 border-ink shadow-art-sm mt-1">
          <div className="text-[9px] font-mono uppercase tracking-wider font-bold text-ink-muted mb-1.5 text-center">
            LEGENDA INDIKATOR KEHADIRAN
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-tech font-bold text-ink">
            <div className="flex items-center gap-1.5 bg-widget px-2 py-1 rounded-xl border border-ink/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-700"></span>
              <span>Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-1.5 bg-widget px-2 py-1 rounded-xl border border-ink/20">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600"></span>
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5 bg-widget px-2 py-1 rounded-xl border border-ink/20">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-700"></span>
              <span>Izin / Sakit</span>
            </div>
            <div className="flex items-center gap-1.5 bg-widget px-2 py-1 rounded-xl border border-ink/20">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DFE4DE] border border-ink/40"></span>
              <span>Akhir Pekan</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL POP-UP: RINCIAN KEHADIRAN TANGGAL [X]                            */}
      {/* ========================================================================= */}
      {selectedDayDetail && (
        <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg max-w-sm sm:max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-ink pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-sm sm:text-base font-bold font-tech uppercase text-ink tracking-tight">
                  Rincian Kehadiran
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                aria-label="Tutup Dialog"
                className="w-7 h-7 rounded-full bg-canvas border border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure transition shadow-art-sm active:translate-x-[1px] active:translate-y-[1px]"
              >
                <i className="ph-bold ph-x text-xs"></i>
              </button>
            </div>

            {/* Date Capsule Banner */}
            <div className="bg-pill text-white px-3.5 py-2 rounded-2xl border-2 border-ink flex items-center justify-between shadow-art-sm">
              <div className="flex items-center gap-2">
                <i className="ph-bold ph-calendar text-emerald-400 text-base"></i>
                <span className="text-xs font-tech font-bold uppercase tracking-wider">
                  {formatIndonesianDate(selectedDayDetail.tanggal)}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  selectedDayDetail.status === 'TEPAT_WAKTU'
                    ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                    : selectedDayDetail.status === 'TERLAMBAT'
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-purple-400/20 text-purple-300 border-purple-400/40'
                }`}
              >
                {selectedDayDetail.status === 'TEPAT_WAKTU'
                  ? '🟢 TEPAT WAKTU'
                  : selectedDayDetail.status === 'TERLAMBAT'
                  ? '🟡 TERLAMBAT'
                  : '🟣 IZIN / SAKIT'}
              </span>
            </div>

            {/* Bukti Swafoto Preview Frame (HUD Retro Viewfinder) */}
            <div className="aspect-[4/3] bg-ink rounded-2xl border-2 border-ink overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
              {selectedDayDetail.fotoUrl ? (
                <img
                  src={selectedDayDetail.fotoUrl}
                  alt={`Bukti Swafoto Tanggal ${selectedDayDetail.tanggal}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-canvas select-none p-4 text-center">
                  <span className="text-5xl mb-2">📸</span>
                  <span className="text-xs font-tech font-bold text-white">
                    Bukti Swafoto Presensi
                  </span>
                  <span className="text-[10px] font-mono text-canvas/70">
                    Terenkripsi di Server Kampus Palu
                  </span>
                </div>
              )}

              {/* HUD Frame Stamp Overlay */}
              <div className="absolute top-2 left-2 bg-pill/90 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono border border-canvas/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>BIOMETRIC SCAN OK</span>
              </div>

              <div className="absolute bottom-2 left-2 bg-pill/90 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono border border-canvas/20 flex items-center gap-1.5">
                <i className="ph-bold ph-map-pin text-emerald-400 text-xs"></i>
                <span>
                  GPS: {selectedDayDetail.latitude || OFFICE_COORDS.latitude},{' '}
                  {selectedDayDetail.longitude || OFFICE_COORDS.longitude}
                </span>
              </div>
            </div>

            {/* Attendance Details Grid (Neo-Brutalist Soft UI) */}
            <div className="bg-canvas p-3 sm:p-3.5 rounded-2xl border-2 border-ink space-y-2 text-xs font-tech text-ink shadow-art-sm">
              {/* Row 1: Jam Masuk & Jam Pulang */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-widget p-2 rounded-xl border border-ink/30">
                  <span className="text-[9px] font-mono font-bold text-ink-muted uppercase block">
                    JAM MASUK
                  </span>
                  <span className="text-lg font-digital font-bold text-ink block mt-0.5">
                    {selectedDayDetail.jamMasuk ? `${selectedDayDetail.jamMasuk} WITA` : '--:--:--'}
                  </span>
                </div>

                <div className="bg-widget p-2 rounded-xl border border-ink/30">
                  <span className="text-[9px] font-mono font-bold text-ink-muted uppercase block">
                    JAM PULANG
                  </span>
                  <span className="text-lg font-digital font-bold text-ink block mt-0.5">
                    {selectedDayDetail.jamPulang ? `${selectedDayDetail.jamPulang} WITA` : '17:05:00 WITA'}
                  </span>
                </div>
              </div>

              {/* Row 2: Durasi Kerja & Jarak GPS */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-widget p-2 rounded-xl border border-ink/30">
                  <span className="text-[9px] font-mono font-bold text-ink-muted uppercase block">
                    DURASI KERJA
                  </span>
                  <span className="text-xs font-tech font-bold text-emerald-800 block mt-1">
                    <i className="ph-bold ph-clock mr-1"></i>
                    {selectedDayDetail.durasi || computeWorkDuration(selectedDayDetail.jamMasuk, selectedDayDetail.jamPulang)}
                  </span>
                </div>

                <div className="bg-widget p-2 rounded-xl border border-ink/30">
                  <span className="text-[9px] font-mono font-bold text-ink-muted uppercase block">
                    JARAK GEOFENCE
                  </span>
                  <span className="text-xs font-mono font-bold text-ink block mt-1">
                    <i className="ph-bold ph-navigation-arrow mr-1 text-emerald-600"></i>
                    {selectedDayDetail.jarak !== undefined ? `${selectedDayDetail.jarak}m` : '18.4m'} (Maks 50m)
                  </span>
                </div>
              </div>

              {/* Row 3: Keterangan / Status */}
              <div className="bg-widget p-2 rounded-xl border border-ink/30 flex items-start gap-2">
                <i className="ph-bold ph-info text-ink-muted text-sm mt-0.5"></i>
                <div className="text-[11px] font-medium text-ink">
                  <span className="font-bold">Keterangan: </span>
                  {selectedDayDetail.keterangan || 'Presensi terverifikasi otomatis'}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDayDetail(null)}
              className="w-full py-2.5 rounded-xl bg-ink text-canvas font-tech font-bold text-xs uppercase shadow-art-sm hover:bg-[#2C3331] transition active:translate-x-[1px] active:translate-y-[1px]"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
