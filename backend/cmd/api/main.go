package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"absensi-backend/internal/config"
	"absensi-backend/internal/handler"
	customMiddleware "absensi-backend/internal/middleware"
	"absensi-backend/internal/repository"
	"absensi-backend/internal/repository/memory"
	"absensi-backend/internal/repository/postgres"
	"absensi-backend/internal/service"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// 1. Memuat konfigurasi aplikasi
	cfg := config.LoadConfig()

	// Pastikan direktori uploads tersedia
	_ = os.MkdirAll(filepath.Join(cfg.UploadDir, "selfies"), 0755)
	_ = os.MkdirAll(filepath.Join(cfg.UploadDir, "leaves"), 0755)

	log.Printf("[INFO] Memulai Sistem Manajemen Absensi Backend pada port %s...", cfg.Port)

	// 2. Inisialisasi Database dengan Graceful Fallback
	var (
		karyawanRepo repository.KaryawanRepository
		lokasiRepo   repository.LokasiRepository
		presensiRepo repository.PresensiRepository
		izinRepo     repository.IzinRepository
		pgPool       *pgxpool.Pool
	)

	ctxTimeout, cancelTimeout := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancelTimeout()

	pool, err := pgxpool.New(ctxTimeout, cfg.DatabaseURL)
	if err == nil && pool.Ping(ctxTimeout) == nil {
		pgPool = pool
		defer pgPool.Close()
		log.Println("[INFO] Terhubung sukses ke basis data PostgreSQL.")
		karyawanRepo = postgres.NewKaryawanRepository(pgPool)
		lokasiRepo = postgres.NewLokasiRepository(pgPool)
		presensiRepo = postgres.NewPresensiRepository(pgPool)
		izinRepo = postgres.NewIzinRepository(pgPool)
	} else {
		log.Printf("[WARN] Basis data PostgreSQL belum terhubung (%v).", err)
		log.Println("[INFO] Mengaktifkan In-Memory Mock Repository dengan data seeder otomatis (Mode Standalone/Demo Siap Uji).")
		memStore := memory.NewMemoryStore()
		karyawanRepo = memory.NewMemoryKaryawanRepository(memStore)
		lokasiRepo = memory.NewMemoryLokasiRepository(memStore)
		presensiRepo = memory.NewMemoryPresensiRepository(memStore)
		izinRepo = memory.NewMemoryIzinRepository(memStore)
	}

	// 3. Inisialisasi Layer Service
	authService := service.NewAuthService(karyawanRepo, cfg.JWTSecret)
	presensiService := service.NewPresensiService(presensiRepo, karyawanRepo, lokasiRepo, cfg.UploadDir)
	izinService := service.NewIzinService(izinRepo, cfg.UploadDir)
	reportService := service.NewReportService(presensiRepo, karyawanRepo, izinRepo)

	// 4. Inisialisasi Layer Handler (Controller)
	authHandler := handler.NewAuthHandler(authService)
	presensiHandler := handler.NewPresensiHandler(presensiService)
	izinHandler := handler.NewIzinHandler(izinService)
	adminHandler := handler.NewAdminHandler(karyawanRepo, lokasiRepo, reportService, izinService)

	// 5. Inisialisasi Router Chi & Middleware
	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// Pengaturan CORS untuk akses peramban dari frontend Vite/React
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Static File Server untuk berkas unggahan bukti kehadiran & dokumen izin
	uploadPath, _ := filepath.Abs(cfg.UploadDir)
	fileServer(r, "/uploads", http.Dir(uploadPath))

	// Health Check Endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		handler.WriteJSON(w, http.StatusOK, true, "Sistem Absensi Backend aktif dan sehat", map[string]interface{}{
			"time":    time.Now().Format(time.RFC3339),
			"version": "1.0.0",
		})
	})

	// Registrasi Rute REST API v1
	r.Route("/api/v1", func(v1 chi.Router) {
		// Public Auth
		v1.Post("/auth/login", authHandler.Login)

		// Protected Routes (Memerlukan JWT Bearer Token)
		v1.Group(func(protected chi.Router) {
			protected.Use(customMiddleware.AuthMiddleware(cfg.JWTSecret))

			// Profil Pengguna Login
			protected.Get("/auth/me", authHandler.GetMe)

			// Modul Presensi Karyawan
			protected.Route("/attendance", func(att chi.Router) {
				att.Post("/punch", presensiHandler.Punch)
				att.Get("/today", presensiHandler.GetToday)
				att.Get("/my-history", presensiHandler.GetMyHistory)
			})

			// Modul Pengajuan Izin Karyawan
			protected.Route("/leaves", func(l chi.Router) {
				l.Post("/", izinHandler.Submit)
				l.Get("/my", izinHandler.GetMyLeaves)
			})

			// Modul Khusus Hak Akses Admin HRD
			protected.Group(func(admin chi.Router) {
				admin.Use(customMiddleware.RequireRole("ADMIN"))

				admin.Route("/admin", func(a chi.Router) {
					// Manajemen Karyawan
					a.Get("/employees", adminHandler.GetEmployees)
					a.Post("/employees", adminHandler.CreateEmployee)
					a.Put("/employees/{nik}", adminHandler.UpdateEmployee)

					// Titik Lokasi Geofencing Kantor
					a.Get("/locations", adminHandler.GetLocations)
					a.Post("/locations", adminHandler.CreateLocation)
					a.Put("/locations/{id}", adminHandler.UpdateLocation)

					// Rekapitulasi Presensi & Koreksi Audit Log
					a.Get("/attendance/recap", adminHandler.GetAttendanceRecap)
					a.Patch("/attendance/{id}/correct", adminHandler.CorrectAttendance)
					a.Get("/attendance/export/csv", adminHandler.ExportCSV)

					// Persetujuan Izin Karyawan
					a.Get("/leaves", adminHandler.GetLeaves)
					a.Patch("/leaves/{id}/review", adminHandler.ReviewLeave)
				})
			})
		})
	})

	// 6. Jalankan HTTP Server dengan Graceful Shutdown
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[INFO] Server HTTP mendengarkan di http://localhost:%s\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] Gagal menyalakan server: %v", err)
		}
	}()

	// Menunggu sinyal interupsi sistem operasi untuk pematian server yang aman
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Menerima sinyal pematian. Mematikan server secara graceful...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[FATAL] Server dipaksa berhenti: %v", err)
	}

	log.Println("[INFO] Server backend telah berhenti secara tertib.")
}

// fileServer melayani berkas direktori lokal secara aman via HTTP Chi Router.
func fileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", http.StatusMovedPermanently).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
		fs.ServeHTTP(w, r)
	})
}
