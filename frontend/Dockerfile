# =====================================================================
# TAHAP 5 DEPLOYMENT - DOCKERFILE FRONTEND (REACT VITE + NGINX)
# Multi-stage build: node:20-alpine -> nginx:alpine
# Menyajikan Single Page Application dengan Reverse Proxy bawaan
# =====================================================================

# ---------------------------------------------------------------------
# Stage 1: Build React SPA dengan Vite
# ---------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Salin dependensi package.json terlebih dahulu untuk pemanfaatan cache Docker
COPY package*.json ./

# Pasang dependensi secara clean dan reproduktif
RUN npm ci

# Salin seluruh berkas kode sumber frontend
COPY . .

# Konfigurasi variabel environment saat build
# Default menggunakan path relatif /api/v1 yang diproxy oleh Nginx ke backend
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Jalankan proses kompilasi aset produksi (output ke folder /app/dist)
RUN npm run build

# ---------------------------------------------------------------------
# Stage 2: Web Server Produksi Nginx
# ---------------------------------------------------------------------
FROM nginx:alpine AS runner

# Label informasi kontainer
LABEL maintainer="Kelompok 10 RPL - Universitas Tadulako" \
      project="Sistem Manajemen Absensi Berbasis Web" \
      component="frontend-web" \
      version="1.0.0"

# Bersihkan konfigurasi default bawaan Nginx dan direktori web root
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Pasang berkas konfigurasi Nginx kustom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin artefak statis hasil kompilasi dari builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Buka akses port 80 dan port 3000 sesuai instruksi arsitektur
EXPOSE 80 3000

# Pemeriksaan kesehatan berkala kontainer Nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Mulai server web Nginx dalam mode non-daemon
CMD ["nginx", "-g", "daemon off;"]
