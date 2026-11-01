package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/middleware"
	"absensi-backend/internal/repository"
	"absensi-backend/internal/service"
	"absensi-backend/pkg/hash"
	"github.com/go-chi/chi/v5"
)

type AdminHandler struct {
	karyawanRepo  repository.KaryawanRepository
	lokasiRepo    repository.LokasiRepository
	reportService *service.ReportService
	izinService   *service.IzinService
}

func NewAdminHandler(
	karyawanRepo repository.KaryawanRepository,
	lokasiRepo repository.LokasiRepository,
	reportService *service.ReportService,
	izinService *service.IzinService,
) *AdminHandler {
	return &AdminHandler{
		karyawanRepo:  karyawanRepo,
		lokasiRepo:    lokasiRepo,
		reportService: reportService,
		izinService:   izinService,
	}
}

// GetEmployees mengambil seluruh data karyawan (GET /api/v1/admin/employees).
func (h *AdminHandler) GetEmployees(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	list, err := h.karyawanRepo.FindAll(r.Context(), search)
	if err != nil {
		WriteError(w, err)
		return
	}

	var dtos []domain.UserDTO
	for _, k := range list {
		dtos = append(dtos, k.ToDTO())
	}
	if dtos == nil {
		dtos = []domain.UserDTO{}
	}

	WriteJSON(w, http.StatusOK, true, "Daftar karyawan berhasil dimuat", dtos)
}

// CreateEmployee mendaftarkan akun karyawan baru (POST /api/v1/admin/employees).
func (h *AdminHandler) CreateEmployee(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateEmployeeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	if req.NIK == "" || req.NamaLengkap == "" || req.Email == "" || req.Password == "" {
		WriteJSON(w, http.StatusBadRequest, false, "NIK, Nama, Email, dan Password wajib diisi", nil)
		return
	}

	pwHash, err := hash.HashPassword(req.Password)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, false, "Gagal mengenkripsi kata sandi", nil)
		return
	}

	if req.Role == "" {
		req.Role = "KARYAWAN"
	}
	if req.JamMasukJadwal == "" {
		req.JamMasukJadwal = "08:00:00"
	}
	if req.JamPulangJadwal == "" {
		req.JamPulangJadwal = "17:00:00"
	}
	if req.IDLokasi == 0 {
		req.IDLokasi = 1
	}

	karyawan := domain.Karyawan{
		NIK:             req.NIK,
		NamaLengkap:     req.NamaLengkap,
		Email:           req.Email,
		PasswordHash:    pwHash,
		NomorTelepon:    req.NomorTelepon,
		Jabatan:         req.Jabatan,
		Role:            req.Role,
		IDLokasi:        req.IDLokasi,
		JamMasukJadwal:  req.JamMasukJadwal,
		JamPulangJadwal: req.JamPulangJadwal,
		StatusAktif:     true,
	}

	if err := h.karyawanRepo.Create(r.Context(), &karyawan); err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, true, "Akun karyawan berhasil didaftarkan", karyawan.ToDTO())
}

// UpdateEmployee memperbarui data profil akun karyawan (PUT /api/v1/admin/employees/{nik}).
func (h *AdminHandler) UpdateEmployee(w http.ResponseWriter, r *http.Request) {
	nik := chi.URLParam(r, "nik")
	if nik == "" {
		WriteJSON(w, http.StatusBadRequest, false, "Parameter NIK diperlukan", nil)
		return
	}

	var req domain.UpdateEmployeeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	existing, err := h.karyawanRepo.FindByNIK(r.Context(), nik)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, false, "Karyawan tidak ditemukan", nil)
		return
	}

	existing.NamaLengkap = req.NamaLengkap
	existing.Email = req.Email
	existing.NomorTelepon = req.NomorTelepon
	existing.Jabatan = req.Jabatan
	existing.Role = req.Role
	existing.IDLokasi = req.IDLokasi
	existing.JamMasukJadwal = req.JamMasukJadwal
	existing.JamPulangJadwal = req.JamPulangJadwal
	existing.StatusAktif = req.StatusAktif

	if req.Password != "" {
		pwHash, err := hash.HashPassword(req.Password)
		if err == nil {
			existing.PasswordHash = pwHash
		}
	}

	if err := h.karyawanRepo.Update(r.Context(), existing); err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Data karyawan berhasil diperbarui", existing.ToDTO())
}

