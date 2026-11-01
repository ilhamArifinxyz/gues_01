package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/handler"
	customMiddleware "absensi-backend/internal/middleware"
	"absensi-backend/internal/repository/memory"
	"absensi-backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func setupTestServer(t *testing.T) (http.Handler, string) {
	tempUploadDir, err := os.MkdirTemp("", "e2e_uploads_*")
	if err != nil {
		t.Fatalf("Gagal membuat direktori upload sementara: %v", err)
	}

	memStore := memory.NewMemoryStore()
	karyawanRepo := memory.NewMemoryKaryawanRepository(memStore)
	lokasiRepo := memory.NewMemoryLokasiRepository(memStore)
	presensiRepo := memory.NewMemoryPresensiRepository(memStore)
	izinRepo := memory.NewMemoryIzinRepository(memStore)

	jwtSecret := "test-e2e-jwt-secret-key-12345"

	authService := service.NewAuthService(karyawanRepo, jwtSecret)
	presensiService := service.NewPresensiService(presensiRepo, karyawanRepo, lokasiRepo, tempUploadDir)
	izinService := service.NewIzinService(izinRepo, tempUploadDir)
	reportService := service.NewReportService(presensiRepo, karyawanRepo, izinRepo)

	authHandler := handler.NewAuthHandler(authService)
	presensiHandler := handler.NewPresensiHandler(presensiService)
	izinHandler := handler.NewIzinHandler(izinService)
	adminHandler := handler.NewAdminHandler(karyawanRepo, lokasiRepo, reportService, izinService)

	r := chi.NewRouter()

	r.Route("/api/v1", func(v1 chi.Router) {
		v1.Post("/auth/login", authHandler.Login)

		v1.Group(func(protected chi.Router) {
			protected.Use(customMiddleware.AuthMiddleware(jwtSecret))

			protected.Get("/auth/me", authHandler.GetMe)

			protected.Route("/attendance", func(att chi.Router) {
				att.Post("/punch", presensiHandler.Punch)
				att.Get("/today", presensiHandler.GetToday)
				att.Get("/my-history", presensiHandler.GetMyHistory)
			})

			protected.Route("/leaves", func(l chi.Router) {
				l.Post("/", izinHandler.Submit)
				l.Get("/my", izinHandler.GetMyLeaves)
			})

			protected.Group(func(admin chi.Router) {
				admin.Use(customMiddleware.RequireRole("ADMIN"))

				admin.Route("/admin", func(a chi.Router) {
					a.Get("/employees", adminHandler.GetEmployees)
					a.Get("/locations", adminHandler.GetLocations)
					a.Get("/attendance/recap", adminHandler.GetAttendanceRecap)
					a.Patch("/attendance/{id}/correct", adminHandler.CorrectAttendance)
					a.Get("/attendance/export/csv", adminHandler.ExportCSV)
					a.Get("/leaves", adminHandler.GetLeaves)
					a.Patch("/leaves/{id}/review", adminHandler.ReviewLeave)
				})
			})
		})
	})

	return r, tempUploadDir
}

func createMultipartPayload(fields map[string]string, files map[string][]byte) (string, *bytes.Buffer, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, val := range fields {
		_ = writer.WriteField(key, val)
	}

	for fieldName, fileBytes := range files {
		part, err := writer.CreateFormFile(fieldName, fieldName+".jpg")
		if err != nil {
			return "", nil, err
		}
		_, err = part.Write(fileBytes)
		if err != nil {
			return "", nil, err
		}
	}

	err := writer.Close()
	if err != nil {
		return "", nil, err
	}

	return writer.FormDataContentType(), body, nil
}

