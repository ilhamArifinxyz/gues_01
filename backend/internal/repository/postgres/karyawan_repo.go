package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"absensi-backend/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type KaryawanRepo struct {
	db *pgxpool.Pool
}

func NewKaryawanRepository(db *pgxpool.Pool) *KaryawanRepo {
	return &KaryawanRepo{db: db}
}

func (r *KaryawanRepo) FindByEmailOrNIK(ctx context.Context, identifier string) (*domain.Karyawan, error) {
	query := `
		SELECT k.nik, k.nama_lengkap, k.email, k.password_hash, COALESCE(k.nomor_telepon, ''), 
		       k.jabatan, k.role, k.id_lokasi, k.jam_masuk_jadwal::text, k.jam_pulang_jadwal::text, 
		       k.status_aktif, k.created_at, k.updated_at, COALESCE(l.nama_kantor, '')
		FROM karyawan k
		LEFT JOIN lokasi_kantor l ON k.id_lokasi = l.id_lokasi
		WHERE LOWER(k.email) = LOWER($1) OR k.nik = $1
		LIMIT 1;
	`
	var k domain.Karyawan
	err := r.db.QueryRow(ctx, query, strings.TrimSpace(identifier)).Scan(
		&k.NIK, &k.NamaLengkap, &k.Email, &k.PasswordHash, &k.NomorTelepon,
		&k.Jabatan, &k.Role, &k.IDLokasi, &k.JamMasukJadwal, &k.JamPulangJadwal,
		&k.StatusAktif, &k.CreatedAt, &k.UpdatedAt, &k.NamaKantor,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("karyawan tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal mencari karyawan: %w", err)
	}
	return &k, nil
}

func (r *KaryawanRepo) FindByNIK(ctx context.Context, nik string) (*domain.Karyawan, error) {
	query := `
		SELECT k.nik, k.nama_lengkap, k.email, k.password_hash, COALESCE(k.nomor_telepon, ''), 
		       k.jabatan, k.role, k.id_lokasi, k.jam_masuk_jadwal::text, k.jam_pulang_jadwal::text, 
		       k.status_aktif, k.created_at, k.updated_at, COALESCE(l.nama_kantor, '')
		FROM karyawan k
		LEFT JOIN lokasi_kantor l ON k.id_lokasi = l.id_lokasi
		WHERE k.nik = $1
		LIMIT 1;
	`
	var k domain.Karyawan
	err := r.db.QueryRow(ctx, query, nik).Scan(
		&k.NIK, &k.NamaLengkap, &k.Email, &k.PasswordHash, &k.NomorTelepon,
		&k.Jabatan, &k.Role, &k.IDLokasi, &k.JamMasukJadwal, &k.JamPulangJadwal,
		&k.StatusAktif, &k.CreatedAt, &k.UpdatedAt, &k.NamaKantor,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("karyawan tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal query nik: %w", err)
	}
	return &k, nil
}

func (r *KaryawanRepo) FindAll(ctx context.Context, search string) ([]domain.Karyawan, error) {
	query := `
		SELECT k.nik, k.nama_lengkap, k.email, k.password_hash, COALESCE(k.nomor_telepon, ''), 
		       k.jabatan, k.role, k.id_lokasi, k.jam_masuk_jadwal::text, k.jam_pulang_jadwal::text, 
		       k.status_aktif, k.created_at, k.updated_at, COALESCE(l.nama_kantor, '')
		FROM karyawan k
		LEFT JOIN lokasi_kantor l ON k.id_lokasi = l.id_lokasi
		WHERE ($1 = '' OR k.nik ILIKE $2 OR k.nama_lengkap ILIKE $2 OR k.jabatan ILIKE $2)
		ORDER BY k.created_at DESC;
	`
	searchTerm := "%" + search + "%"
	rows, err := r.db.Query(ctx, query, search, searchTerm)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data karyawan: %w", err)
	}
	defer rows.Close()

	var result []domain.Karyawan
	for rows.Next() {
		var k domain.Karyawan
		err := rows.Scan(
			&k.NIK, &k.NamaLengkap, &k.Email, &k.PasswordHash, &k.NomorTelepon,
			&k.Jabatan, &k.Role, &k.IDLokasi, &k.JamMasukJadwal, &k.JamPulangJadwal,
			&k.StatusAktif, &k.CreatedAt, &k.UpdatedAt, &k.NamaKantor,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, k)
	}
	return result, nil
}

func (r *KaryawanRepo) Create(ctx context.Context, k *domain.Karyawan) error {
	query := `
		INSERT INTO karyawan (nik, nama_lengkap, email, password_hash, nomor_telepon, jabatan, role, id_lokasi, jam_masuk_jadwal, jam_pulang_jadwal, status_aktif, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::time, $10::time, $11, $12, $13);
	`
	now := time.Now()
	_, err := r.db.Exec(ctx, query,
		k.NIK, k.NamaLengkap, k.Email, k.PasswordHash, sql.Named("telp", k.NomorTelepon).Value,
		k.Jabatan, k.Role, k.IDLokasi, k.JamMasukJadwal, k.JamPulangJadwal, k.StatusAktif, now, now,
	)
	if err != nil {
		return fmt.Errorf("gagal menyimpan karyawan: %w", err)
	}
	k.CreatedAt = now
	k.UpdatedAt = now
	return nil
}

func (r *KaryawanRepo) Update(ctx context.Context, k *domain.Karyawan) error {
	now := time.Now()
	var err error
	if k.PasswordHash != "" {
		query := `
			UPDATE karyawan 
			SET nama_lengkap = $1, email = $2, password_hash = $3, nomor_telepon = $4, 
			    jabatan = $5, role = $6, id_lokasi = $7, jam_masuk_jadwal = $8::time, 
			    jam_pulang_jadwal = $9::time, status_aktif = $10, updated_at = $11
			WHERE nik = $12;
		`
		_, err = r.db.Exec(ctx, query,
			k.NamaLengkap, k.Email, k.PasswordHash, k.NomorTelepon,
			k.Jabatan, k.Role, k.IDLokasi, k.JamMasukJadwal,
			k.JamPulangJadwal, k.StatusAktif, now, k.NIK,
		)
	} else {
		query := `
			UPDATE karyawan 
			SET nama_lengkap = $1, email = $2, nomor_telepon = $3, 
			    jabatan = $4, role = $5, id_lokasi = $6, jam_masuk_jadwal = $7::time, 
			    jam_pulang_jadwal = $8::time, status_aktif = $9, updated_at = $10
			WHERE nik = $11;
		`
		_, err = r.db.Exec(ctx, query,
			k.NamaLengkap, k.Email, k.NomorTelepon,
			k.Jabatan, k.Role, k.IDLokasi, k.JamMasukJadwal,
			k.JamPulangJadwal, k.StatusAktif, now, k.NIK,
		)
	}
	if err != nil {
		return fmt.Errorf("gagal memperbarui karyawan: %w", err)
	}
	k.UpdatedAt = now
	return nil
}

func (r *KaryawanRepo) CountActive(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM karyawan WHERE status_aktif = true;`
	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	return count, err
}
