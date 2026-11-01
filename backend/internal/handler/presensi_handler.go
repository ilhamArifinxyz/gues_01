package handler

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/middleware"
	"absensi-backend/internal/service"
)

type PresensiHandler struct {
	presensiService *service.PresensiService
}

func NewPresensiHandler(presensiService *service.PresensiService) *PresensiHandler {
	return &PresensiHandler{presensiService: presensiService}
}

// Punch menangani pencatatan presensi masuk/pulang karyawan via POST /api/v1/attendance/punch.
func (h *PresensiHandler) Punch(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi login diperlukan", nil)
		return
	}

	// Batasi ukuran request multipart maksimal 10MB
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Gagal memproses unggahan formulir", nil)
		return
	}

	jenis := r.FormValue("jenis")
	latStr := r.FormValue("latitude")
	lonStr := r.FormValue("longitude")

	latitude, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Koordinat latitude tidak valid", nil)
		return
	}

	longitude, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Koordinat longitude tidak valid", nil)
		return
	}

	file, header, err := r.FormFile("foto")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Foto bukti swafoto kehadiran ('foto') wajib diunggah", nil)
		return
	}
	defer file.Close()

	photoBytes, err := io.ReadAll(file)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, false, "Gagal membaca berkas swafoto yang diunggah", nil)
		return
	}

	punchReq := domain.PunchRequest{
		Jenis:     jenis,
		Latitude:  latitude,
		Longitude: longitude,
	}

	res, err := h.presensiService.PunchAttendance(r.Context(), user.NIK, punchReq, photoBytes, header.Filename)
	if err != nil {
		WriteError(w, err)
		return
	}

	msg := fmt.Sprintf("Presensi %s berhasil dicatat", strings.ToLower(res.JenisPresensi))
	WriteJSON(w, http.StatusCreated, true, msg, res)
}

// GetToday mengembalikan status presensi pengguna pada hari ini via GET /api/v1/attendance/today.
func (h *PresensiHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi login diperlukan", nil)
		return
	}

	today, err := h.presensiService.GetTodayAttendance(r.Context(), user.NIK)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Status presensi hari ini berhasil dimuat", today)
}

// GetMyHistory mengembalikan daftar riwayat kehadiran pengguna via GET /api/v1/attendance/my-history.
func (h *PresensiHandler) GetMyHistory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi login diperlukan", nil)
		return
	}

	monthStr := r.URL.Query().Get("month")
	yearStr := r.URL.Query().Get("year")

	month, _ := strconv.Atoi(monthStr)
	year, _ := strconv.Atoi(yearStr)

	history, err := h.presensiService.GetMyHistory(r.Context(), user.NIK, month, year)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Riwayat presensi berhasil dimuat", history)
}
