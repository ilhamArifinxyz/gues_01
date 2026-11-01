import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import DigitalClock from './components/DigitalClock';
import CameraViewfinder from './components/CameraViewfinder';
import PunchButton from './components/PunchButton';
import AttendanceSummary from './components/AttendanceSummary';
import AdminDashboard from './components/AdminDashboard';
import LeaveModal from './components/LeaveModal';
import LoginPage from './components/LoginPage';
import ProfileTab from './components/ProfileTab';
import HistoryCalendarTab from './components/HistoryCalendarTab';
import RadarMapModal from './components/RadarMapModal';
import {
  getCurrentUser,
  getTodayAttendance,
  punchAttendance,
  logoutUser,
  getStoredToken,
  OFFICE_COORDS,
  calculateDistance,
  GPS_ACCURACY_THRESHOLD_METERS,
  isGpsAccuracyValid
} from './services/api';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('karyawan'); // 'karyawan' | 'admin'
  const [activeTab, setActiveTab] = useState('beranda'); // 'beranda' | 'profil'
  const [todayAttendance, setTodayAttendance] = useState({ masuk: null, pulang: null });

  // Geolocation & Simulation State
  const [userCoords, setUserCoords] = useState({
    latitude: OFFICE_COORDS.latitude,
    longitude: OFFICE_COORDS.longitude
  });
  const [distanceMeters, setDistanceMeters] = useState(18.4);
  const [isWithinRadius, setIsWithinRadius] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState(12.5);
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState(null);
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);

  // WebRTC Camera State
  const videoRef = useRef(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);

  // Modals & Submission Status
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmittingPunch, setIsSubmittingPunch] = useState(false);
  const [punchFeedback, setPunchFeedback] = useState(null);

  // Initial Session Check & Geolocation Acquisition
  useEffect(() => {
    async function init() {
      try {
        const token = getStoredToken();
        if (token) {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
            if (userData.role === 'ADMIN') {
              setMode('admin');
            }
            const attendanceData = await getTodayAttendance();
            if (attendanceData) {
              setTodayAttendance(attendanceData);
            }
          }
        }
      } catch (err) {
        console.warn('Initial session loading failed:', err);
      } finally {
        setIsInitializing(false);
      }

      // Try acquiring live browser Geolocation if supported
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            setUserCoords({ latitude: lat, longitude: lng });
            if (acc !== undefined && acc !== null) {
              const roundedAcc = Math.round(acc * 10) / 10;
              setGpsAccuracy(roundedAcc);
              if (acc > GPS_ACCURACY_THRESHOLD_METERS) {
                setGpsAccuracyWarning(
                  `Akurasi GPS rendah (±${Math.round(acc)}m > ${GPS_ACCURACY_THRESHOLD_METERS}m). Sinyal triangulasi seluler terdeteksi.`
                );
              } else {
                setGpsAccuracyWarning(null);
              }
            }
            const dist = calculateDistance(lat, lng, OFFICE_COORDS.latitude, OFFICE_COORDS.longitude);
            setDistanceMeters(dist);
            setIsWithinRadius(dist <= OFFICE_COORDS.radiusMeters);
          },
          (err) => {
            console.log('Browser geolocation status:', err.message);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }

    init();
  }, []);

  // Quick Simulation Location Switcher (inside, outside, or weak accuracy)
  const handleSetSimulation = (simType) => {
    if (typeof simType === 'object' && simType !== null) {
      // Direct coordinate object from live GPS refresh in modal
      const lat = simType.latitude ?? OFFICE_COORDS.latitude;
      const lng = simType.longitude ?? OFFICE_COORDS.longitude;
      const acc = simType.accuracy ?? 12.5;
      setUserCoords({ latitude: lat, longitude: lng });
      setGpsAccuracy(acc);
      const dist = calculateDistance(lat, lng, OFFICE_COORDS.latitude, OFFICE_COORDS.longitude);
      setDistanceMeters(dist);
      setIsWithinRadius(dist <= OFFICE_COORDS.radiusMeters);
      if (acc > GPS_ACCURACY_THRESHOLD_METERS) {
        setGpsAccuracyWarning(`Akurasi GPS rendah (±${acc}m > ${GPS_ACCURACY_THRESHOLD_METERS}m). Sinyal triangulasi seluler terdeteksi.`);
      } else {
        setGpsAccuracyWarning(null);
      }
      return;
    }

    if (simType === true || simType === 'inside') {
      setDistanceMeters(18.4);
      setIsWithinRadius(true);
      setGpsAccuracy(12.5);
      setGpsAccuracyWarning(null);
      setUserCoords({
        latitude: OFFICE_COORDS.latitude,
        longitude: OFFICE_COORDS.longitude
      });
    } else if (simType === 'weak' || simType === 'inaccurate') {
      setDistanceMeters(18.4);
      setIsWithinRadius(true);
      setGpsAccuracy(145.0); // low accuracy (>100m)
      setGpsAccuracyWarning(`Akurasi GPS rendah (±145m > ${GPS_ACCURACY_THRESHOLD_METERS}m). Sinyal triangulasi seluler terdeteksi.`);
      setUserCoords({
        latitude: OFFICE_COORDS.latitude,
        longitude: OFFICE_COORDS.longitude
      });
    } else {
      // outside geofence (340m)
      setDistanceMeters(340.0);
      setIsWithinRadius(false);
      setGpsAccuracy(18.0);
      setGpsAccuracyWarning(null);
      setUserCoords({
        latitude: OFFICE_COORDS.latitude + 0.003,
        longitude: OFFICE_COORDS.longitude + 0.003
      });
    }
  };

  // Handle Login Success
  const handleLoginSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    setActiveTab('beranda');
    if (loggedInUser?.role === 'ADMIN') {
      setMode('admin');
    } else {
      setMode('karyawan');
    }

    try {
      const attendanceData = await getTodayAttendance();
      if (attendanceData) {
        setTodayAttendance(attendanceData);
      }
    } catch (e) {
      console.warn('Failed to load today attendance on login:', e);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setActiveTab('beranda');
    setMode('karyawan');
    setTodayAttendance({ masuk: null, pulang: null });
  };

  // Handle Punch Submission
  const handlePunch = async ({ jenis, photoBlob, photoDataUrl, latitude, longitude }) => {
    // 1. Verifikasi Threshold Akurasi GPS (coords.accuracy <= 100m)
    if (gpsAccuracy > GPS_ACCURACY_THRESHOLD_METERS) {
      setPunchFeedback({
        success: false,
        title: '⚠️ AKURASI GPS TIDAK MEMADAI',
        details: [
          `Akurasi saat ini: ±${gpsAccuracy} meter`,
          `Batas toleransi maksimal: ${GPS_ACCURACY_THRESHOLD_METERS} meter`,
          'Sinyal terdeteksi merupakan triangulasi seluler kasar / estimasi indoor.',
          'Mohon aktifkan GPS satelit berpresisi tinggi dan berada di area terbuka untuk melakukan presensi sah.'
        ]
      });
      return;
    }

    setIsSubmittingPunch(true);
    try {
      const res = await punchAttendance({
        jenis,
        latitude: latitude ?? userCoords.latitude,
        longitude: longitude ?? userCoords.longitude,
        accuracy: gpsAccuracy,
        photoBlob,
        photoDataUrl
      });

      // Update local state
      const updated = await getTodayAttendance();
      setTodayAttendance(updated);

      setPunchFeedback({
        success: true,
        title: '🎉 PRESENSI BERHASIL DICATAT!',
        details: [
          `Jenis: ${res.data.jenis_presensi}`,
          `Waktu: ${res.data.jam} WITA`,
          `Status: ${res.data.status_kehadiran}`,
          `Jarak: ${res.data.jarak_meter}m (Terverifikasi)`,
          `Akurasi GPS: ±${res.data.akurasi_meter ?? gpsAccuracy}m (Presisi Tinggi)`,
          'Bukti Swafoto: Terenkripsi & Tersimpan.'
        ]
      });
    } catch (err) {
      setPunchFeedback({
        success: false,
        title: '⛔ PRESENSI DITOLAK!',
        details: [err.message]
      });
    } finally {
      setIsSubmittingPunch(false);
    }
  };

  // 1. Loading splash screen while checking session
  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-canvas selection:bg-ink selection:text-canvas">
        <div className="bg-widget rounded-[28px] p-6 border-3 border-ink shadow-art flex items-center gap-3.5 animate-pulse">
          <i className="ph-bold ph-spinner animate-spin text-2xl text-ink"></i>
          <span className="font-tech font-bold text-sm text-ink uppercase tracking-wider">
            Memuat Sistem Kehadiran...
          </span>
        </div>
      </div>
    );
  }

  // 2. Protected Route: If not logged in, render LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated Application Layout
  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-ink selection:text-canvas">
      {/* ==================== TOP NAVIGATION & MODE SELECTOR ==================== */}
      <header className="w-full bg-[#1C201F] border-b-2 border-ink py-3 px-4 sm:px-8 flex flex-wrap items-center justify-between text-[#E6EAE4] z-40 sticky top-0 shadow-lg gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-canvas border-2 border-ink flex items-center justify-center text-ink font-bold shadow-art-sm shrink-0">
            <i className="ph-bold ph-fingerprint text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider font-tech uppercase text-white">
                Sisman Absensi
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2A312E] border border-ink-light/40 text-emerald-400">
                v2.0 Manga Neo
              </span>
            </div>
            <p className="text-[11px] text-[#9AA5A1]">
              Kelompok 10 • Universitas Tadulako 2026
            </p>
          </div>
        </div>

        {/* Right Nav: Mode Selector & Quick Logout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Selector Pills (Themed) */}
          <div className="flex items-center bg-[#131615] p-1 rounded-2xl border-2 border-ink shadow-art-sm">
            <button
              type="button"
              onClick={() => setMode('karyawan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tech transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'karyawan'
                  ? 'bg-canvas text-ink shadow-art-sm'
                  : 'text-[#9AA5A1] hover:text-white'
              }`}
            >
              <i className="ph-bold ph-device-mobile"></i> Layar Karyawan
            </button>
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tech transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'admin'
                  ? 'bg-canvas text-ink shadow-art-sm'
                  : 'text-[#9AA5A1] hover:text-white'
              }`}
            >
              <i className="ph-bold ph-desktop"></i> Dashboard Admin
            </button>
          </div>

          {/* User Chip & Header Logout */}
          <div className="flex items-center gap-1.5">
            <div className="hidden lg:flex items-center gap-1.5 bg-[#131615] px-2.5 py-1.5 rounded-xl border border-ink-light/30 text-xs font-tech text-[#E6EAE4]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-bold truncate max-w-[130px]">{user?.nama_lengkap}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari Akun"
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-tech font-bold text-xs border-2 border-ink shadow-art-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-sign-out text-sm"></i>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ==================== VIEW 1: KARYAWAN (MOBILE MOCKUP) =================== */}
      {/* ========================================================================= */}
      {mode === 'karyawan' && (
        <main className="w-full flex justify-center py-6 sm:py-10 px-4">
          {/* Mobile Device Container (Aesthetic Outer Case) */}
          <div className="w-full max-w-[420px] bg-canvas rounded-[44px] p-4 sm:p-5 border-4 border-ink shadow-art-lg relative flex flex-col gap-4 overflow-hidden">
            {/* Ambient Decorative Manga Wind / Leaf */}
            <div className="absolute -top-3 -right-3 text-ink/15 text-6xl pointer-events-none select-none animate-drift">
              🍃
            </div>

            {/* 1. Bento Header */}
            <Header user={user} />

            {/* 2. Content depending on Active Mobile Tab */}
            {activeTab === 'beranda' && (
              <>
                {/* Retro Digital Clock Widget with Integrated Geofence Mini-Badge & Radar Chip */}
                <DigitalClock
                  distanceMeters={distanceMeters}
                  isWithinRadius={isWithinRadius}
                  onOpenRadar={() => setIsRadarModalOpen(true)}
                />

                {/* GPS Accuracy Alert Banner if accuracy exceeds 100m */}
                {gpsAccuracyWarning && (
                  <div
                    onClick={() => setIsRadarModalOpen(true)}
                    className="p-2.5 rounded-2xl bg-amber-200 border-2 border-ink text-ink text-xs font-bold font-tech shadow-art-sm flex items-center justify-between gap-2 cursor-pointer hover:brightness-95 animate-pulse"
                    title="Buka Radar Geofence GPS"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span className="text-[11px] leading-tight">
                        Akurasi GPS rendah (±{gpsAccuracy}m &gt; 100m). Sinyal triangulasi seluler terdeteksi!
                      </span>
                    </div>
                    <span className="text-[10px] underline font-mono shrink-0">Radar 🛰️</span>
                  </div>
                )}

                {/* Live Webcam & Selfie Viewfinder */}
                <CameraViewfinder
                  videoRef={videoRef}
                  isWebcamActive={isWebcamActive}
                  setIsWebcamActive={setIsWebcamActive}
                  userCoords={userCoords}
                />

                {/* Big Tactile Punch Button & Geofence Simulation */}
                <PunchButton
                  videoRef={videoRef}
                  isWebcamActive={isWebcamActive}
                  isWithinRadius={isWithinRadius}
                  distanceMeters={distanceMeters}
                  userCoords={userCoords}
                  onPunch={handlePunch}
                  onSetSimulation={handleSetSimulation}
                  todayAttendance={todayAttendance}
                  isSubmitting={isSubmittingPunch}
                />

                {/* Attendance Summary Capsules (Masuk & Pulang) */}
                <AttendanceSummary todayAttendance={todayAttendance} />
              </>
            )}

            {activeTab === 'riwayat' && (
              <HistoryCalendarTab
                user={user}
                todayAttendance={todayAttendance}
                onBack={() => setActiveTab('beranda')}
              />
            )}

            {activeTab === 'profil' && (
              <ProfileTab user={user} onLogout={handleLogout} />
            )}

            {/* 3. Bottom Navigation (4 Tabs: Beranda, Riwayat, Izin, Profil) */}
            <nav className="bg-widget rounded-[22px] p-2 border-2 border-ink shadow-art flex items-center justify-around text-ink text-[11px] font-tech font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('beranda')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'beranda'
                    ? 'bg-ink text-canvas border border-ink shadow-art-sm'
                    : 'hover:bg-canvas border border-transparent hover:border-ink'
                }`}
              >
                <i className={`${activeTab === 'beranda' ? 'ph-fill ph-house' : 'ph-bold ph-house'} text-sm`}></i>
                <span>Beranda</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('riwayat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'riwayat'
                    ? 'bg-ink text-canvas border border-ink shadow-art-sm'
                    : 'hover:bg-canvas border border-transparent hover:border-ink'
                }`}
              >
                <i className={`${activeTab === 'riwayat' ? 'ph-fill ph-calendar' : 'ph-bold ph-calendar'} text-sm`}></i>
                <span>Riwayat</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-canvas transition border border-transparent hover:border-ink cursor-pointer"
              >
                <i className="ph-bold ph-pen text-sm"></i>
                <span>Izin</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('profil')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'profil'
                    ? 'bg-ink text-canvas border border-ink shadow-art-sm'
                    : 'hover:bg-canvas border border-transparent hover:border-ink'
                }`}
              >
                <i className={`${activeTab === 'profil' ? 'ph-fill ph-user' : 'ph-bold ph-user'} text-sm`}></i>
                <span>Profil</span>
              </button>
            </nav>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* ===================== VIEW 2: ADMIN HRD (DESKTOP) ======================= */}
      {/* ========================================================================= */}
      {mode === 'admin' && <AdminDashboard />}

      {/* ==================== MODAL: PENGAJUAN IZIN ==================== */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onSuccess={() => {
          // Re-fetch today's attendance / recap if needed
        }}
      />

      {/* ==================== MODAL: RADAR GEOFENCING GPS ==================== */}
      <RadarMapModal
        isOpen={isRadarModalOpen}
        onClose={() => setIsRadarModalOpen(false)}
        userCoords={userCoords}
        distanceMeters={distanceMeters}
        isWithinRadius={isWithinRadius}
        gpsAccuracy={gpsAccuracy}
        gpsAccuracyWarning={gpsAccuracyWarning}
        officeCoords={OFFICE_COORDS}
        onSetSimulation={handleSetSimulation}
      />

      {/* ==================== MODAL: HASIL PUNCH PRESENSI ==================== */}
      {punchFeedback && (
        <div className="fixed inset-0 bg-ink/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2">
              <h3 className="text-sm font-bold font-tech uppercase text-ink">
                {punchFeedback.title}
              </h3>
              <button
                type="button"
                onClick={() => setPunchFeedback(null)}
                className="w-7 h-7 rounded-full bg-canvas border border-ink flex items-center justify-center font-bold text-ink hover:bg-widget-pure cursor-pointer"
              >
                <i className="ph-bold ph-x text-xs"></i>
              </button>
            </div>

            <div className="bg-canvas p-4 rounded-2xl border-2 border-ink space-y-1.5 text-xs font-tech text-ink shadow-art-sm">
              {punchFeedback.details.map((line, idx) => (
                <p key={idx} className="font-medium">
                  {line}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPunchFeedback(null)}
              className="w-full py-2.5 rounded-xl bg-ink text-canvas font-tech font-bold text-xs uppercase shadow-art-sm hover:bg-[#2C3331] transition cursor-pointer"
            >
              OK, Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
