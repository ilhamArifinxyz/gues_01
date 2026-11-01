package handler

import (
	"io"
	"net/http"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/middleware"
	"absensi-backend/internal/service"
)

type IzinHandler struct {
	izinService *service.IzinService
}

func NewIzinHandler(izinService *service.IzinService) *IzinHandler {
	return &IzinHandler{izinService: izinService}
}

// Submit memproses pengajuan izin/sakit karyawan via POST /api/v1/leaves.
func (h *IzinHandler) Submit(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi login diperlukan", nil)
		return
	}

	// Dukung multipart form (maksimal 10MB)
	_ = r.ParseMultipartForm(10 << 20)

	req := domain.LeaveRequest{
		JenisIzin:      r.FormValue("jenis_izin"),
		TanggalMulai:   r.FormValue("tanggal_mulai"),
		TanggalSelesai: r.FormValue("tanggal_selesai"),
		Alasan:         r.FormValue("alasan"),
	}

	var fileBytes []byte
	var filename string

	file, header, err := r.FormFile("bukti")
	if err == nil {
		defer file.Close()
		fileBytes, _ = io.ReadAll(file)
		filename = header.Filename
	}

	res, err := h.izinService.SubmitLeave(r.Context(), user.NIK, req, fileBytes, filename)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, true, "Pengajuan izin berhasil dikirimkan dan menunggu verifikasi Admin", map[string]interface{}{
		"id_izin": res.IDIzin,
		"status":  res.Status,
	})
}

// GetMyLeaves mengambil seluruh daftar pengajuan izin milik karyawan via GET /api/v1/leaves/my.
func (h *IzinHandler) GetMyLeaves(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi login diperlukan", nil)
		return
	}

	leaves, err := h.izinService.GetMyLeaves(r.Context(), user.NIK)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Daftar pengajuan izin berhasil dimuat", leaves)
}
