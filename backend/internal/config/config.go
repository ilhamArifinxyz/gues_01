package config

import (
	"os"
)

// Config menampung seluruh variabel konfigurasi backend.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	UploadDir   string
	BaseURL     string
}

// LoadConfig memuat konfigurasi dari environment variables dengan nilai default yang aman.
func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/absensi_db?sslmode=disable")
	jwtSecret := getEnv("JWT_SECRET", "absensi-secret-key-k10-rpl-2026-very-secure")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	baseURL := getEnv("BASE_URL", "http://localhost:"+port)

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		UploadDir:   uploadDir,
		BaseURL:     baseURL,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
