import React, { useState, useEffect } from 'react';
import {
  getLocations,
  createLocation,
  updateLocation,
  getEmployees
} from '../services/api';

/**
 * LocationCrudTab Component
 * Modul Pengelolaan Titik Lokasi Kantor Cabang & Geofence (F-05)
 * Tema: Retro Manga Bento (Neo-Brutalist Soft UI)
 */
export default function LocationCrudTab({ onDataChanged }) {
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  // Form State
  const initialFormState = {
    nama_kantor: '',
    alamat: '',
    latitude: -0.8917000,
    longitude: 119.8872000,
    radius_meter: 50,
    status_aktif: true
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsAcquiring, setGpsAcquiring] = useState(false);
  const [gpsSuccessNote, setGpsSuccessNote] = useState('');

  // Notification Toast
  const [notification, setNotification] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [locList, empList] = await Promise.all([
        getLocations(),
        getEmployees()
      ]);
      setLocations(locList || []);
      setEmployees(empList || []);
    } catch (err) {
      console.error('Gagal mengambil data kantor cabang:', err);
      showNotification('error', 'Gagal memuat data lokasi kantor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setFormError('');
    setGpsSuccessNote('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (loc) => {
    setEditingLocation(loc);
    setFormData({
      nama_kantor: loc.nama_kantor,
      alamat: loc.alamat,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_meter: loc.radius_meter || 50,
      status_aktif: loc.status_aktif !== false
    });
    setFormError('');
    setGpsSuccessNote('');
    setIsEditModalOpen(true);
  };

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Quick GPS Acquire Button
  const handleAcquireCurrentGps = () => {
    if (!('geolocation' in navigator)) {
      setFormError('Browser Anda tidak mendukung Geolocation API');
      return;
    }
    setGpsAcquiring(true);
    setFormError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lng = Number(pos.coords.longitude.toFixed(7));
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setGpsAcquiring(false);
        setGpsSuccessNote(`GPS Terdeteksi: Lat ${lat}, Lng ${lng} (Akurasi: ±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setGpsAcquiring(false);
        setFormError(`Gagal membaca sinyal GPS: ${err.message}. Silakan masukkan koordinat angka manual.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit Add Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nama_kantor.trim() || !formData.alamat.trim()) {
      setFormError('Nama kantor dan Alamat fisik wajib diisi.');
      return;
    }
    if (isNaN(Number(formData.latitude)) || isNaN(Number(formData.longitude))) {
      setFormError('Latitude dan Longitude harus berupa angka desimal koordinat GPS.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createLocation({
        nama_kantor: formData.nama_kantor,
        alamat: formData.alamat,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radius_meter: Number(formData.radius_meter) || 50
      });

      showNotification('success', res.message || 'Cabang kantor baru berhasil ditambahkan');
      setIsAddModalOpen(false);
      fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan cabang kantor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nama_kantor.trim() || !formData.alamat.trim()) {
      setFormError('Nama kantor dan Alamat fisik wajib diisi.');
      return;
    }
    if (isNaN(Number(formData.latitude)) || isNaN(Number(formData.longitude))) {
      setFormError('Latitude dan Longitude harus berupa angka desimal koordinat GPS.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateLocation(editingLocation.id_lokasi, {
        nama_kantor: formData.nama_kantor,
        alamat: formData.alamat,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radius_meter: Number(formData.radius_meter) || 50,
        status_aktif: formData.status_aktif
      });

      showNotification('success', res.message || 'Data cabang kantor berhasil diperbarui');
      setIsEditModalOpen(false);
      fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFormError(err.message || 'Gagal memperbarui cabang kantor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Count employees per location
  const getStaffCount = (loc) => {
    return employees.filter(
      e => e.id_lokasi === loc.id_lokasi ||
           (e.cabang && e.cabang.toLowerCase() === loc.nama_kantor.toLowerCase()) ||
           (e.nama_kantor && e.nama_kantor.toLowerCase() === loc.nama_kantor.toLowerCase())
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border-2 border-ink shadow-art flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-100 text-emerald-950 border-emerald-800'
              : 'bg-red-100 text-red-950 border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span className="font-tech font-bold text-xs sm:text-sm">
              {notification.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-ink hover:text-black font-bold text-sm px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs uppercase tracking-widest font-bold">
              GEOFENCE MATRIX
            </span>
            <span className="text-xs text-ink-muted font-mono font-bold">
              F-05 Location Master
            </span>
          </div>
          <h2 className="text-2xl font-bold font-tech uppercase tracking-tight text-ink mt-1">
            Kelola Titik Kantor Cabang
          </h2>
          <p className="text-xs text-ink-muted font-medium">
            Penetapan titik referensi koordinat GPS kantor, radius toleransi meter, dan alamat fisik absensi.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-canvas rounded-xl border-2 border-ink text-xs font-tech font-bold shadow-art-sm">
            <span className="text-ink">Total Cabang:</span>
            <span className="font-digital text-lg text-ink">{locations.length}</span>
            <span className="text-ink-muted font-mono text-[10px]">kantor</span>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs shadow-art hover:bg-[#2C3331] transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <i className="ph-bold ph-plus-circle text-base"></i>
            <span>+ Tambah Cabang Kantor</span>
          </button>
        </div>
      </div>

      {/* Grid of Branch Office Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-ink-muted font-tech bg-widget rounded-[32px] border-3 border-ink shadow-art-lg">
            <div className="inline-block animate-spin mr-2">⏳</div>
            Memuat daftar cabang kantor...
          </div>
        ) : locations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-ink-muted font-tech bg-widget rounded-[32px] border-3 border-ink shadow-art-lg">
            Belum ada cabang kantor yang terdaftar. Klik "+ Tambah Cabang Kantor" untuk mendaftarkan titik pertama.
          </div>
        ) : (
          locations.map((loc) => {
            const staffCount = getStaffCount(loc);
            const isAktif = loc.status_aktif !== false;
            return (
              <div
                key={loc.id_lokasi}
                className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg p-6 flex flex-col justify-between hover:border-black transition"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-ink">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-canvas border-2 border-ink flex items-center justify-center text-xl shadow-art-sm">
                        🏢
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">
                          ID LOKASI: #{loc.id_lokasi}
                        </span>
                        <h3 className="font-tech font-bold text-lg text-ink leading-tight">
                          {loc.nama_kantor}
                        </h3>
                      </div>
                    </div>
                    {isAktif ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-art-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>Aktif</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-tech bg-red-100 text-red-900 border-2 border-red-500 shadow-art-sm">
                        Nonaktif
                      </span>
                    )}
                  </div>

                  {/* Alamat Fisik */}
                  <div className="my-4">
                    <span className="text-[10px] font-tech font-bold uppercase text-ink-muted block mb-1">
                      Alamat Fisik Cabang
                    </span>
                    <p className="text-xs text-ink font-medium leading-relaxed bg-widget-pure p-3 rounded-2xl border border-ink/20">
                      📍 {loc.alamat}
                    </p>
                  </div>

                  {/* Geofence & Coordinates LCD Box */}
                  <div className="p-3.5 bg-canvas rounded-2xl border-2 border-ink shadow-art-sm space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-tech font-bold text-ink-muted uppercase text-[10px]">
                        📡 Koordinat GPS Acuan
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-tech font-bold text-ink hover:underline flex items-center gap-1"
                      >
                        <span>Buka Maps</span>
                        <span>↗</span>
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                      <div className="p-2 bg-widget-pure rounded-xl border border-ink/30">
                        <span className="text-[9px] text-ink-muted block">LATITUDE</span>
                        <span className="text-ink">{Number(loc.latitude).toFixed(7)}</span>
                      </div>
                      <div className="p-2 bg-widget-pure rounded-xl border border-ink/30">
                        <span className="text-[9px] text-ink-muted block">LONGITUDE</span>
                        <span className="text-ink">{Number(loc.longitude).toFixed(7)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-ink/15 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-sm">🎯</span>
                        <span className="font-tech font-bold text-ink text-[11px]">
                          Radius Batas Presensi:
                        </span>
                      </div>
                      <span className="font-digital text-xl font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-500">
                        {loc.radius_meter || 50} METER
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Staff Count & Action Buttons */}
                <div className="pt-3 border-t-2 border-ink flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-tech font-bold text-ink-muted">
                    <i className="ph-bold ph-users text-sm"></i>
                    <span>{staffCount} staf terdaftar</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(loc)}
                      className="px-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs shadow-art-sm hover:bg-widget-pure transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Edit Cabang</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Tambah Cabang Kantor */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg w-full max-w-lg p-6 sm:p-7 relative my-8 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-ink">
              <div>
                <span className="text-[10px] font-digital font-bold px-2 py-0.5 rounded bg-ink text-canvas uppercase tracking-widest">
                  FORM TITIK GEOFENCE
                </span>
                <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1">
                  + Tambah Cabang Kantor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-canvas border-2 border-ink text-ink font-bold hover:bg-widget-pure flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 font-tech font-bold text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* GPS Success banner */}
            {gpsSuccessNote && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-tech font-bold text-xs flex items-center gap-2">
                <span>📍</span>
                <span>{gpsSuccessNote}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              {/* Nama Kantor */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Nama Cabang Kantor *
                </label>
                <input
                  type="text"
                  name="nama_kantor"
                  placeholder="Contoh: Kantor Cabang Palu Barat"
                  value={formData.nama_kantor}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  required
                />
              </div>

              {/* Alamat Fisik */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Alamat Lengkap Fisik *
                </label>
                <textarea
                  name="alamat"
                  rows={2}
                  placeholder="Jl. Nama Jalan, No. XX, Kelurahan, Kecamatan, Kota Palu..."
                  value={formData.alamat}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  required
                ></textarea>
              </div>

              {/* Button Auto-Detect GPS */}
              <div className="p-3 bg-canvas/80 rounded-2xl border-2 border-ink/40 flex items-center justify-between gap-3">
                <div className="text-[11px] font-tech text-ink">
                  <span className="font-bold block">📍 Deteksi Lokasi Otomatis:</span>
                  <span className="text-ink-muted text-[10px]">
                    Isi kolom koordinat otomatis menggunakan GPS perangkat Anda saat ini.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAcquireCurrentGps}
                  disabled={gpsAcquiring}
                  className="px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-ink font-tech font-bold text-xs shadow-art-sm hover:bg-canvas transition flex items-center gap-1.5 flex-shrink-0"
                >
                  {gpsAcquiring ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <>
                      <span>📡</span>
                      <span>Ambil GPS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Manual Input Koordinat GPS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Latitude (Manual) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    placeholder="-0.8917000"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono font-bold focus:outline-none shadow-art-sm"
                    required
                  />
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5 block">
                    Format desimal derajat (-90 s/d 90)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Longitude (Manual) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    placeholder="119.8872000"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono font-bold focus:outline-none shadow-art-sm"
                    required
                  />
                  <span className="text-[10px] text-ink-muted font-mono mt-0.5 block">
                    Format desimal derajat (-180 s/d 180)
                  </span>
                </div>
              </div>

              {/* Radius Meter (Manual) */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Radius Toleransi Geofence (Meter) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    name="radius_meter"
                    value={formData.radius_meter}
                    onChange={handleInputChange}
                    className="w-32 px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-digital text-lg font-bold text-ink focus:outline-none shadow-art-sm"
                    required
                  />
                  <span className="text-xs font-tech font-medium text-ink-muted">
                    Meter dari titik pusat koordinat (Disarankan: 50m)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t-2 border-ink flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs hover:bg-widget-pure transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs shadow-art hover:bg-[#2C3331] transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Simpan Cabang Kantor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Cabang Kantor */}
      {isEditModalOpen && editingLocation && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg w-full max-w-lg p-6 sm:p-7 relative my-8 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-ink">
              <div>
                <span className="text-[10px] font-digital font-bold px-2 py-0.5 rounded bg-ink text-canvas uppercase tracking-widest">
                  AUDIT TITIK GEOFENCE
                </span>
                <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1">
                  ✏️ Edit: {editingLocation.nama_kantor}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-canvas border-2 border-ink text-ink font-bold hover:bg-widget-pure flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 font-tech font-bold text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* GPS Success banner */}
            {gpsSuccessNote && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-tech font-bold text-xs flex items-center gap-2">
                <span>📍</span>
                <span>{gpsSuccessNote}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {/* Nama Kantor */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Nama Cabang Kantor *
                </label>
                <input
                  type="text"
                  name="nama_kantor"
                  value={formData.nama_kantor}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  required
                />
              </div>

              {/* Alamat Fisik */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Alamat Lengkap Fisik *
                </label>
                <textarea
                  name="alamat"
                  rows={2}
                  value={formData.alamat}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  required
                ></textarea>
              </div>

              {/* Button Auto-Detect GPS */}
              <div className="p-3 bg-canvas/80 rounded-2xl border-2 border-ink/40 flex items-center justify-between gap-3">
                <div className="text-[11px] font-tech text-ink">
                  <span className="font-bold block">📍 Perbarui Koordinat via GPS:</span>
                  <span className="text-ink-muted text-[10px]">
                    Sematkan koordinat posisi perangkat Anda sekarang.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAcquireCurrentGps}
                  disabled={gpsAcquiring}
                  className="px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-ink font-tech font-bold text-xs shadow-art-sm hover:bg-canvas transition flex items-center gap-1.5 flex-shrink-0"
                >
                  {gpsAcquiring ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <>
                      <span>📡</span>
                      <span>Ambil GPS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Manual Input Koordinat GPS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Latitude (Manual) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono font-bold focus:outline-none shadow-art-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Longitude (Manual) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono font-bold focus:outline-none shadow-art-sm"
                    required
                  />
                </div>
              </div>

              {/* Radius Meter (Manual) */}
              <div>
                <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                  Radius Toleransi Geofence (Meter) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    name="radius_meter"
                    value={formData.radius_meter}
                    onChange={handleInputChange}
                    className="w-32 px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-digital text-lg font-bold text-ink focus:outline-none shadow-art-sm"
                    required
                  />
                  <span className="text-xs font-tech font-medium text-ink-muted">
                    Meter toleransi presensi staf
                  </span>
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="status_aktif_loc"
                  name="status_aktif"
                  checked={formData.status_aktif}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-2 border-ink text-ink focus:ring-0"
                />
                <label htmlFor="status_aktif_loc" className="text-xs font-tech font-bold text-ink cursor-pointer">
                  Aktifkan Cabang Ini (Memvalidasi presensi geofence staf)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t-2 border-ink flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs hover:bg-widget-pure transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs shadow-art hover:bg-[#2C3331] transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
