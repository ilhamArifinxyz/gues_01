package token

import (
	"testing"
	"time"
)

func TestGenerateAndValidateToken(t *testing.T) {
	secret := "kunci-rahasia-pengujian-jwt-unit-test-123"
	nik := "F5512530109"
	role := "KARYAWAN"
	nama := "Ilham Arifin"
	email := "ilham@absensi.com"

	tokenStr, err := GenerateToken(nik, role, nama, email, secret, 1*time.Hour)
	if err != nil {
		t.Fatalf("Gagal membuat token: %v", err)
	}

	claims, err := ValidateToken(tokenStr, secret)
	if err != nil {
		t.Fatalf("Validasi token valid gagal: %v", err)
	}

	if claims.NIK != nik || claims.Role != role || claims.Nama != nama || claims.Email != email {
		t.Errorf("Isi claims tidak cocok: %+v", claims)
	}

	// Tes token dengan secret salah
	_, errInvalid := ValidateToken(tokenStr, "secret-yang-salah")
	if errInvalid == nil {
		t.Error("Ekspektasi token invalid jika rahasia berbeda, tetapi lolos")
	}
}
