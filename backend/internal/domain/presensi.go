package domain

import (
	"time"
)

// Konstanta Jenis Presensi
const (
	JenisMasuk  = "MASUK"
	JenisPulang = "PULANG"
)

// Konstanta Status Kehadiran
const (
	StatusTepatWaktu   = "TEPAT_WAKTU"
	StatusTerlambat    = "TERLAMBAT"
	StatusPulangNormal = "PULANG_NORMAL"
	StatusPulangCepat  = "PULANG_CEPAT"
)

// LogPresensi mencerminkan tabel log_presensi di basis data.
type LogPresensi struct {
	IDPresensi      int64      `json:"id_presensi"`
	NIK             string     `json:"nik"`
	IDLokasi        int        `json:"id_lokasi"`
	Tanggal         string     `json:"tanggal"` // YYYY-MM-DD
	Jam             string     `json:"jam"`     // HH:MM:SS
	JenisPresensi   string     `json:"jenis_presensi"`
	StatusKehadiran string     `json:"status_kehadiran"`
	Latitude        float64    `json:"latitude"`
	Longitude       float64    `json:"longitude"`
	JarakMeter      float64    `json:"jarak_meter"`
	URLFoto         string     `json:"url_foto"`
	DiupdateOleh    *string    `json:"diupdate_oleh,omitempty"`
	WaktuUpdate     *time.Time `json:"waktu_update,omitempty"`
	CatatanKoreksi  *string    `json:"catatan_koreksi,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`

	// Relational data
	NamaKaryawan string `json:"nama_karyawan,omitempty"`
	Jabatan      string `json:"jabatan,omitempty"`
	NamaKantor   string `json:"nama_kantor,omitempty"`
}

// PunchRequest data yang diparsing dari form presensi.
type PunchRequest struct {
	Jenis     string  `json:"jenis"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// PunchResponse respons sukses pasca melakukan presensi.
type PunchResponse struct {
	IDPresensi      int64   `json:"id_presensi"`
	Tanggal         string  `json:"tanggal"`
	Jam             string  `json:"jam"`
	JenisPresensi   string  `json:"jenis_presensi"`
	StatusKehadiran string  `json:"status_kehadiran"`
	JarakMeter      float64 `json:"jarak_meter"`
	URLFoto         string  `json:"url_foto"`
}

// TodayAttendanceResponse status absensi karyawan hari ini.
type TodayAttendanceResponse struct {
	Tanggal       string       `json:"tanggal"`
	SudahMasuk    bool         `json:"sudah_masuk"`
	SudahPulang   bool         `json:"sudah_pulang"`
	Masuk         *LogPresensi `json:"masuk,omitempty"`
	Pulang        *LogPresensi `json:"pulang,omitempty"`
	TotalJamKerja string       `json:"total_jam_kerja,omitempty"`
	DurasiMenit   int          `json:"durasi_menit,omitempty"`
}

// RekapItem ringkasan record kehadiran untuk admin & ekspor.
type RekapItem struct {
	IDPresensi      int64      `json:"id_presensi"`
	NIK             string     `json:"nik"`
	NamaKaryawan    string     `json:"nama_karyawan"`
	Jabatan         string     `json:"jabatan"`
	NamaKantor      string     `json:"nama_kantor"`
	Tanggal         string     `json:"tanggal"`
	Jam             string     `json:"jam"`
	JenisPresensi   string     `json:"jenis_presensi"`
	StatusKehadiran string     `json:"status_kehadiran"`
	JarakMeter      float64    `json:"jarak_meter"`
	URLFoto         string     `json:"url_foto"`
	DiupdateOleh    *string    `json:"diupdate_oleh,omitempty"`
	WaktuUpdate     *time.Time `json:"waktu_update,omitempty"`
	CatatanKoreksi  *string    `json:"catatan_koreksi,omitempty"`
}

// AttendanceSummary ringkasan metrik statistik kehadiran harian admin dashboard.
type AttendanceSummary struct {
	TotalKaryawan  int `json:"total_karyawan"`
	TotalHadir     int `json:"total_hadir"`
	TotalTepatWaktu int `json:"total_tepat_waktu"`
	TotalTerlambat int `json:"total_terlambat"`
	TotalIzinSakit int `json:"total_izin_sakit"`
	TotalAlpha     int `json:"total_alpha"`
}

// CorrectAttendanceRequest koreksi status presensi oleh Admin.
type CorrectAttendanceRequest struct {
	StatusKehadiran string `json:"status_kehadiran"`
	CatatanKoreksi  string `json:"catatan_koreksi"`
}
