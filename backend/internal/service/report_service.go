package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/repository"
)

type ReportService struct {
	presensiRepo repository.PresensiRepository
	karyawanRepo repository.KaryawanRepository
	izinRepo     repository.IzinRepository
}

func NewReportService(
	presensiRepo repository.PresensiRepository,
	karyawanRepo repository.KaryawanRepository,
	izinRepo repository.IzinRepository,
) *ReportService {
	return &ReportService{
		presensiRepo: presensiRepo,
		karyawanRepo: karyawanRepo,
		izinRepo:     izinRepo,
	}
}

// GetAttendanceRecap menyajikan data rekapitulasi presensi beserta ringkasan metrik statistik harian.
func (s *ReportService) GetAttendanceRecap(
	ctx context.Context,
	startDate, endDate, idLokasi, search string,
) (*domain.AttendanceSummary, []domain.RekapItem, error) {
	records, err := s.presensiRepo.FindRecap(ctx, startDate, endDate, idLokasi, search)
	if err != nil {
		return nil, nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal memuat rekapitulasi data presensi")
	}
	if records == nil {
		records = []domain.RekapItem{}
	}

	today := time.Now().Format("2006-01-02")
	totalKaryawan, _ := s.karyawanRepo.CountActive(ctx)
	totalHadir, tepatWaktu, terlambat, _ := s.presensiRepo.CountTodayStats(ctx, today)
	totalIzinSakit, _ := s.izinRepo.CountActiveToday(ctx, today)

	totalAlpha := totalKaryawan - (totalHadir + totalIzinSakit)
	if totalAlpha < 0 {
		totalAlpha = 0
	}

	summary := &domain.AttendanceSummary{
		TotalKaryawan:   totalKaryawan,
		TotalHadir:      totalHadir,
		TotalTepatWaktu: tepatWaktu,
		TotalTerlambat:  terlambat,
		TotalIzinSakit:  totalIzinSakit,
		TotalAlpha:      totalAlpha,
	}

	return summary, records, nil
}

// CorrectAttendance melakukan audit trail koreksi status presensi oleh Admin.
func (s *ReportService) CorrectAttendance(
	ctx context.Context,
	id int64,
	adminNIK string,
	req domain.CorrectAttendanceRequest,
) error {
	existing, err := s.presensiRepo.FindByID(ctx, id)
	if err != nil {
		return NewAppError(http.StatusNotFound, "ATTENDANCE_NOT_FOUND", "Data presensi tidak ditemukan")
	}
	if existing == nil {
		return NewAppError(http.StatusNotFound, "ATTENDANCE_NOT_FOUND", "Data presensi tidak ditemukan")
	}

	now := time.Now()
	if err := s.presensiRepo.UpdateCorrection(ctx, id, req.StatusKehadiran, req.CatatanKoreksi, adminNIK, now); err != nil {
		return NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal melakukan pembaruan koreksi presensi")
	}
	return nil
}

// GenerateCSV mengekspor catatan rekapitulasi presensi ke dalam format CSV berstandar UTF-8 Excel.
func (s *ReportService) GenerateCSV(
	ctx context.Context,
	startDate, endDate, idLokasi, search string,
) ([]byte, error) {
	records, err := s.presensiRepo.FindRecap(ctx, startDate, endDate, idLokasi, search)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal mengambil data untuk ekspor laporan")
	}

	var buf bytes.Buffer
	// Tulis UTF-8 Byte Order Mark (BOM) agar karakter aksen & format di Microsoft Excel terbaca sempurna
	buf.WriteString("\xEF\xBB\xBF")

	writer := csv.NewWriter(&buf)

	// Header Kolom
	headers := []string{
		"No",
		"ID Presensi",
		"Tanggal",
		"Jam",
		"NIK",
		"Nama Karyawan",
		"Jabatan",
		"Lokasi Kantor",
		"Jenis Presensi",
		"Status Kehadiran",
		"Jarak (Meter)",
		"Tautan Foto",
		"Dikoreksi Oleh",
		"Waktu Koreksi",
		"Catatan Koreksi",
	}
	if err := writer.Write(headers); err != nil {
		return nil, err
	}

	for idx, item := range records {
		waktuUpdateStr := ""
		if item.WaktuUpdate != nil {
			waktuUpdateStr = item.WaktuUpdate.Format("2006-01-02 15:04:05")
		}
		diupdateOlehStr := ""
		if item.DiupdateOleh != nil {
			diupdateOlehStr = *item.DiupdateOleh
		}
		catatanKoreksiStr := ""
		if item.CatatanKoreksi != nil {
			catatanKoreksiStr = *item.CatatanKoreksi
		}

		row := []string{
			fmt.Sprintf("%d", idx+1),
			fmt.Sprintf("%d", item.IDPresensi),
			item.Tanggal,
			item.Jam,
			item.NIK,
			item.NamaKaryawan,
			item.Jabatan,
			item.NamaKantor,
			item.JenisPresensi,
			item.StatusKehadiran,
			fmt.Sprintf("%.2f", item.JarakMeter),
			item.URLFoto,
			diupdateOlehStr,
			waktuUpdateStr,
			catatanKoreksiStr,
		}
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
