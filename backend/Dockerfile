# =====================================================================
# TAHAP 5 DEPLOYMENT - DOCKERFILE BACKEND (GOLANG CHI REST API)
# Multi-stage build: golang:1.22-alpine -> alpine:latest
# Binary ringan < 25MB, User Non-Root demi keamanan produksi
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: Build stage
# ---------------------------------------------------------------------
FROM golang:1.22-alpine AS builder

# Pasang dependency untuk build
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Optimasi caching: salin file dependensi modul terlebih dahulu
COPY go.mod go.sum ./
RUN go mod download

# Salin seluruh kode sumber backend
COPY . .

# Kompilasi binary Go Chi untuk arsitektur Linux x86_64
# Parameter:
# - CGO_ENABLED=0 (statically linked, tidak membutuhkan glibc eksternal)
# - -ldflags="-s -w" (menghapus tabel simbol & debugging info untuk memperkecil ukuran)
# - -trimpath (menghapus path direktori lokal pada binary)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -extldflags '-static'" \
    -trimpath \
    -o /app/bin/api ./cmd/api

# ---------------------------------------------------------------------
# Stage 2: Runtime stage
# ---------------------------------------------------------------------
FROM alpine:latest AS runner

# Metadata image
LABEL maintainer="Kelompok 10 RPL - Universitas Tadulako" \
      project="Sistem Manajemen Absensi Berbasis Web" \
      component="backend-api" \
      version="1.0.0"

WORKDIR /app

# Pasang runtime dependencies: SSL CA certificates & zona waktu WITA
RUN apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Makassar /etc/localtime && \
    echo "Asia/Makassar" > /etc/timezone

# Terapkan prinsip Least Privilege dengan akun non-root (appuser)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Buat direktori penyimpanan berkas unggahan bukti presensi & izin
RUN mkdir -p /app/uploads/selfies /app/uploads/leaves && \
    chown -R appuser:appgroup /app

# Salin executable binary dari builder stage
COPY --from=builder --chown=appuser:appgroup /app/bin/api /app/api

# Beralih ke user non-root
USER appuser

# Expose port REST API backend
EXPOSE 8080

# Environment variables default runtime
ENV PORT=8080 \
    DATABASE_URL=postgres://postgres:postgres@postgres:5432/absensi_db?sslmode=disable \
    JWT_SECRET=absensi-secret-key-k10-rpl-2026-very-secure \
    UPLOAD_DIR=/app/uploads \
    BASE_URL=http://localhost:8080 \
    TZ=Asia/Makassar

# Healthcheck endpoint Go Chi (/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Eksekusi server REST API
ENTRYPOINT ["/app/api"]