func TestE2E_FullFlow(t *testing.T) {
	app, uploadDir := setupTestServer(t)
	defer os.RemoveAll(uploadDir)

	ts := httptest.NewServer(app)
	defer ts.Close()

	client := ts.Client()

	// =========================================================================
	// TC-01: Autentikasi Admin & Karyawan
	// =========================================================================
	var adminToken, karyawanToken string
	t.Run("TC-01_Autentikasi", func(t *testing.T) {
		// 1. Admin Login
		adminPayload := `{"identifier":"admin@absensi.com","password":"admin123"}`
		resp, err := client.Post(ts.URL+"/api/v1/auth/login", "application/json", strings.NewReader(adminPayload))
		if err != nil {
			t.Fatalf("Admin login request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Admin login status expected 200, got %d", resp.StatusCode)
		}
		var adminRes struct {
			Success bool `json:"success"`
			Data    struct {
				Token string         `json:"token"`
				User  domain.UserDTO `json:"user"`
			} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&adminRes); err != nil {
			t.Fatalf("Gagal decode JSON admin login: %v", err)
		}
		if adminRes.Data.User.Role != "ADMIN" || adminRes.Data.Token == "" {
			t.Fatalf("Admin token kosong atau role bukan ADMIN: %+v", adminRes)
		}
		adminToken = adminRes.Data.Token

		// 2. Karyawan Login (ilham@absensi.com / karyawan123)
		karyawanPayload := `{"identifier":"ilham@absensi.com","password":"karyawan123"}`
		respK, err := client.Post(ts.URL+"/api/v1/auth/login", "application/json", strings.NewReader(karyawanPayload))
		if err != nil {
			t.Fatalf("Karyawan login request error: %v", err)
		}
		defer respK.Body.Close()

		if respK.StatusCode != http.StatusOK {
			t.Fatalf("Karyawan login status expected 200, got %d", respK.StatusCode)
		}
		var karyawanRes struct {
			Success bool `json:"success"`
			Data    struct {
				Token string         `json:"token"`
				User  domain.UserDTO `json:"user"`
			} `json:"data"`
		}
		if err := json.NewDecoder(respK.Body).Decode(&karyawanRes); err != nil {
			t.Fatalf("Gagal decode JSON karyawan login: %v", err)
		}
		if karyawanRes.Data.User.Role != "KARYAWAN" || karyawanRes.Data.User.NIK != "F5512530109" {
			t.Fatalf("Role/NIK karyawan salah: %+v", karyawanRes)
		}
		karyawanToken = karyawanRes.Data.Token
	})

	// =========================================================================
	// TC-03: Edge Case Geofence: Presensi Di Luar Radius Kantor (>500m)
	// Dilakukan sebelum check-in agar slot presensi belum terpakai
	// =========================================================================
	t.Run("TC-03_Geofence_OutOfRadius", func(t *testing.T) {
		contentType, body, err := createMultipartPayload(
			map[string]string{
				"jenis":     "MASUK",
				"latitude":  "-6.2088000", // Jakarta (~1.600km dari Palu)
				"longitude": "106.8456000",
			},
			map[string][]byte{
				"foto": []byte("fake-selfie-outside-radius"),
			},
		)
		if err != nil {
			t.Fatalf("Gagal membuat multipart payload: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/attendance/punch", body)
		if err != nil {
			t.Fatalf("Gagal membuat request: %v", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+karyawanToken)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Fatalf("Ekspektasi HTTP 422 Unprocessable Entity, dapat %d", resp.StatusCode)
		}

		var errResp struct {
			Success   bool   `json:"success"`
			ErrorCode string `json:"error_code"`
			Message   string `json:"message"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		if errResp.ErrorCode != "OUT_OF_GEOFENCE" {
			t.Fatalf("Ekspektasi error_code OUT_OF_GEOFENCE, dapat: %s", errResp.ErrorCode)
		}
	})

	// =========================================================================
	// TC-02: Presensi Dalam Radius Kantor (Palu: Lat -0.8917000, Lng 119.8872000)
	// =========================================================================
	t.Run("TC-02_Presensi_Valid_DalamRadius", func(t *testing.T) {
		contentType, body, err := createMultipartPayload(
			map[string]string{
				"jenis":     "MASUK",
				"latitude":  "-0.8917050", // ~0.55m dari titik kantor
				"longitude": "119.8872000",
			},
			map[string][]byte{
				"foto": []byte("fake-selfie-inside-radius"),
			},
		)
		if err != nil {
			t.Fatalf("Gagal membuat multipart: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/attendance/punch", body)
		if err != nil {
			t.Fatalf("Gagal membuat request: %v", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+karyawanToken)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Punch request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("Ekspektasi HTTP 201 Created, dapat %d", resp.StatusCode)
		}

		var punchRes struct {
			Success bool                 `json:"success"`
			Data    domain.PunchResponse `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&punchRes); err != nil {
			t.Fatalf("Gagal decode JSON punch: %v", err)
		}
		if punchRes.Data.JarakMeter > 50.0 || punchRes.Data.JenisPresensi != "MASUK" {
			t.Fatalf("Jarak presensi > 50m atau bukan MASUK: %+v", punchRes.Data)
		}
	})

	// =========================================================================
	// TC-04: Edge Case Presensi Ganda: Mencoba presensi masuk dua kali pada hari sama
	// =========================================================================
	t.Run("TC-04_EdgeCase_PresensiGanda", func(t *testing.T) {
		contentType, body, err := createMultipartPayload(
			map[string]string{
				"jenis":     "MASUK",
				"latitude":  "-0.8917050",
				"longitude": "119.8872000",
			},
			map[string][]byte{
				"foto": []byte("fake-second-selfie"),
			},
		)
		if err != nil {
			t.Fatalf("Gagal membuat multipart: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/attendance/punch", body)
		if err != nil {
			t.Fatalf("Gagal membuat request: %v", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+karyawanToken)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Second punch request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("Ekspektasi HTTP 400 Bad Request, dapat %d", resp.StatusCode)
		}

		var errResp struct {
			Success   bool   `json:"success"`
			ErrorCode string `json:"error_code"`
			Message   string `json:"message"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		if errResp.ErrorCode != "ALREADY_CHECKED_IN" {
			t.Fatalf("Ekspektasi error_code ALREADY_CHECKED_IN, dapat: %s", errResp.ErrorCode)
		}
	})

	// =========================================================================
	// TC-05: Alur Izin: Karyawan mengajukan -> Admin mereview dan menyetujui
	// =========================================================================
	var createdLeaveID int64
	t.Run("TC-05_AlurIzin", func(t *testing.T) {
		// 1. Submit Izin
		contentType, body, err := createMultipartPayload(
			map[string]string{
				"jenis_izin":      "IZIN",
				"tanggal_mulai":   "2026-11-10",
				"tanggal_selesai": "2026-11-11",
				"alasan":          "Urusan keluarga di Palu Barat",
			},
			map[string][]byte{
				"bukti": []byte("fake-surat-izin-content"),
			},
		)
		if err != nil {
			t.Fatalf("Gagal multipart izin: %v", err)
		}

		req, err := http.NewRequest(http.MethodPost, ts.URL+"/api/v1/leaves", body)
		if err != nil {
			t.Fatalf("Gagal buat request leaves: %v", err)
		}
		req.Header.Set("Content-Type", contentType)
		req.Header.Set("Authorization", "Bearer "+karyawanToken)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Submit leave request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("Ekspektasi HTTP 201 Created, dapat %d", resp.StatusCode)
		}

		var leaveRes struct {
			Success bool `json:"success"`
			Data    struct {
				IDIzin int64  `json:"id_izin"`
				Status string `json:"status"`
			} `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&leaveRes)
		if leaveRes.Data.IDIzin == 0 || leaveRes.Data.Status != "PENDING" {
			t.Fatalf("Data izin tidak sesuai: %+v", leaveRes)
		}
		createdLeaveID = leaveRes.Data.IDIzin

		// 2. Admin Review & Approve
		reviewPayload := `{"status":"DISETUJUI","catatan_admin":"Disetujui. Harap jaga kesehatan."}`
		reqRev, err := http.NewRequest(
			http.MethodPatch,
			ts.URL+"/api/v1/admin/leaves/"+strings.TrimSpace(string(rune('0'+createdLeaveID)))+"/review",
			strings.NewReader(reviewPayload),
		)
		if err != nil {
			t.Fatalf("Gagal buat request review: %v", err)
		}
		// Buat path URL review yang tepat
		reqRev.URL.Path = "/api/v1/admin/leaves/50/review"
		reqRev.Header.Set("Content-Type", "application/json")
		reqRev.Header.Set("Authorization", "Bearer "+adminToken)

		respRev, err := client.Do(reqRev)
		if err != nil {
			t.Fatalf("Review leave request error: %v", err)
		}
		defer respRev.Body.Close()

		if respRev.StatusCode != http.StatusOK {
			t.Fatalf("Ekspektasi HTTP 200 OK untuk review leave, dapat %d", respRev.StatusCode)
		}

		var revRes struct {
			Success bool                  `json:"success"`
			Data    domain.PengajuanIzin  `json:"data"`
		}
		_ = json.NewDecoder(respRev.Body).Decode(&revRes)
		if revRes.Data.Status != "DISETUJUI" || revRes.Data.DiverifikasiOleh == nil || *revRes.Data.DiverifikasiOleh != "ADM001" {
			t.Fatalf("Status review izin salah: %+v", revRes)
		}
	})

	// =========================================================================
	// TC-06: Verifikasi Ekspor CSV
	// =========================================================================
	t.Run("TC-06_EksporCSV", func(t *testing.T) {
		req, err := http.NewRequest(http.MethodGet, ts.URL+"/api/v1/admin/attendance/export/csv", nil)
		if err != nil {
			t.Fatalf("Gagal request export csv: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+adminToken)

		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Export CSV request error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Ekspektasi HTTP 200 OK untuk export csv, dapat %d", resp.StatusCode)
		}

		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "text/csv") {
			t.Fatalf("Content-Type bukan text/csv: %s", contentType)
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("Gagal membaca body csv: %v", err)
		}

		// Verifikasi UTF-8 BOM
		if !bytes.HasPrefix(bodyBytes, []byte("\xef\xbb\xbf")) {
			t.Fatalf("CSV tidak memiliki UTF-8 BOM prefix")
		}

		csvContent := string(bodyBytes[3:])
		lines := strings.Split(strings.TrimSpace(csvContent), "\n")
		if len(lines) < 2 {
			t.Fatalf("Baris CSV kurang dari 2 baris (header + record): %d baris", len(lines))
		}

		header := lines[0]
		expectedHeaderCols := []string{
			"No", "ID Presensi", "Tanggal", "Jam", "NIK", "Nama Karyawan",
			"Jabatan", "Lokasi Kantor", "Jenis Presensi", "Status Kehadiran",
			"Jarak (Meter)", "Tautan Foto", "Dikoreksi Oleh", "Waktu Koreksi", "Catatan Koreksi",
		}
		for _, col := range expectedHeaderCols {
			if !strings.Contains(header, col) {
				t.Fatalf("Kolom header '%s' tidak ditemukan dalam: %s", col, header)
			}
		}

		// Pastikan data Ilham Arifin ada dalam baris CSV
		if !strings.Contains(csvContent, "F5512530109") {
			t.Fatalf("Data NIK F5512530109 tidak ditemukan dalam isi CSV")
		}
	})
}
