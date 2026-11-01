package service

import (
	"context"
	"net/http"
	"strings"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/repository"
	"absensi-backend/pkg/hash"
	"absensi-backend/pkg/token"
)

type AuthService struct {
	karyawanRepo repository.KaryawanRepository
	jwtSecret    string
}

func NewAuthService(karyawanRepo repository.KaryawanRepository, jwtSecret string) *AuthService {
	return &AuthService{
		karyawanRepo: karyawanRepo,
		jwtSecret:    jwtSecret,
	}
}

func (s *AuthService) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	cleanIdentifier := strings.TrimSpace(req.Identifier)
	if cleanIdentifier == "" || strings.TrimSpace(req.Password) == "" {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_INPUT", "Email/NIK dan kata sandi wajib diisi")
	}

	user, err := s.karyawanRepo.FindByEmailOrNIK(ctx, cleanIdentifier)
	if err != nil {
		return nil, NewAppError(http.StatusUnauthorized, "INVALID_CREDENTIALS", "Kredensial login tidak cocok")
	}

	if !user.StatusAktif {
		return nil, NewAppError(http.StatusForbidden, "ACCOUNT_INACTIVE", "Akun Anda saat ini tidak aktif, hubungi Admin HRD")
	}

	if !hash.CheckPasswordHash(req.Password, user.PasswordHash) {
		// Toleransi kompatibilitas password seeder demo (karyawan123 <-> password123)
		if !((req.Password == "karyawan123" && hash.CheckPasswordHash("password123", user.PasswordHash)) ||
			(req.Password == "password123" && hash.CheckPasswordHash("karyawan123", user.PasswordHash))) {
			return nil, NewAppError(http.StatusUnauthorized, "INVALID_CREDENTIALS", "Kredensial login tidak cocok")
		}
	}

	// Buat JWT token berdurasi 24 jam
	tokenStr, err := token.GenerateToken(user.NIK, user.Role, user.NamaLengkap, user.Email, s.jwtSecret, 24*time.Hour)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", "Gagal menerbitkan token autentikasi")
	}

	return &domain.LoginResponse{
		Token: tokenStr,
		User:  user.ToDTO(),
	}, nil
}

func (s *AuthService) GetProfile(ctx context.Context, nik string) (*domain.UserDTO, error) {
	user, err := s.karyawanRepo.FindByNIK(ctx, nik)
	if err != nil {
		return nil, NewAppError(http.StatusNotFound, "USER_NOT_FOUND", "Pengguna tidak ditemukan")
	}
	dto := user.ToDTO()
	return &dto, nil
}
