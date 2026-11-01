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

type LokasiRepo struct {
	db *pgxpool.Pool
}

func NewLokasiRepository(db *pgxpool.Pool) *LokasiRepo {
	return &LokasiRepo{db: db}
}

func (r *LokasiRepo) FindByID(ctx context.Context, id int) (*domain.LokasiKantor, error) {
	query := `
		SELECT id_lokasi, nama_kantor, alamat, latitude, longitude, radius_meter, status_aktif, created_at, updated_at
		FROM lokasi_kantor
		WHERE id_lokasi = $1
		LIMIT 1;
	`
	var l domain.LokasiKantor
	err := r.db.QueryRow(ctx, query, id).Scan(
		&l.IDLokasi, &l.NamaKantor, &l.Alamat, &l.Latitude, &l.Longitude,
		&l.RadiusMeter, &l.StatusAktif, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("lokasi kantor tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal query lokasi: %w", err)
	}
	return &l, nil
}

func (r *LokasiRepo) FindAll(ctx context.Context) ([]domain.LokasiKantor, error) {
	query := `
		SELECT id_lokasi, nama_kantor, alamat, latitude, longitude, radius_meter, status_aktif, created_at, updated_at
		FROM lokasi_kantor
		ORDER BY id_lokasi ASC;
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data lokasi kantor: %w", err)
	}
	defer rows.Close()

	var list []domain.LokasiKantor
	for rows.Next() {
		var l domain.LokasiKantor
		if err := rows.Scan(
			&l.IDLokasi, &l.NamaKantor, &l.Alamat, &l.Latitude, &l.Longitude,
			&l.RadiusMeter, &l.StatusAktif, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, nil
}

func (r *LokasiRepo) Create(ctx context.Context, l *domain.LokasiKantor) error {
	query := `
		INSERT INTO lokasi_kantor (nama_kantor, alamat, latitude, longitude, radius_meter, status_aktif, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id_lokasi;
	`
	now := time.Now()
	err := r.db.QueryRow(ctx, query,
		l.NamaKantor, l.Alamat, l.Latitude, l.Longitude, l.RadiusMeter, l.StatusAktif, now, now,
	).Scan(&l.IDLokasi)
	if err != nil {
		return fmt.Errorf("gagal membuat lokasi baru: %w", err)
	}
	l.CreatedAt = now
	l.UpdatedAt = now
	return nil
}

func (r *LokasiRepo) Update(ctx context.Context, l *domain.LokasiKantor) error {
	query := `
		UPDATE lokasi_kantor
		SET nama_kantor = $1, alamat = $2, latitude = $3, longitude = $4, radius_meter = $5, status_aktif = $6, updated_at = $7
		WHERE id_lokasi = $8;
	`
	now := time.Now()
	_, err := r.db.Exec(ctx, query,
		l.NamaKantor, l.Alamat, l.Latitude, l.Longitude, l.RadiusMeter, l.StatusAktif, now, l.IDLokasi,
	)
	if err != nil {
		return fmt.Errorf("gagal memperbarui lokasi: %w", err)
	}
	l.UpdatedAt = now
	return nil
}
