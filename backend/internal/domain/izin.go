package domain

import (
	"time"
)

// Konstanta Jenis Izin
const (
	JenisIzinSakit     = "SAKIT"
	JenisIzinIzin      = "IZIN"
	JenisIzinTugasLuar = "TUGAS_LUAR"
	JenisIzinCuti      = "CUTI"
)

// Konstanta Status Izin
const (
	StatusIzinPending   = "PENDING"
	StatusIzinDisetujui = "DISETUJUI"
	StatusIzinDitolak   = "DITOLAK"
)

// PengajuanIzin merepresentasikan permohonan ketidakhadiran karyawan.
type PengajuanIzin struct {
	IDIzin           int64      `json:"id_izin"`
	NIK              string     `json:"nik"`
	JenisIzin        string     `json:"jenis_izin"`
	TanggalMulai     string     `json:"tanggal_mulai"`   // YYYY-MM-DD
	TanggalSelesai   string     `json:"tanggal_selesai"` // YYYY-MM-DD
	Alasan           string     `json:"alasan"`
	URLBukti         *string    `json:"url_bukti,omitempty"`
	Status           string     `json:"status"` // PENDING, DISETUJUI, DITOLAK
	DiverifikasiOleh *string    `json:"diverifikasi_oleh,omitempty"`
	WaktuVerifikasi  *time.Time `json:"waktu_verifikasi,omitempty"`
	CatatanAdmin     *string    `json:"catatan_admin,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`

	// Relational data
	NamaKaryawan string `json:"nama_karyawan,omitempty"`
	Jabatan      string `json:"jabatan,omitempty"`
}

// LeaveRequest data dari form pengajuan izin oleh karyawan.
type LeaveRequest struct {
	JenisIzin      string `json:"jenis_izin"`
	TanggalMulai   string `json:"tanggal_mulai"`
	TanggalSelesai string `json:"tanggal_selesai"`
	Alasan         string `json:"alasan"`
}

// ReviewLeaveRequest payload persetujuan/penolakan izin oleh Admin.
type ReviewLeaveRequest struct {
	Status       string `json:"status"` // DISETUJUI atau DITOLAK
	CatatanAdmin string `json:"catatan_admin"`
}
