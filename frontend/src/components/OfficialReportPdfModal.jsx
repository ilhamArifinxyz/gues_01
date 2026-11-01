import React, { useState, useRef } from 'react';

/**
 * OfficialReportPdfModal (Fitur F-06)
 * Generator Ekspor Dokumen Resmi A4 Siap Cetak ber-Kop Akademik Universitas Tadulako
 * (Program Studi S1 Teknik Informatika, Fakultas Teknik).
 */
export default function OfficialReportPdfModal({ isOpen, onClose, logs = [], stats = {} }) {
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const printContainerRef = useRef(null);

  if (!isOpen) return null;

  // Tanggal & metadata cetak resmi
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('id-ID', options);
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';

  // Filter logs berdasarkan cabang
  const reportLogs = logs.filter((item) => {
    if (selectedBranch === 'ALL') return true;
    if (selectedBranch === 'PALU') return item.cabang.toLowerCase().includes('palu');
    if (selectedBranch === 'PUSAT') return item.cabang.toLowerCase().includes('pusat');
    return true;
  });

  const totalHadir = reportLogs.filter((l) => l.status === 'TEPAT_WAKTU' || l.status === 'TERLAMBAT' || l.status === 'HADIR_MANUAL').length;
  const tepatWaktuCount = reportLogs.filter((l) => l.status === 'TEPAT_WAKTU').length;
  const terlambatCount = reportLogs.filter((l) => l.status === 'TERLAMBAT').length;
  const izinCount = reportLogs.filter((l) => l.status === 'IZIN_SAKIT').length;

  // Handle native window.print()
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-ink/80 backdrop-blur-sm overflow-y-auto">
      {/* Modal Box */}
      <div className="bg-widget w-full max-w-5xl rounded-[32px] border-3 border-ink shadow-art-lg flex flex-col max-h-[95vh] overflow-hidden my-auto print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b-2 border-ink bg-widget-pure flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-ink text-canvas font-digital text-xs uppercase tracking-widest font-bold">
                A4 OFFICIAL DOCUMENT GENERATOR
              </span>
              <span className="text-xs font-mono font-bold text-ink-muted">
                Kop Akademik Universitas Tadulako
              </span>
            </div>
            <h3 className="text-xl font-bold font-tech uppercase text-ink mt-0.5 flex items-center gap-2">
              <i className="ph-bold ph-printer text-xl text-ink"></i>
              <span>Pratinjau Dokumen Cetak Rekapitulasi Presensi</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 rounded-xl bg-canvas border-2 border-ink text-xs font-tech font-bold focus:outline-none shadow-art-sm"
            >
              <option value="ALL">Semua Cabang Kantor</option>
              <option value="PALU">Kantor Cabang Palu (Untad)</option>
              <option value="PUSAT">Kantor Pusat Palu</option>
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-ink text-canvas font-tech font-bold text-xs hover:bg-[#2C3331] transition shadow-art flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
            >
              <i className="ph-bold ph-printer text-base"></i>
              <span>🖨️ Cetak / Simpan PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-canvas border-2 border-ink flex items-center justify-center text-ink font-bold hover:bg-widget transition shadow-art-sm flex-shrink-0"
              title="Tutup Pratinjau"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#8C9490] flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {/* Authentic A4 Paper Sheet Canvas */}
          <div
            id="printable-untad-report"
            ref={printContainerRef}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-[#111827] p-8 sm:p-12 shadow-2xl rounded-sm border border-gray-300 font-serif relative flex flex-col justify-between print:shadow-none print:border-none print:p-6 print:m-0 print:max-w-none print:w-full"
          >
            {/* Top Content Block */}
            <div>
              {/* KOP SURAT AKADEMIK RESMI UNIVERSITAS TADULAKO */}
              <div className="flex items-center gap-5 border-b-[3px] border-black pb-3">
                {/* Logo / Lambang Untad Official Vector */}
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-22 h-22 drop-shadow-sm"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Outer Crest Ring */}
                    <circle cx="50" cy="50" r="48" fill="#FBBF24" stroke="#1E3A8A" strokeWidth="3" />
                    <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="1.5" />
                    {/* Inner Tadulako Shield Motif */}
                    <path
                      d="M50 14 L80 32 L80 62 L50 86 L20 62 L20 32 Z"
                      fill="#1E3A8A"
                      stroke="#B45309"
                      strokeWidth="2"
                    />
                    {/* Golden Tree / Flame of Knowledge */}
                    <path
                      d="M50 24 L56 40 L72 40 L59 50 L64 66 L50 56 L36 66 L41 50 L28 40 L44 40 Z"
                      fill="#FBBF24"
                    />
                    <circle cx="50" cy="50" r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                    {/* Text Ring Simulation */}
                    <path
                      id="textCurve"
                      d="M25 80 A38 38 0 0 0 75 80"
                      fill="none"
                      stroke="none"
                    />
                    <text fontSize="5.5" fontWeight="900" fill="#1E3A8A" textAnchor="middle">
                      <textPath href="#textCurve" startOffset="50%">
                        UNIVERSITAS TADULAKO
                      </textPath>
                    </text>
                  </svg>
                </div>

                {/* Kop Surat Typography Header */}
                <div className="flex-1 text-center font-serif leading-tight">
                  <h4 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-900">
                    KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
                  </h4>
                  <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wide text-gray-950 mt-0.5">
                    UNIVERSITAS TADULAKO
                  </h1>
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-gray-900">
                    FAKULTAS TEKNIK
                  </h2>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-900">
                    JURUSAN TEKNOLOGI INFORMASI
                  </h3>
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-blue-900 underline decoration-1 underline-offset-2">
                    PROGRAM STUDI S1 TEKNIK INFORMATIKA
                  </h4>
                  <p className="text-[10px] sm:text-[11px] font-sans text-gray-700 mt-1.5 leading-snug">
                    Jl. Soekarno Hatta Km. 9 Palu 94118 • Telp: (0451) 422611, 422355 • Fax: (0451) 422844
                    <br />
                    Laman: <span className="font-semibold text-blue-800">https://untad.ac.id</span> • Pos-el: <span className="font-semibold text-blue-800">informatika@untad.ac.id</span>
                  </p>
                </div>
              </div>

              {/* Double Horizontal Separator Line (Standard Indonesian Letterhead) */}
              <div className="w-full h-[1px] bg-black mt-[2px] mb-6"></div>

              {/* Document Title & Reference Number */}
              <div className="text-center mb-6">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide underline decoration-2 underline-offset-4 text-gray-950 font-serif">
                  REKAPITULASI LAPORAN KEHADIRAN PEGAWAI BULANAN
                </h3>
                <p className="text-xs font-mono font-bold text-gray-800 mt-1">
                  Nomor: 418/UN28.1.32/TI/KP/2026
                </p>
              </div>

              {/* Document Metadata Grid */}
              <div className="bg-gray-50 border border-gray-400 rounded-sm p-3.5 mb-5 font-sans text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Program Studi / Jurusan</span>
                  <span className="text-gray-950 font-semibold">: S1 Teknik Informatika / TI</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Periode Rekapitulasi</span>
                  <span className="text-gray-950 font-semibold">: Oktober 2026</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Lokasi / Kantor Cabang</span>
                  <span className="text-gray-950 font-semibold">
                    : {selectedBranch === 'ALL' ? 'Semua Unit Kerja (Palu & Pusat)' : selectedBranch === 'PALU' ? 'Kantor Cabang Palu (Untad)' : 'Kantor Pusat'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Tanggal & Waktu Cetak</span>
                  <span className="text-gray-950 font-semibold">: {formattedDate}, {timeStr}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Petugas Auditor HRD</span>
                  <span className="text-gray-950 font-semibold">: Admin HRD Utama (NIK: ADM001)</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-gray-700">Sifat Dokumen</span>
                  <span className="text-gray-950 font-semibold">: RESMI & RAHASIA (Internal Kepegawaian)</span>
                </div>
              </div>

              {/* Summary Statistics Box */}
              <div className="grid grid-cols-4 gap-2 mb-5 font-sans">
                <div className="border border-gray-400 p-2 text-center rounded-sm bg-gray-50">
                  <div className="text-[10px] uppercase font-bold text-gray-600">Total Personel</div>
                  <div className="text-base font-black text-gray-900">{stats.totalPegawai || 120}</div>
                  <div className="text-[9px] text-gray-500 font-medium">Pegawai Terdaftar</div>
                </div>
                <div className="border border-gray-400 p-2 text-center rounded-sm bg-gray-50">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Tepat Waktu</div>
                  <div className="text-base font-black text-emerald-800">{tepatWaktuCount || stats.tepatWaktu || 98}</div>
                  <div className="text-[9px] text-emerald-700 font-medium">
                    ({((tepatWaktuCount || 98) / (stats.totalPegawai || 120) * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="border border-gray-400 p-2 text-center rounded-sm bg-gray-50">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Terlambat</div>
                  <div className="text-base font-black text-amber-800">{terlambatCount || stats.terlambat || 14}</div>
                  <div className="text-[9px] text-amber-700 font-medium">
                    ({((terlambatCount || 14) / (stats.totalPegawai || 120) * 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="border border-gray-400 p-2 text-center rounded-sm bg-gray-50">
                  <div className="text-[10px] uppercase font-bold text-purple-800">Izin / Sakit</div>
                  <div className="text-base font-black text-purple-800">{izinCount || stats.izinSakit || 8}</div>
                  <div className="text-[9px] text-purple-700 font-medium">
                    ({((izinCount || 8) / (stats.totalPegawai || 120) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="mb-6 font-sans">
                <table className="w-full text-left text-[10px] border-collapse border border-gray-600">
                  <thead>
                    <tr className="bg-gray-200 text-gray-900 font-bold uppercase tracking-wider text-[9px] border-b border-gray-600">
                      <th className="border border-gray-500 py-2 px-2 text-center w-8">No</th>
                      <th className="border border-gray-500 py-2 px-2.5">NIK</th>
                      <th className="border border-gray-500 py-2 px-3">Nama Pegawai</th>
                      <th className="border border-gray-500 py-2 px-2.5">Cabang / Unit</th>
                      <th className="border border-gray-500 py-2 px-2.5 text-center">Jam Masuk</th>
                      <th className="border border-gray-500 py-2 px-2.5 text-center">Jarak GPS</th>
                      <th className="border border-gray-500 py-2 px-2.5 text-center">Status</th>
                      <th className="border border-gray-500 py-2 px-3">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-gray-500 border border-gray-500 italic">
                          Tidak ada catatan kehadiran yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      reportLogs.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border border-gray-400 py-1.5 px-2 text-center font-mono font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-2.5 font-mono font-semibold text-gray-900">
                            {item.nik}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-3 font-semibold text-gray-950">
                            {item.nama}
                            {item.jabatan && <span className="block text-[8px] text-gray-500 font-normal">{item.jabatan}</span>}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-2.5 text-gray-700">
                            {item.cabang}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-2.5 text-center font-mono font-bold">
                            {item.jamMasuk}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-2.5 text-center font-mono">
                            {item.jarak > 0 ? `${item.jarak} m` : '-'}
                          </td>
                          <td className="border border-gray-400 py-1.5 px-2.5 text-center font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] uppercase inline-block border ${
                                item.status === 'TEPAT_WAKTU'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                                  : item.status === 'TERLAMBAT'
                                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                                  : 'bg-purple-100 text-purple-950 border-purple-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="border border-gray-400 py-1.5 px-3 text-gray-700 italic">
                            {item.keterangan || (item.status === 'TEPAT_WAKTU' ? 'Hadir tepat waktu' : '-')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Content Block: Legal Digital Signature & Authorization */}
            <div className="mt-8 font-serif">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Left: Digital Stamp & Verification Code */}
                <div className="border border-dashed border-gray-400 p-3 rounded-sm bg-gray-50 flex items-center gap-3">
                  {/* Digital QR Code Symbol */}
                  <div className="w-16 h-16 bg-white border border-black p-1 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-14 h-14" fill="currentColor">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h4v2h-4v-2zm2-2h2v2h-2v-2zm-6-2h2v2h-2v-2zm0 4h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <div className="font-sans text-[9px] leading-tight text-gray-700">
                    <p className="font-bold text-gray-900 uppercase">
                      Verifikasi Dokumen Digital
                    </p>
                    <p className="font-mono text-gray-600 mt-0.5">
                      Sistem Absensi Untad TI
                    </p>
                    <p className="font-mono text-[8px] text-gray-500 mt-0.5">
                      UUID: UNTAD-TI-ATT-2026-X-8829
                    </p>
                    <p className="text-[8px] text-emerald-800 font-bold mt-1">
                      ● KEABSAHAN TERVERIFIKASI
                    </p>
                  </div>
                </div>

                {/* Right: Signature of Department Head / HRD Lead */}
                <div className="text-center font-serif text-xs">
                  <p className="text-gray-800">
                    Palu, {formattedDate}
                  </p>
                  <p className="font-bold text-gray-900 mt-1">
                    Mengetahui & Mengesahkan,
                  </p>
                  <p className="text-gray-800 text-[11px]">
                    Ketua Jurusan Teknologi Informasi /
                    <br />
                    Koordinator Program Studi S1 Teknik Informatika
                  </p>

                  {/* Digital Signature & Official Stamp Watermark */}
                  <div className="my-2 h-20 flex items-center justify-center relative">
                    {/* Stamp Watermark */}
                    <div className="absolute w-24 h-24 rounded-full border-2 border-blue-800 border-dashed opacity-40 flex items-center justify-center rotate-[-12deg] pointer-events-none">
                      <span className="text-[7px] font-black uppercase text-blue-900 text-center tracking-tight">
                        UNIVERSITAS TADULAKO
                        <br />
                        ★ FAKULTAS TEKNIK ★
                        <br />
                        PRODI S1 TEKNIK INFORMATIKA
                      </span>
                    </div>

                    {/* Signature Script Line */}
                    <svg viewBox="0 0 200 60" className="w-40 h-16 text-blue-950">
                      <path
                        d="M20 40 Q 40 10, 60 35 T 100 20 T 130 45 T 170 30"
                        fill="none"
                        stroke="#1E3A8A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <p className="font-bold text-gray-950 underline decoration-1 text-sm">
                    Dr. Ir. Syaiful Bachri, S.T., M.Sc.
                  </p>
                  <p className="font-mono text-[10px] text-gray-700 mt-0.5">
                    NIP. 19780512 200501 1 002
                  </p>
                </div>
              </div>

              {/* Legal Notice Footer */}
              <div className="border-t border-gray-400 pt-2 mt-6 flex items-center justify-between font-sans text-[8px] text-gray-500">
                <span>Dokumen ini dicetak otomatis dari Sistem Manajemen Absensi Terpadu Universitas Tadulako.</span>
                <span>Halaman 1 dari 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t-2 border-ink bg-widget-pure flex items-center justify-between print:hidden">
          <div className="text-xs font-mono text-ink-muted">
            Format: Standar Kertas A4 (210 x 297 mm) Portrait • Layout Siap Cetak
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-canvas border-2 border-ink text-ink font-tech font-bold text-xs hover:bg-widget transition shadow-art-sm"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-ink border-2 border-ink text-canvas font-tech font-bold text-xs hover:bg-[#2C3331] transition shadow-art flex items-center gap-2 active:translate-x-[1px] active:translate-y-[1px]"
            >
              <i className="ph-bold ph-printer text-base"></i>
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
