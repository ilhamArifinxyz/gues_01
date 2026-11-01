package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("token tidak valid atau telah kedaluwarsa")
)

// Claims mendefinisikan payload data dalam token JWT.
type Claims struct {
	NIK   string `json:"nik"`
	Role  string `json:"role"`
	Nama  string `json:"nama"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateToken menerbitkan token JWT baru berdasarkan identitas pengguna.
func GenerateToken(nik, role, nama, email, secret string, duration time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		NIK:   nik,
		Role:  role,
		Nama:  nama,
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   nik,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(duration)),
			Issuer:    "absensi-backend",
		},
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return jwtToken.SignedString([]byte(secret))
}

// ValidateToken memvalidasi keabsahan token JWT dan mengembalikan isian claims-nya.
func ValidateToken(tokenStr, secret string) (*Claims, error) {
	parsedToken, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := parsedToken.Claims.(*Claims)
	if !ok || !parsedToken.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
