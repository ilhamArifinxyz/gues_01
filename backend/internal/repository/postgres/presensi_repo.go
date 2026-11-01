package postgres

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"absensi-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PresensiRepo struct {
	db *pgxpool.Pool
}

func NewPresensiRepository(db *pgxpool.Pool) *PresensiRepo {
	return &PresensiRepo{db: db}
}

func (r *PresensiRepo) Create(ctx context.Context, p *domain.LogPresensi) error {
	query := `
		INSERT INTO log_presensi (
			nik, id_lokasi, tanggal, jam, jenis_presensi, status_kehadiran, 
			latitude, longitude, jarak_meter, url_foto, created_at
		) VALUES (
			$1, $2, $3::date, $4::time, $5, $6, $7, $8, $9, $10, $11
		) RETURNING id_presensi;
	`
	now := time.Now()
	err := r.db.QueryRow(ctx, query,
		p.NIK, p.IDLokasi, p.Tanggal, p.Jam, p.JenisPresensi, p.StatusKehadiran,
		p.Latitude, p.Longitude, p.JarakMeter, p.URLFoto, now,
	).Scan(&p.IDPresensi)
	if err != nil {
		return fmt.Errorf("gagal mencatat presensi: %w", err)
	}
	p.CreatedAt = now
	return nil
}

