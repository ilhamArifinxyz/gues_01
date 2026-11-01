package service

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/repository"
)

type IzinService struct {
	izinRepo  repository.IzinRepository
	uploadDir string
}

func NewIzinService(izinRepo repository.IzinRepository, uploadDir string) *IzinService {
	return &IzinService{
		izinRepo:  izinRepo,
		uploadDir: uploadDir,
	}
}

func (s *IzinService) SubmitLeave(
	ctx context.Context,
	nik string,
	req domain.LeaveRequest,
	fileBytes []byte,
	originalFilename string,
) (*domain.PengajuanIzin, error) {
	jenis := strings.ToUpper(strings.TrimSpace(req.JenisIzin))
	validJenis := map[string]bool{
		domain.JenisIzinIzin:      true,
		domain.JenisIzinSakit:     true,
		domain.JenisIzinTugasLuar: true,
		domain.JenisIzinCuti:      true,
	}
	if !validJenis[jenis] {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_LEAVE_TYPE", "Jenis izin harus berupa IZIN, SAKIT, TUGAS_LUAR, atau CUTI")
	}

	tMulai, errMulai := time.Parse("2006-01-02", strings.TrimSpace(req.TanggalMulai))
	tSelesai, errSelesai := time.Parse("2006-01-02", strings.TrimSpace(req.TanggalSelesai))
	if errMulai != nil || errSelesai != nil {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_DATE_FORMAT", "Format tanggal harus YYYY-MM-DD")
	}

	if tSelesai.Before(tMulai) {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_DATE_RANGE", "Tanggal selesai tidak boleh mendahului tanggal mulai")
	}

	if strings.TrimSpace(req.Alasan) == "" {
		return nil, NewAppError(http.StatusBadRequest, "REASON_REQUIRED", "Uraian alasan ketidakhadiran wajib diisi")
	}

	var urlBukti *string
	if len(fileBytes) > 0 {
		leavesSubdir := filepath.Join(s.uploadDir, "leaves")
		if err := os.MkdirAll(leavesSubdir, 0755); err != nil {
			return nil, NewAppError(http.StatusInternalServerError, "STORAGE_ERROR", "Gagal menyiapkan direktori berkas izin")
		}

		ext := filepath.Ext(originalFilename)
		if ext == "" {
			ext = ".jpg"
		}
		filename := fmt.Sprintf("izin_%s_%s%s", nik, time.Now().Format("20060102_150405"), ext)
		targetPath := filepath.Join(leavesSubdir, filename)

		if err := os.WriteFile(targetPath, fileBytes, 0644); err != nil {
			return nil, NewAppError(http.StatusInternalServerError, "STORAGE_ERROR", "Gagal menyimpan berkas bukti surat izin")
		}

		pathURL := fmt.Sprintf("/uploads/leaves/%s", filename)
		urlBukti = &pathURL
	}

	pengajuan := domain.PengajuanIzin{
		NIK:            nik,
		JenisIzin:      jenis,
		TanggalMulai:   req.TanggalMulai,
		TanggalSelesai: req.TanggalSelesai,
		Alasan:         req.Alasan,
		URLBukti:       urlBukti,
	}

	if err := s.izinRepo.Create(ctx, &pengajuan); err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal menyimpan pengajuan permohonan izin")
	}

	return &pengajuan, nil
}

func (s *IzinService) GetMyLeaves(ctx context.Context, nik string) ([]domain.PengajuanIzin, error) {
	list, err := s.izinRepo.FindByNIK(ctx, nik)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal mengambil daftar pengajuan izin")
	}
	if list == nil {
		list = []domain.PengajuanIzin{}
	}
	return list, nil
}

func (s *IzinService) GetAllLeaves(ctx context.Context, status string) ([]domain.PengajuanIzin, error) {
	cleanStatus := strings.ToUpper(strings.TrimSpace(status))
	list, err := s.izinRepo.FindAll(ctx, cleanStatus)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal memuat antrean izin admin")
	}
	if list == nil {
		list = []domain.PengajuanIzin{}
	}
	return list, nil
}

func (s *IzinService) ReviewLeave(ctx context.Context, id int64, adminNIK string, req domain.ReviewLeaveRequest) (*domain.PengajuanIzin, error) {
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status != domain.StatusIzinDisetujui && status != domain.StatusIzinDitolak {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_REVIEW_STATUS", "Status verifikasi harus 'DISETUJUI' atau 'DITOLAK'")
	}

	existing, err := s.izinRepo.FindByID(ctx, id)
	if err != nil {
		return nil, NewAppError(http.StatusNotFound, "LEAVE_NOT_FOUND", "Data pengajuan izin tidak ditemukan")
	}

	now := time.Now()
	if err := s.izinRepo.UpdateReview(ctx, id, status, req.CatatanAdmin, adminNIK, now); err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal memperbarui status permohonan izin")
	}

	existing.Status = status
	existing.CatatanAdmin = &req.CatatanAdmin
	existing.DiverifikasiOleh = &adminNIK
	existing.WaktuVerifikasi = &now

	return existing, nil
}