// GetLocations mengambil seluruh daftar titik kantor cabang (GET /api/v1/admin/locations).
func (h *AdminHandler) GetLocations(w http.ResponseWriter, r *http.Request) {
	locations, err := h.lokasiRepo.FindAll(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	if locations == nil {
		locations = []domain.LokasiKantor{}
	}
	WriteJSON(w, http.StatusOK, true, "Daftar lokasi kantor berhasil dimuat", locations)
}

// CreateLocation menambahkan titik lokasi kantor baru (POST /api/v1/admin/locations).
func (h *AdminHandler) CreateLocation(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateLocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	if req.NamaKantor == "" || req.Alamat == "" {
		WriteJSON(w, http.StatusBadRequest, false, "Nama kantor dan alamat wajib diisi", nil)
		return
	}
	if req.RadiusMeter <= 0 {
		req.RadiusMeter = 50
	}

	lokasi := domain.LokasiKantor{
		NamaKantor:  req.NamaKantor,
		Alamat:      req.Alamat,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		RadiusMeter: req.RadiusMeter,
		StatusAktif: true,
	}

	if err := h.lokasiRepo.Create(r.Context(), &lokasi); err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, true, "Lokasi kantor berhasil ditambahkan", lokasi)
}

// UpdateLocation memperbarui koordinat & radius kantor (PUT /api/v1/admin/locations/{id}).
func (h *AdminHandler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "ID lokasi tidak valid", nil)
		return
	}

	var req domain.UpdateLocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	lokasi := domain.LokasiKantor{
		IDLokasi:    id,
		NamaKantor:  req.NamaKantor,
		Alamat:      req.Alamat,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		RadiusMeter: req.RadiusMeter,
		StatusAktif: req.StatusAktif,
	}

	if err := h.lokasiRepo.Update(r.Context(), &lokasi); err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Lokasi kantor berhasil diperbarui", lokasi)
}

// GetAttendanceRecap mengambil ringkasan & log kehadiran seluruh staf (GET /api/v1/admin/attendance/recap).
func (h *AdminHandler) GetAttendanceRecap(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	idLokasi := r.URL.Query().Get("id_lokasi")
	search := r.URL.Query().Get("search")

	summary, records, err := h.reportService.GetAttendanceRecap(r.Context(), startDate, endDate, idLokasi, search)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Rekapitulasi presensi berhasil dimuat", map[string]interface{}{
		"summary": summary,
		"records": records,
	})
}

// CorrectAttendance melakukan koreksi kehadiran staf oleh Admin (PATCH /api/v1/admin/attendance/{id}/correct).
func (h *AdminHandler) CorrectAttendance(w http.ResponseWriter, r *http.Request) {
	adminUser := middleware.GetUserFromContext(r.Context())
	if adminUser == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi admin diperlukan", nil)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "ID presensi tidak valid", nil)
		return
	}

	var req domain.CorrectAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	if req.StatusKehadiran == "" || req.CatatanKoreksi == "" {
		WriteJSON(w, http.StatusBadRequest, false, "Status kehadiran dan alasan/catatan koreksi wajib diisi", nil)
		return
	}

	if err := h.reportService.CorrectAttendance(r.Context(), id, adminUser.NIK, req); err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Koreksi data presensi berhasil disimpan", nil)
}

// ExportCSV mengunduh laporan rekapitulasi presensi dalam berkas CSV (GET /api/v1/admin/attendance/export/csv).
func (h *AdminHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	idLokasi := r.URL.Query().Get("id_lokasi")
	search := r.URL.Query().Get("search")

	csvBytes, err := h.reportService.GenerateCSV(r.Context(), startDate, endDate, idLokasi, search)
	if err != nil {
		WriteError(w, err)
		return
	}

	filename := fmt.Sprintf("rekap_presensi_%s.csv", time.Now().Format("20060102_150405"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csvBytes)
}

// GetLeaves melihat seluruh permohonan izin karyawan (GET /api/v1/admin/leaves).
func (h *AdminHandler) GetLeaves(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	leaves, err := h.izinService.GetAllLeaves(r.Context(), status)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, true, "Daftar pengajuan izin berhasil dimuat", leaves)
}

// ReviewLeave memberi keputusan persetujuan/penolakan izin (PATCH /api/v1/admin/leaves/{id}/review).
func (h *AdminHandler) ReviewLeave(w http.ResponseWriter, r *http.Request) {
	adminUser := middleware.GetUserFromContext(r.Context())
	if adminUser == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Autentikasi admin diperlukan", nil)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "ID permohonan izin tidak valid", nil)
		return
	}

	var req domain.ReviewLeaveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	updated, err := h.izinService.ReviewLeave(r.Context(), id, adminUser.NIK, req)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Verifikasi permohonan izin berhasil disimpan", updated)
}
