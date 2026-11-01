package domain

import "time"

// LokasiKantor merepresentasikan data geofencing kantor cabang.
type LokasiKantor struct {
	IDLokasi    int       `json:"id_lokasi"`
	NamaKantor  string    `json:"nama_kantor"`
	Alamat      string    `json:"alamat"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	RadiusMeter int       `json:"radius_meter"`
	StatusAktif bool      `json:"status_aktif"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateLocationRequest merepresentasikan payload pembuatan lokasi baru.
type CreateLocationRequest struct {
	NamaKantor  string  `json:"nama_kantor"`
	Alamat      string  `json:"alamat"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	RadiusMeter int     `json:"radius_meter"`
}

// UpdateLocationRequest merepresentasikan payload pembaruan data lokasi kantor.
type UpdateLocationRequest struct {
	NamaKantor  string  `json:"nama_kantor"`
	Alamat      string  `json:"alamat"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	RadiusMeter int     `json:"radius_meter"`
	StatusAktif bool    `json:"status_aktif"`
}
