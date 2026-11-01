package repository

import (
	"context"
	"time"

	"absensi-backend/internal/domain"
)

// KaryawanRepository mendefinisikan abstraksi akses data karyawan.
type KaryawanRepository interface {
	FindByEmailOrNIK(ctx context.Context, identifier string) (*domain.Karyawan, error)
	FindByNIK(ctx context.Context, nik string) (*domain.Karyawan, error)
	FindAll(ctx context.Context, search string) ([]domain.Karyawan, error)
	Create(ctx context.Context, k *domain.Karyawan) error
	Update(ctx context.Context, k *domain.Karyawan) error
	CountActive(ctx context.Context) (int, error)
}

// LokasiRepository mendefinisikan abstraksi akses data titik kantor acuan.
type LokasiRepository interface {
	FindByID(ctx context.Context, id int) (*domain.LokasiKantor, error)
	FindAll(ctx context.Context) ([]domain.LokasiKantor, error)
	Create(ctx context.Context, l *domain.LokasiKantor) error
	Update(ctx context.Context, l *domain.LokasiKantor) error
}

// PresensiRepository mendefinisikan abstraksi akses data log presensi.
type PresensiRepository interface {
	Create(ctx context.Context, p *domain.LogPresensi) error
	FindByNIKAndTanggal(ctx context.Context, nik string, tanggal string) ([]domain.LogPresensi, error)
	FindHistoryByNIK(ctx context.Context, nik string, month int, year int) ([]domain.LogPresensi, error)
	FindRecap(ctx context.Context, startDate, endDate, idLokasi, search string) ([]domain.RekapItem, error)
	FindByID(ctx context.Context, id int64) (*domain.LogPresensi, error)
	UpdateCorrection(ctx context.Context, id int64, statusKehadiran, catatan, adminNIK string, waktuUpdate time.Time) error
	CountTodayStats(ctx context.Context, tanggal string) (totalHadir, totalTepatWaktu, totalTerlambat int, err error)
}

// IzinRepository mendefinisikan abstraksi akses data pengajuan izin.
type IzinRepository interface {
	Create(ctx context.Context, i *domain.PengajuanIzin) error
	FindByNIK(ctx context.Context, nik string) ([]domain.PengajuanIzin, error)
	FindAll(ctx context.Context, status string) ([]domain.PengajuanIzin, error)
	FindByID(ctx context.Context, id int64) (*domain.PengajuanIzin, error)
	UpdateReview(ctx context.Context, id int64, status, catatanAdmin, adminNIK string, waktuVerifikasi time.Time) error
	CountActiveToday(ctx context.Context, tanggal string) (int, error)
}
