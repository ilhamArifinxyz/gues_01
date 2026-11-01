import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getLocations
} from '../services/api';

/**
 * EmployeeCrudTab Component
 * Modul Pengelolaan Master Data Karyawan (F-05)
 * Tema: Retro Manga Bento (Neo-Brutalist Soft UI)
 */
export default function EmployeeCrudTab({ onDataChanged }) {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Soft delete confirmation dialog
  const [confirmToggleTarget, setConfirmToggleTarget] = useState(null);

  // Feedback Notification banner
  const [notification, setNotification] = useState(null);

  // Form State
  const initialFormState = {
    nik: '',
    nama_lengkap: '',
    email: '',
    password: '',
    nomor_telepon: '',
    jabatan: '',
    role: 'KARYAWAN',
    id_lokasi: 1,
    jam_masuk_jadwal: '08:00',
    jam_pulang_jadwal: '17:00'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [empList, locList] = await Promise.all([
        getEmployees(),
        getLocations()
      ]);
      setEmployees(empList || []);
      setLocations(locList || []);
      if (locList && locList.length > 0 && formData.id_lokasi === 1) {
        setFormData(prev => ({ ...prev, id_lokasi: locList[0].id_lokasi }));
      }
    } catch (err) {
      console.error('Gagal mengambil data karyawan/lokasi:', err);
      showNotification('error', 'Gagal memuat data dari server');
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
    setFormData({
      ...initialFormState,
      id_lokasi: locations.length > 0 ? locations[0].id_lokasi : 1
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    const masuk = (emp.jam_masuk_jadwal || '08:00:00').slice(0, 5);
    const pulang = (emp.jam_pulang_jadwal || '17:00:00').slice(0, 5);
    setFormData({
      nik: emp.nik,
      nama_lengkap: emp.nama_lengkap,
      email: emp.email,
      password: '', // optional on edit
      nomor_telepon: emp.nomor_telepon || '',
      jabatan: emp.jabatan || '',
      role: emp.role || 'KARYAWAN',
      id_lokasi: emp.id_lokasi || (locations[0]?.id_lokasi || 1),
      jam_masuk_jadwal: masuk,
      jam_pulang_jadwal: pulang
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Handle Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Add Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nik.trim() || !formData.nama_lengkap.trim() || !formData.email.trim() || !formData.password.trim()) {
      setFormError('Harap lengkapi NIK, Nama Lengkap, Email, dan Kata Sandi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createEmployee({
        ...formData,
        id_lokasi: Number(formData.id_lokasi),
        jam_masuk_jadwal: `${formData.jam_masuk_jadwal}:00`,
        jam_pulang_jadwal: `${formData.jam_pulang_jadwal}:00`
      });

      showNotification('success', res.message || 'Karyawan baru berhasil didaftarkan');
      setIsAddModalOpen(false);
      fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.nama_lengkap.trim() || !formData.email.trim()) {
      setFormError('Nama Lengkap dan Email tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama_lengkap: formData.nama_lengkap,
        email: formData.email,
        nomor_telepon: formData.nomor_telepon,
        jabatan: formData.jabatan,
        role: formData.role,
        id_lokasi: Number(formData.id_lokasi),
        jam_masuk_jadwal: `${formData.jam_masuk_jadwal}:00`,
        jam_pulang_jadwal: `${formData.jam_pulang_jadwal}:00`
      };
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password.trim();
      }

      const res = await updateEmployee(editingEmployee.nik, payload);
      showNotification('success', res.message || 'Data karyawan berhasil diperbarui');
      setIsEditModalOpen(false);
      fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFormError(err.message || 'Gagal memperbarui data karyawan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Soft Delete / Re-Activate
  const handleToggleStatus = async (emp) => {
    const newStatus = !emp.status_aktif;
    try {
      await toggleEmployeeStatus(emp.nik, newStatus);
      showNotification(
        'success',
        newStatus
          ? `Akun ${emp.nama_lengkap} (${emp.nik}) berhasil diaktifkan kembali`
          : `Akun ${emp.nama_lengkap} (${emp.nik}) telah dinonaktifkan (login diblokir, log audit aman)`
      );
      setConfirmToggleTarget(null);
      fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      showNotification('error', err.message || 'Gagal mengubah status akun karyawan');
    }
  };

  // Filtered List
  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      (emp.nik && emp.nik.toLowerCase().includes(q)) ||
      (emp.nama_lengkap && emp.nama_lengkap.toLowerCase().includes(q)) ||
      (emp.jabatan && emp.jabatan.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q));

    const matchBranch =
      selectedBranch === 'ALL' ||
      emp.id_lokasi === Number(selectedBranch) ||
      (emp.cabang && emp.cabang.toLowerCase().includes(selectedBranch.toLowerCase())) ||
      (emp.nama_kantor && emp.nama_kantor.toLowerCase().includes(selectedBranch.toLowerCase()));

    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ACTIVE' && emp.status_aktif) ||
      (selectedStatus === 'INACTIVE' && !emp.status_aktif);

    return matchQuery && matchBranch && matchStatus;
  });

  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.status_aktif).length;
  const inactiveCount = employees.filter(e => !e.status_aktif).length;

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
              STAFF DIRECTORY
            </span>
            <span className="text-xs text-ink-muted font-mono font-bold">
              F-05 Master Data
            </span>
          </div>
          <h2 className="text-2xl font-bold font-tech uppercase tracking-tight text-ink mt-1">
            Kelola Master Data Karyawan
          </h2>
          <p className="text-xs text-ink-muted font-medium">
            Manajemen akun staf, otorisasi login, penugasan kantor cabang & jadwal shift kerja.
          </p>
        </div>

        {/* Counter Pills & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas rounded-xl border-2 border-ink text-xs font-tech font-bold shadow-art-sm">
            <span className="text-ink">Total:</span>
            <span className="font-digital text-base text-ink">{totalCount}</span>
            <span className="text-ink-muted font-mono text-[10px]">staf</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 rounded-xl border-2 border-emerald-700 text-xs font-tech font-bold shadow-art-sm text-emerald-950">
            <span>Aktif:</span>
            <span className="font-digital text-base text-emerald-800">{activeCount}</span>
          </div>
          {inactiveCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-xl border-2 border-red-700 text-xs font-tech font-bold shadow-art-sm text-red-950">
              <span>Nonaktif:</span>
              <span className="font-digital text-base text-red-800">{inactiveCount}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-2xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs shadow-art hover:bg-[#2C3331] transition flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <i className="ph-bold ph-user-plus text-base"></i>
            <span>+ Tambah Karyawan Baru</span>
          </button>
        </div>
      </div>

      {/* Main Bento Table Container */}
      <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 sm:p-5 border-b-2 border-ink flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-widget-pure/60">
          <div className="flex items-center gap-2">
            <i className="ph-bold ph-users-three text-lg text-ink"></i>
            <h3 className="text-sm font-bold font-tech uppercase text-ink">
              Daftar Seluruh Karyawan ({filteredEmployees.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Cari NIK, Nama, atau Jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-medium placeholder-ink-muted focus:outline-none shadow-art-sm"
              />
              <span className="absolute left-2.5 top-2 text-ink-muted text-xs">
                🔍
              </span>
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
            >
              <option value="ALL">Semua Cabang Kantor</option>
              {locations.map(loc => (
                <option key={loc.id_lokasi} value={loc.nama_kantor}>
                  {loc.nama_kantor}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">🟢 Status Aktif</option>
              <option value="INACTIVE">🔴 Status Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas/80 text-ink-muted font-tech uppercase text-[10px] tracking-wider border-b-2 border-ink">
              <tr>
                <th className="py-3.5 px-5 font-bold">NIK & Pegawai</th>
                <th className="py-3.5 px-5 font-bold">Jabatan & Peran</th>
                <th className="py-3.5 px-5 font-bold">Cabang Penugasan</th>
                <th className="py-3.5 px-5 font-bold">Jadwal Shift</th>
                <th className="py-3.5 px-5 font-bold text-center">Status Akun</th>
                <th className="py-3.5 px-5 font-bold text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/10 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted font-tech">
                    <div className="inline-block animate-spin mr-2">⏳</div>
                    Memuat data master karyawan...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted font-tech">
                    Tidak ada data karyawan yang cocok dengan kriteria filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isAktif = emp.status_aktif !== false;
                  return (
                    <tr
                      key={emp.nik}
                      className={`hover:bg-widget-pure transition ${
                        !isAktif ? 'bg-red-50/40 opacity-80' : ''
                      }`}
                    >
                      {/* NIK & Info */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-ink bg-canvas px-2 py-0.5 rounded border border-ink/30 inline-block w-fit text-[11px] shadow-art-sm">
                            {emp.nik}
                          </span>
                          <span className="font-bold font-tech text-ink text-sm mt-1">
                            {emp.nama_lengkap}
                          </span>
                          <span className="text-[11px] text-ink-muted font-mono">
                            {emp.email} {emp.nomor_telepon ? `• ${emp.nomor_telepon}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Jabatan & Role */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-tech font-bold text-ink text-xs">
                            {emp.jabatan || 'Staf'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                              emp.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-900 border-purple-500'
                                : 'bg-canvas text-ink border-ink/40'
                            }`}
                          >
                            {emp.role || 'KARYAWAN'}
                          </span>
                        </div>
                      </td>

                      {/* Cabang */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5 font-tech text-xs text-ink font-semibold">
                          <span>🏢</span>
                          <span>{emp.cabang || emp.nama_kantor || 'Kantor Cabang Palu'}</span>
                        </div>
                      </td>

                      {/* Jadwal Shift */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-digital text-base font-bold text-ink leading-tight">
                            {(emp.jam_masuk_jadwal || '08:00:00').slice(0, 5)} - {(emp.jam_pulang_jadwal || '17:00:00').slice(0, 5)}
                          </span>
                          <span className="text-[10px] font-mono text-ink-muted">
                            Waktu Indonesia Tengah
                          </span>
                        </div>
                      </td>

                      {/* Status Akun Badge */}
                      <td className="py-4 px-5 text-center">
                        {isAktif ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-tech bg-emerald-100 text-emerald-900 border-2 border-emerald-500 shadow-art-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-tech bg-red-100 text-red-900 border-2 border-red-500 shadow-art-sm">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            <span>Nonaktif (Login Terblokir)</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="px-2.5 py-1.5 rounded-xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-[11px] shadow-art-sm hover:bg-widget-pure transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1"
                            title="Edit data profil dan shift karyawan"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>

                          {/* Soft Delete / Activate Button */}
                          {isAktif ? (
                            <button
                              type="button"
                              onClick={() => setConfirmToggleTarget(emp)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 border-2 border-red-400 text-red-700 font-tech font-bold text-[11px] shadow-art-sm hover:bg-red-600 hover:text-white transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1"
                              title="Nonaktifkan akun karyawan ini (soft-delete memblokir login namun riwayat presensi tetap utuh)"
                            >
                              <span>🚫</span>
                              <span>Nonaktifkan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-tech font-bold text-[11px] shadow-art-sm hover:bg-emerald-600 hover:text-white transition active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1"
                              title="Aktifkan kembali akun karyawan ini"
                            >
                              <span>✅</span>
                              <span>Aktifkan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah Karyawan Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg w-full max-w-xl p-6 sm:p-7 relative my-8 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-ink">
              <div>
                <span className="text-[10px] font-digital font-bold px-2 py-0.5 rounded bg-ink text-canvas uppercase tracking-widest">
                  FORM MASTER KARYAWAN
                </span>
                <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1">
                  + Tambah Karyawan Baru
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

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NIK */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    NIK (Nomor Induk Karyawan) *
                  </label>
                  <input
                    type="text"
                    name="nik"
                    placeholder="Contoh: F5512530115"
                    value={formData.nik}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono font-bold focus:outline-none shadow-art-sm"
                    required
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    placeholder="Contoh: Siti Rahmawati"
                    value={formData.nama_lengkap}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Email Pengguna (Akun Login) *
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="siti@absensi.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono focus:outline-none shadow-art-sm"
                    required
                  />
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Kata Sandi Akun *
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nomor Telepon */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    name="nomor_telepon"
                    placeholder="0821xxxxxxxx"
                    value={formData.nomor_telepon}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono focus:outline-none shadow-art-sm"
                  />
                </div>

                {/* Jabatan */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Jabatan Struktural
                  </label>
                  <input
                    type="text"
                    name="jabatan"
                    placeholder="Contoh: UI/UX Designer"
                    value={formData.jabatan}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Hak Akses / Peran
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
                  >
                    <option value="KARYAWAN">KARYAWAN (Portal Mandiri)</option>
                    <option value="ADMIN">ADMIN (HRD Control Dashboard)</option>
                  </select>
                </div>

                {/* Pilihan Cabang Kantor */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Kantor Cabang Penugasan *
                  </label>
                  <select
                    name="id_lokasi"
                    value={formData.id_lokasi}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
                  >
                    {locations.map(loc => (
                      <option key={loc.id_lokasi} value={loc.id_lokasi}>
                        {loc.nama_kantor} ({loc.radius_meter}m radius)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jadwal Jam Masuk & Pulang */}
              <div className="p-4 rounded-2xl bg-canvas/70 border-2 border-ink/40 space-y-2">
                <span className="text-[11px] font-tech font-bold uppercase text-ink block">
                  ⏰ Pengaturan Jadwal Shift Harian
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-ink-muted mb-0.5">
                      Jam Masuk Jadwal
                    </label>
                    <input
                      type="time"
                      name="jam_masuk_jadwal"
                      value={formData.jam_masuk_jadwal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-xs font-digital text-base font-bold text-ink focus:outline-none shadow-art-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-ink-muted mb-0.5">
                      Jam Pulang Jadwal
                    </label>
                    <input
                      type="time"
                      name="jam_pulang_jadwal"
                      value={formData.jam_pulang_jadwal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-xs font-digital text-base font-bold text-ink focus:outline-none shadow-art-sm"
                    />
                  </div>
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
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Simpan Karyawan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data Karyawan */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg w-full max-w-xl p-6 sm:p-7 relative my-8 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-ink">
              <div>
                <span className="text-[10px] font-digital font-bold px-2 py-0.5 rounded bg-ink text-canvas uppercase tracking-widest">
                  AUDIT & PERUBAHAN DATA
                </span>
                <h3 className="text-xl font-bold font-tech uppercase text-ink mt-1">
                  ✏️ Edit Data: {editingEmployee.nama_lengkap}
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

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NIK (Read-only) */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    NIK (Terkunci)
                  </label>
                  <input
                    type="text"
                    value={formData.nik}
                    disabled
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas/60 border-2 border-ink/40 text-xs font-mono font-bold text-ink-muted cursor-not-allowed"
                  />
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="nama_lengkap"
                    value={formData.nama_lengkap}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Email Pengguna *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono focus:outline-none shadow-art-sm"
                    required
                  />
                </div>

                {/* Password Baru (Opsional) */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Ganti Kata Sandi (Opsional)
                  </label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Kosongkan jika tidak diubah"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nomor Telepon */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Nomor Telepon / WA
                  </label>
                  <input
                    type="text"
                    name="nomor_telepon"
                    value={formData.nomor_telepon}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-mono focus:outline-none shadow-art-sm"
                  />
                </div>

                {/* Jabatan */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Jabatan Staf
                  </label>
                  <input
                    type="text"
                    name="jabatan"
                    value={formData.jabatan}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-medium focus:outline-none shadow-art-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Peran / Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
                  >
                    <option value="KARYAWAN">KARYAWAN</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                {/* Cabang Penugasan */}
                <div>
                  <label className="block text-xs font-tech font-bold uppercase text-ink mb-1">
                    Cabang Kantor Penugasan
                  </label>
                  <select
                    name="id_lokasi"
                    value={formData.id_lokasi}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
                  >
                    {locations.map(loc => (
                      <option key={loc.id_lokasi} value={loc.id_lokasi}>
                        {loc.nama_kantor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jadwal Jam Shift */}
              <div className="p-4 rounded-2xl bg-canvas/70 border-2 border-ink/40 space-y-2">
                <span className="text-[11px] font-tech font-bold uppercase text-ink block">
                  ⏰ Penyesuaian Jadwal Shift Kerja
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-ink-muted mb-0.5">
                      Jam Masuk
                    </label>
                    <input
                      type="time"
                      name="jam_masuk_jadwal"
                      value={formData.jam_masuk_jadwal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-xs font-digital text-base font-bold text-ink focus:outline-none shadow-art-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-ink-muted mb-0.5">
                      Jam Pulang
                    </label>
                    <input
                      type="time"
                      name="jam_pulang_jadwal"
                      value={formData.jam_pulang_jadwal}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 rounded-xl bg-widget-pure border-2 border-ink text-xs font-digital text-base font-bold text-ink focus:outline-none shadow-art-sm"
                    />
                  </div>
                </div>
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

      {/* MODAL: Konfirmasi Soft Delete (Nonaktifkan Akun) */}
      {confirmToggleTarget && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-widget rounded-[32px] border-3 border-ink shadow-art-lg w-full max-w-md p-6 relative animate-fade-in">
            <div className="flex items-center gap-3 text-red-700 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold font-tech uppercase text-ink">
                Konfirmasi Nonaktifkan Akun
              </h3>
            </div>

            <p className="text-xs text-ink font-medium leading-relaxed mb-4">
              Apakah Anda yakin ingin menonaktifkan akun karyawan{' '}
              <span className="font-bold font-tech text-ink">
                {confirmToggleTarget.nama_lengkap} ({confirmToggleTarget.nik})
              </span>
              ?
            </p>

            <div className="p-3 bg-canvas rounded-xl border border-ink/30 mb-5 text-[11px] text-ink-muted font-medium">
              <p className="font-bold text-ink mb-1 font-tech uppercase">
                🛡️ Prinsip Audit & Keamanan:
              </p>
              Akun ini akan langsung <strong>terblokir dari login</strong> ke portal absensi.
              Seluruh riwayat presensi masuk/pulang, swafoto geofence, dan log koreksi historis{' '}
              <strong>tetap utuh dan tersimpan</strong> untuk keperluan audit perusahaan. Anda dapat mengaktifkannya kembali sewaktu-waktu.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmToggleTarget(null)}
                className="px-4 py-2 rounded-xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs hover:bg-widget-pure transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(confirmToggleTarget)}
                className="px-4 py-2 rounded-xl bg-red-600 border-2 border-ink text-white font-tech font-bold text-xs shadow-art hover:bg-red-700 transition active:translate-x-[1px] active:translate-y-[1px]"
              >
                Ya, Nonaktifkan Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
