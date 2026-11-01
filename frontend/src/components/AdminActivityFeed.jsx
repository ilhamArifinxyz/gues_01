import React, { useState, useEffect } from 'react';
import { getAdminActivities } from '../services/api';

/**
 * AdminActivityFeed (Fitur F-07)
 * Panel ringkas notifikasi & feed aktivitas sistem terkini:
 * - Pengajuan izin baru masuk
 * - Log presensi hari ini aktif
 * - Keterlambatan terdeteksi
 * - Riwayat audit koreksi presensi
 */
export default function AdminActivityFeed({ onNavigateTab, onOpenAudit }) {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'IZIN' | 'PRESENSI' | 'AUDIT'
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivities = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAdminActivities();
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (err) {
      console.warn('Gagal memuat feed aktivitas:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = activities.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'IZIN') return item.tipe === 'IZIN_BARU';
    if (filter === 'PRESENSI') return item.tipe === 'PRESENSI_SUKSES' || item.tipe === 'TERLAMBAT';
    if (filter === 'AUDIT') return item.tipe === 'AUDIT_KOREKSI';
    return true;
  });

  const getBadgeStyle = (color) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-100 text-purple-900 border-purple-400';
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-400';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'blue':
        return 'bg-blue-100 text-blue-900 border-blue-400';
      default:
        return 'bg-ink text-canvas border-ink';
    }
  };

  return (
    <div className="bg-widget rounded-[32px] p-6 border-3 border-ink shadow-art-lg flex flex-col justify-between gap-4 transition hover:border-black">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b-2 border-ink/15 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest">
              LIVE SYSTEM ACTIVITY
            </span>
          </div>
          <h3 className="text-lg font-bold font-tech uppercase text-ink mt-0.5 flex items-center gap-2">
            <i className="ph-bold ph-bell-ringing text-ink"></i>
            <span>Notifikasi & Aktivitas Admin</span>
          </h3>
        </div>

        <button
          type="button"
          onClick={fetchActivities}
          className="p-2 rounded-xl bg-canvas border-2 border-ink text-ink hover:bg-widget-pure transition shadow-art-sm active:translate-x-[1px] active:translate-y-[1px]"
          title="Segarkan feed aktivitas"
        >
          <i className={`ph-bold ph-arrows-clockwise text-base ${isRefreshing ? 'animate-spin' : ''}`}></i>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-tech font-bold">
        {[
          { key: 'ALL', label: 'Semua Feed' },
          { key: 'IZIN', label: 'Izin Baru' },
          { key: 'PRESENSI', label: 'Log Hari Ini' },
          { key: 'AUDIT', label: 'Audit Trail' }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1 rounded-xl border transition whitespace-nowrap ${
              filter === tab.key
                ? 'bg-ink text-canvas border-ink shadow-art-sm'
                : 'bg-canvas/70 text-ink-muted border-ink/30 hover:border-ink hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity List Container */}
      <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs font-tech text-ink-muted">
            Belum ada aktivitas pada kategori ini.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-canvas/80 border-2 border-ink/40 hover:border-ink hover:bg-widget-pure transition shadow-art-sm flex items-start gap-3 group"
            >
              {/* Icon Pill */}
              <div
                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center flex-shrink-0 text-base ${getBadgeStyle(
                  item.badgeColor
                )}`}
              >
                <i className={item.icon}></i>
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold font-tech text-ink truncate">
                    {item.judul}
                  </h4>
                  <span className="text-[10px] font-mono text-ink-muted whitespace-nowrap">
                    {item.waktu}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted font-medium mt-0.5 line-clamp-2 leading-relaxed">
                  {item.deskripsi}
                </p>

                {/* Quick Action Link */}
                {item.actionTab && (
                  <div className="mt-2 flex items-center gap-2">
                    {item.actionTab === 'audit' ? (
                      <button
                        type="button"
                        onClick={onOpenAudit}
                        className="text-[10px] font-tech font-bold text-ink underline hover:text-blue-700 flex items-center gap-1"
                      >
                        <span>Lihat Detail Log Audit</span>
                        <span>➔</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigateTab && onNavigateTab(item.actionTab)}
                        className="text-[10px] font-tech font-bold text-ink underline hover:text-emerald-700 flex items-center gap-1"
                      >
                        <span>Buka Tab {item.actionTab.toUpperCase()}</span>
                        <span>➔</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="text-[10px] font-mono text-ink-muted border-t border-ink/15 pt-2 flex items-center justify-between">
        <span>Sinkronisasi Otomatis Terhubung</span>
        <span className="font-bold text-emerald-800">● Status OK</span>
      </div>
    </div>
  );
}
