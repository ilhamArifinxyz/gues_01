package domain

import (
	"time"
)

// Karyawan merepresentasikan entitas karyawan di dalam sistem.
type Karyawan struct {
	NIK              string    `json:"nik"`
	NamaLengkap      string    `json:"nama_lengkap"`
	Email            string    `json:"email"`
	PasswordHash     string    `json:"-"`
	NomorTelepon     string    `json:"nomor_telepon"`
	Jabatan          string    `json:"jabatan"`
	Role             string    `json:"role"` // ADMIN atau KARYAWAN
	IDLokasi         int       `json:"id_lokasi"`
	JamMasukJadwal   string    `json:"jam_masuk_jadwal"`  // format "15:04:05" atau "15:04"
	JamPulangJadwal  string    `json:"jam_pulang_jadwal"` // format "15:04:05" atau "15:04"
	StatusAktif      bool      `json:"status_aktif"`
	NamaKantor       string    `json:"nama_kantor,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// UserDTO adalah representasi profil pengguna aman tanpa hash kata sandi.
type UserDTO struct {
	NIK             string `json:"nik"`
	NamaLengkap     string `json:"nama_lengkap"`
	Email           string `json:"email"`
	NomorTelepon    string `json:"nomor_telepon"`
	Jabatan         string `json:"jabatan"`
	Role            string `json:"role"`
	IDLokasi        int    `json:"id_lokasi"`
	NamaKantor      string `json:"nama_kantor,omitempty"`
	JamMasukJadwal  string `json:"jam_masuk_jadwal"`
	JamPulangJadwal string `json:"jam_pulang_jadwal"`
	StatusAktif     bool   `json:"status_aktif"`
}

// ToDTO mengonversi Karyawan menjadi UserDTO.
func (k *Karyawan) ToDTO() UserDTO {
	return UserDTO{
		NIK:             k.NIK,
		NamaLengkap:     k.NamaLengkap,
		Email:           k.Email,
		NomorTelepon:    k.NomorTelepon,
		Jabatan:         k.Jabatan,
		Role:            k.Role,
		IDLokasi:        k.IDLokasi,
		NamaKantor:      k.NamaKantor,
		JamMasukJadwal:  k.JamMasukJadwal,
		JamPulangJadwal: k.JamPulangJadwal,
		StatusAktif:     k.StatusAktif,
	}
}

// LoginRequest merepresentasikan payload body login.
type LoginRequest struct {
	Identifier string `json:"identifier"` // Bisa berupa NIK atau Email
	Password   string `json:"password"`
}

// LoginResponse adalah respons sukses setelah autentikasi.
type LoginResponse struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

// CreateEmployeeRequest payload pembuatan akun staf baru oleh Admin.
type CreateEmployeeRequest struct {
	NIK             string `json:"nik"`
	NamaLengkap     string `json:"nama_lengkap"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	NomorTelepon    string `json:"nomor_telepon"`
	Jabatan         string `json:"jabatan"`
	Role            string `json:"role"` // ADMIN atau KARYAWAN
	IDLokasi        int    `json:"id_lokasi"`
	JamMasukJadwal  string `json:"jam_masuk_jadwal"`  // "08:00:00"
	JamPulangJadwal string `json:"jam_pulang_jadwal"` // "17:00:00"
}

// UpdateEmployeeRequest payload pembaruan data karyawan oleh Admin.
type UpdateEmployeeRequest struct {
	NamaLengkap     string `json:"nama_lengkap"`
	Email           string `json:"email"`
	Password        string `json:"password,omitempty"` // Opsional jika ingin ganti password
	NomorTelepon    string `json:"nomor_telepon"`
	Jabatan         string `json:"jabatan"`
	Role            string `json:"role"`
	IDLokasi        int    `json:"id_lokasi"`
	JamMasukJadwal  string `json:"jam_masuk_jadwal"`
	JamPulangJadwal string `json:"jam_pulang_jadwal"`
	StatusAktif     bool   `json:"status_aktif"`
}
