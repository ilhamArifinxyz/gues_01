package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"absensi-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type IzinRepo struct {
	db *pgxpool.Pool
}

func NewIzinRepository(db *pgxpool.Pool) *IzinRepo {
	return &IzinRepo{db: db}
}

func (r *IzinRepo) Create(ctx context.Context, i *domain.PengajuanIzin) error {
	query := `
		INSERT INTO pengajuan_izin (
			nik, jenis_izin, tanggal_mulai, tanggal_selesai, alasan, url_bukti, status, created_at
		) VALUES (
			$1, $2, $3::date, $4::date, $5, $6, $7, $8
		) RETURNING id_izin;
	`
	now := time.Now()
	err := r.db.QueryRow(ctx, query,
		i.NIK, i.JenisIzin, i.TanggalMulai, i.TanggalSelesai, i.Alasan, i.URLBukti, domain.StatusIzinPending, now,
	).Scan(&i.IDIzin)
	if err != nil {
		return fmt.Errorf("gagal mengajukan izin: %w", err)
	}
	i.Status = domain.StatusIzinPending
	i.CreatedAt = now
	return nil
}

func (r *IzinRepo) FindByNIK(ctx context.Context, nik string) ([]domain.PengajuanIzin, error) {
	query := `
		SELECT i.id_izin, i.nik, i.jenis_izin, i.tanggal_mulai::text, i.tanggal_selesai::text, 
		       i.alasan, i.url_bukti, i.status, i.diverifikasi_oleh, i.waktu_verifikasi, 
		       i.catatan_admin, i.created_at, k.nama_lengkap, k.jabatan
		FROM pengajuan_izin i
		JOIN karyawan k ON i.nik = k.nik
		WHERE i.nik = $1
		ORDER BY i.created_at DESC;
	`
	rows, err := r.db.Query(ctx, query, nik)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil izin karyawan: %w", err)
	}
	defer rows.Close()

	var list []domain.PengajuanIzin
	for rows.Next() {
		var item domain.PengajuanIzin
		err := rows.Scan(
			&item.IDIzin, &item.NIK, &item.JenisIzin, &item.TanggalMulai, &item.TanggalSelesai,
			&item.Alasan, &item.URLBukti, &item.Status, &item.DiverifikasiOleh, &item.WaktuVerifikasi,
			&item.CatatanAdmin, &item.CreatedAt, &item.NamaKaryawan, &item.Jabatan,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *IzinRepo) FindAll(ctx context.Context, status string) ([]domain.PengajuanIzin, error) {
	query := `
		SELECT i.id_izin, i.nik, i.jenis_izin, i.tanggal_mulai::text, i.tanggal_selesai::text, 
		       i.alasan, i.url_bukti, i.status, i.diverifikasi_oleh, i.waktu_verifikasi, 
		       i.catatan_admin, i.created_at, k.nama_lengkap, k.jabatan
		FROM pengajuan_izin i
		JOIN karyawan k ON i.nik = k.nik
		WHERE ($1 = '' OR i.status = $1)
		ORDER BY i.created_at DESC;
	`
	rows, err := r.db.Query(ctx, query, status)
	if err != nil {
		return nil, fmt.Errorf("gagal query daftar izin admin: %w", err)
	}
	defer rows.Close()

	var list []domain.PengajuanIzin
	for rows.Next() {
		var item domain.PengajuanIzin
		err := rows.Scan(
			&item.IDIzin, &item.NIK, &item.JenisIzin, &item.TanggalMulai, &item.TanggalSelesai,
			&item.Alasan, &item.URLBukti, &item.Status, &item.DiverifikasiOleh, &item.WaktuVerifikasi,
			&item.CatatanAdmin, &item.CreatedAt, &item.NamaKaryawan, &item.Jabatan,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *IzinRepo) FindByID(ctx context.Context, id int64) (*domain.PengajuanIzin, error) {
	query := `
		SELECT i.id_izin, i.nik, i.jenis_izin, i.tanggal_mulai::text, i.tanggal_selesai::text, 
		       i.alasan, i.url_bukti, i.status, i.diverifikasi_oleh, i.waktu_verifikasi, 
		       i.catatan_admin, i.created_at, k.nama_lengkap, k.jabatan
		FROM pengajuan_izin i
		JOIN karyawan k ON i.nik = k.nik
		WHERE i.id_izin = $1
		LIMIT 1;
	`
	var item domain.PengajuanIzin
	err := r.db.QueryRow(ctx, query, id).Scan(
		&item.IDIzin, &item.NIK, &item.JenisIzin, &item.TanggalMulai, &item.TanggalSelesai,
		&item.Alasan, &item.URLBukti, &item.Status, &item.DiverifikasiOleh, &item.WaktuVerifikasi,
		&item.CatatanAdmin, &item.CreatedAt, &item.NamaKaryawan, &item.Jabatan,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("data permohonan izin tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal query izin id: %w", err)
	}
	return &item, nil
}

func (r *IzinRepo) UpdateReview(ctx context.Context, id int64, status, catatanAdmin, adminNIK string, waktuVerifikasi time.Time) error {
	query := `
		UPDATE pengajuan_izin
		SET status = $1, catatan_admin = $2, diverifikasi_oleh = $3, waktu_verifikasi = $4
		WHERE id_izin = $5;
	`
	_, err := r.db.Exec(ctx, query, status, catatanAdmin, adminNIK, waktuVerifikasi, id)
	if err != nil {
		return fmt.Errorf("gagal update verifikasi izin: %w", err)
	}
	return nil
}

func (r *IzinRepo) CountActiveToday(ctx context.Context, tanggal string) (int, error) {
	query := `
		SELECT COUNT(DISTINCT nik)
		FROM pengajuan_izin
		WHERE status = 'DISETUJUI'
		  AND tanggal_mulai <= $1::date
		  AND tanggal_selesai >= $1::date;
	`
	var count int
	err := r.db.QueryRow(ctx, query, tanggal).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("gagal menghitung izin hari ini: %w", err)
	}
	return count, nil
}