func (r *PresensiRepo) FindByNIKAndTanggal(ctx context.Context, nik string, tanggal string) ([]domain.LogPresensi, error) {
	query := `
		SELECT p.id_presensi, p.nik, p.id_lokasi, p.tanggal::text, p.jam::text, 
		       p.jenis_presensi, p.status_kehadiran, p.latitude, p.longitude, 
		       p.jarak_meter, p.url_foto, p.diupdate_oleh, p.waktu_update, p.catatan_koreksi, 
		       p.created_at, k.nama_lengkap, k.jabatan, l.nama_kantor
		FROM log_presensi p
		JOIN karyawan k ON p.nik = k.nik
		JOIN lokasi_kantor l ON p.id_lokasi = l.id_lokasi
		WHERE p.nik = $1 AND p.tanggal = $2::date
		ORDER BY p.jam ASC;
	`
	rows, err := r.db.Query(ctx, query, nik, tanggal)
	if err != nil {
		return nil, fmt.Errorf("gagal query presensi tanggal: %w", err)
	}
	defer rows.Close()

	var list []domain.LogPresensi
	for rows.Next() {
		var p domain.LogPresensi
		err := rows.Scan(
			&p.IDPresensi, &p.NIK, &p.IDLokasi, &p.Tanggal, &p.Jam,
			&p.JenisPresensi, &p.StatusKehadiran, &p.Latitude, &p.Longitude,
			&p.JarakMeter, &p.URLFoto, &p.DiupdateOleh, &p.WaktuUpdate, &p.CatatanKoreksi,
			&p.CreatedAt, &p.NamaKaryawan, &p.Jabatan, &p.NamaKantor,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (r *PresensiRepo) FindHistoryByNIK(ctx context.Context, nik string, month int, year int) ([]domain.LogPresensi, error) {
	query := `
		SELECT p.id_presensi, p.nik, p.id_lokasi, p.tanggal::text, p.jam::text, 
		       p.jenis_presensi, p.status_kehadiran, p.latitude, p.longitude, 
		       p.jarak_meter, p.url_foto, p.diupdate_oleh, p.waktu_update, p.catatan_koreksi, 
		       p.created_at, k.nama_lengkap, k.jabatan, l.nama_kantor
		FROM log_presensi p
		JOIN karyawan k ON p.nik = k.nik
		JOIN lokasi_kantor l ON p.id_lokasi = l.id_lokasi
		WHERE p.nik = $1
		  AND ($2 = 0 OR EXTRACT(MONTH FROM p.tanggal) = $2)
		  AND ($3 = 0 OR EXTRACT(YEAR FROM p.tanggal) = $3)
		ORDER BY p.tanggal DESC, p.jam DESC;
	`
	rows, err := r.db.Query(ctx, query, nik, month, year)
	if err != nil {
		return nil, fmt.Errorf("gagal query histori presensi: %w", err)
	}
	defer rows.Close()

	var list []domain.LogPresensi
	for rows.Next() {
		var p domain.LogPresensi
		err := rows.Scan(
			&p.IDPresensi, &p.NIK, &p.IDLokasi, &p.Tanggal, &p.Jam,
			&p.JenisPresensi, &p.StatusKehadiran, &p.Latitude, &p.Longitude,
			&p.JarakMeter, &p.URLFoto, &p.DiupdateOleh, &p.WaktuUpdate, &p.CatatanKoreksi,
			&p.CreatedAt, &p.NamaKaryawan, &p.Jabatan, &p.NamaKantor,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (r *PresensiRepo) FindRecap(ctx context.Context, startDate, endDate, idLokasi, search string) ([]domain.RekapItem, error) {
	query := `
		SELECT p.id_presensi, p.nik, k.nama_lengkap, k.jabatan, l.nama_kantor, 
		       p.tanggal::text, p.jam::text, p.jenis_presensi, p.status_kehadiran, 
		       p.jarak_meter, p.url_foto, p.diupdate_oleh, p.waktu_update, p.catatan_koreksi
		FROM log_presensi p
		JOIN karyawan k ON p.nik = k.nik
		JOIN lokasi_kantor l ON p.id_lokasi = l.id_lokasi
		WHERE ($1 = '' OR p.tanggal >= $1::date)
		  AND ($2 = '' OR p.tanggal <= $2::date)
		  AND ($3 = 0 OR p.id_lokasi = $3)
		  AND ($4 = '' OR k.nik ILIKE $5 OR k.nama_lengkap ILIKE $5 OR k.jabatan ILIKE $5)
		ORDER BY p.tanggal DESC, p.jam DESC;
	`
	lokasiID := 0
	if idLokasi != "" {
		if val, err := strconv.Atoi(idLokasi); err == nil {
			lokasiID = val
		}
	}
	searchTerm := "%" + search + "%"

	rows, err := r.db.Query(ctx, query, startDate, endDate, lokasiID, search, searchTerm)
	if err != nil {
		return nil, fmt.Errorf("gagal query rekap presensi: %w", err)
	}
	defer rows.Close()

	var list []domain.RekapItem
	for rows.Next() {
		var item domain.RekapItem
		err := rows.Scan(
			&item.IDPresensi, &item.NIK, &item.NamaKaryawan, &item.Jabatan, &item.NamaKantor,
			&item.Tanggal, &item.Jam, &item.JenisPresensi, &item.StatusKehadiran,
			&item.JarakMeter, &item.URLFoto, &item.DiupdateOleh, &item.WaktuUpdate, &item.CatatanKoreksi,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *PresensiRepo) FindByID(ctx context.Context, id int64) (*domain.LogPresensi, error) {
	query := `
		SELECT p.id_presensi, p.nik, p.id_lokasi, p.tanggal::text, p.jam::text, 
		       p.jenis_presensi, p.status_kehadiran, p.latitude, p.longitude, 
		       p.jarak_meter, p.url_foto, p.diupdate_oleh, p.waktu_update, p.catatan_koreksi, 
		       p.created_at, k.nama_lengkap, k.jabatan, l.nama_kantor
		FROM log_presensi p
		JOIN karyawan k ON p.nik = k.nik
		JOIN lokasi_kantor l ON p.id_lokasi = l.id_lokasi
		WHERE p.id_presensi = $1
		LIMIT 1;
	`
	var p domain.LogPresensi
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.IDPresensi, &p.NIK, &p.IDLokasi, &p.Tanggal, &p.Jam,
		&p.JenisPresensi, &p.StatusKehadiran, &p.Latitude, &p.Longitude,
		&p.JarakMeter, &p.URLFoto, &p.DiupdateOleh, &p.WaktuUpdate, &p.CatatanKoreksi,
		&p.CreatedAt, &p.NamaKaryawan, &p.Jabatan, &p.NamaKantor,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("data presensi tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal query presensi id: %w", err)
	}
	return &p, nil
}

func (r *PresensiRepo) UpdateCorrection(ctx context.Context, id int64, statusKehadiran, catatan, adminNIK string, waktuUpdate time.Time) error {
	query := `
		UPDATE log_presensi
		SET status_kehadiran = $1, catatan_koreksi = $2, diupdate_oleh = $3, waktu_update = $4
		WHERE id_presensi = $5;
	`
	_, err := r.db.Exec(ctx, query, statusKehadiran, catatan, adminNIK, waktuUpdate, id)
	if err != nil {
		return fmt.Errorf("gagal koreksi presensi: %w", err)
	}
	return nil
}

func (r *PresensiRepo) CountTodayStats(ctx context.Context, tanggal string) (totalHadir, totalTepatWaktu, totalTerlambat int, err error) {
	query := `
		SELECT 
			COUNT(DISTINCT nik) AS total_hadir,
			COUNT(CASE WHEN jenis_presensi = 'MASUK' AND status_kehadiran = 'TEPAT_WAKTU' THEN 1 END) AS tepat_waktu,
			COUNT(CASE WHEN jenis_presensi = 'MASUK' AND status_kehadiran = 'TERLAMBAT' THEN 1 END) AS terlambat
		FROM log_presensi
		WHERE tanggal = $1::date;
	`
	err = r.db.QueryRow(ctx, query, tanggal).Scan(&totalHadir, &totalTepatWaktu, &totalTerlambat)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("gagal menghitung statistik presensi: %w", err)
	}
	return totalHadir, totalTepatWaktu, totalTerlambat, nil
}
