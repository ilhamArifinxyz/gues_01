package service

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/repository"
	"absensi-backend/pkg/geo"
)

type PresensiService struct {
	presensiRepo repository.PresensiRepository
	karyawanRepo repository.KaryawanRepository
	lokasiRepo   repository.LokasiRepository
	uploadDir    string
}

func NewPresensiService(
	presensiRepo repository.PresensiRepository,
	karyawanRepo repository.KaryawanRepository,
	lokasiRepo repository.LokasiRepository,
	uploadDir string,
) *PresensiService {
	return &PresensiService{
		presensiRepo: presensiRepo,
		karyawanRepo: karyawanRepo,
		lokasiRepo:   lokasiRepo,
		uploadDir:    uploadDir,
	}
}

// PunchAttendance mengevaluasi koordinat Haversine, keterlambatan waktu, dan menyimpan swafoto presensi.
func (s *PresensiService) PunchAttendance(
	ctx context.Context,
	nik string,
	req domain.PunchRequest,
	photoBytes []byte,
	originalFilename string,
) (*domain.PunchResponse, error) {
	jenis := strings.ToUpper(strings.TrimSpace(req.Jenis))
	if jenis != domain.JenisMasuk && jenis != domain.JenisPulang {
		return nil, NewAppError(http.StatusBadRequest, "INVALID_PRESENCE_TYPE", "Jenis presensi harus 'MASUK' atau 'PULANG'")
	}

	if len(photoBytes) == 0 {
		return nil, NewAppError(http.StatusBadRequest, "PHOTO_REQUIRED", "Foto bukti swafoto kehadiran wajib diunggah")
	}

	// 1. Ambil data karyawan
	karyawan, err := s.karyawanRepo.FindByNIK(ctx, nik)
	if err != nil {
		return nil, NewAppError(http.StatusNotFound, "USER_NOT_FOUND", "Data profil karyawan tidak ditemukan")
	}

	// 2. Ambil data lokasi kantor acuan karyawan
	lokasi, err := s.lokasiRepo.FindByID(ctx, karyawan.IDLokasi)
	if err != nil {
		return nil, NewAppError(http.StatusBadRequest, "LOCATION_NOT_FOUND", "Titik lokasi kantor acuan penugasan tidak valid")
	}

	// 3. Validasi Geofencing menggunakan Haversine Formula
	jarak := geo.CalculateDistance(req.Latitude, req.Longitude, lokasi.Latitude, lokasi.Longitude)
	jarakRounded := math.Round(jarak*100) / 100

	if jarakRounded > float64(lokasi.RadiusMeter) {
		msg := fmt.Sprintf("Presensi ditolak. Anda berada di luar radius kantor (Jarak: %.1f meter, Maksimal: %d meter)",
			jarakRounded, lokasi.RadiusMeter)
		return nil, NewAppError(http.StatusUnprocessableEntity, "OUT_OF_GEOFENCE", msg)
	}

	now := time.Now()
	today := now.Format("2006-01-02")
	jamSekarang := now.Format("15:04:05")

	// 4. Validasi presensi ganda di hari yang sama dan urutan presensi
	todayRecords, err := s.presensiRepo.FindByNIKAndTanggal(ctx, nik, today)
	if err == nil {
		hasMasuk := false
		for _, rec := range todayRecords {
			if rec.JenisPresensi == domain.JenisMasuk {
				hasMasuk = true
			}
			if rec.JenisPresensi == jenis {
				if jenis == domain.JenisMasuk {
					return nil, NewAppError(http.StatusBadRequest, "ALREADY_CHECKED_IN", "Anda telah melakukan presensi masuk untuk hari ini")
				}
				return nil, NewAppError(http.StatusBadRequest, "ALREADY_CHECKED_OUT", "Anda telah melakukan presensi pulang untuk hari ini")
			}
		}
		if jenis == domain.JenisPulang && !hasMasuk {
			return nil, NewAppError(http.StatusBadRequest, "CHECK_IN_REQUIRED", "Anda belum melakukan presensi masuk hari ini")
		}
	} else if jenis == domain.JenisPulang {
		return nil, NewAppError(http.StatusBadRequest, "CHECK_IN_REQUIRED", "Anda belum melakukan presensi masuk hari ini")
	}

	// 5. Evaluasi Toleransi Waktu
	statusKehadiran := s.evaluateAttendanceStatus(jenis, jamSekarang, karyawan.JamMasukJadwal, karyawan.JamPulangJadwal)

	// 6. Simpan Berkas Swafoto ke Direktori Uploads
	selfieSubdir := filepath.Join(s.uploadDir, "selfies")
	if err := os.MkdirAll(selfieSubdir, 0755); err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "STORAGE_ERROR", "Gagal menyiapkan direktori penyimpanan foto")
	}

	ext := filepath.Ext(originalFilename)
	if ext == "" {
		ext = ".jpg"
	}
	timeSlug := now.Format("20060102_150405")
	saveFilename := fmt.Sprintf("presensi_%s_%s%s", nik, timeSlug, ext)
	targetFilePath := filepath.Join(selfieSubdir, saveFilename)

	if err := os.WriteFile(targetFilePath, photoBytes, 0644); err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "STORAGE_ERROR", "Gagal menyimpan berkas foto swafoto")
	}

	urlFoto := fmt.Sprintf("/uploads/selfies/%s", saveFilename)

	// 7. Simpan Log Presensi ke Basis Data
	presensi := domain.LogPresensi{
		NIK:             nik,
		IDLokasi:        lokasi.IDLokasi,
		Tanggal:         today,
		Jam:             jamSekarang,
		JenisPresensi:   jenis,
		StatusKehadiran: statusKehadiran,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
		JarakMeter:      jarakRounded,
		URLFoto:         urlFoto,
	}

	if err := s.presensiRepo.Create(ctx, &presensi); err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DATABASE_ERROR", "Gagal mencatat transaksi presensi ke sistem")
	}

	return &domain.PunchResponse{
		IDPresensi:      presensi.IDPresensi,
		Tanggal:         presensi.Tanggal,
		Jam:             presensi.Jam,
		JenisPresensi:   presensi.JenisPresensi,
		StatusKehadiran: presensi.StatusKehadiran,
		JarakMeter:      presensi.JarakMeter,
		URLFoto:         presensi.URLFoto,
	}, nil
}

// evaluateAttendanceStatus menghitung status ketepatan waktu berdasarkan jadwal kerja dan batas toleransi.
func (s *PresensiService) evaluateAttendanceStatus(jenis, jamAktual, jadwalMasuk, jadwalPulang string) string {
	if jadwalMasuk == "" {
		jadwalMasuk = "08:00:00"
	}
	if jadwalPulang == "" {
		jadwalPulang = "17:00:00"
	}

	// Normalisasi format (bila hanya HH:MM)
	if len(jadwalMasuk) == 5 {
		jadwalMasuk += ":00"
	}
	if len(jadwalPulang) == 5 {
		jadwalPulang += ":00"
	}

	tAktual, err1 := time.Parse("15:04:05", jamAktual)
	tMasuk, err2 := time.Parse("15:04:05", jadwalMasuk)
	tPulang, err3 := time.Parse("15:04:05", jadwalPulang)

	if err1 != nil || err2 != nil || err3 != nil {
		if jenis == domain.JenisMasuk {
			return domain.StatusTepatWaktu
		}
		return domain.StatusPulangNormal
	}

	if jenis == domain.JenisMasuk {
		// Batas toleransi keterlambatan 15 menit
		toleransiMasuk := tMasuk.Add(15 * time.Minute)
		if tAktual.After(toleransiMasuk) {
			return domain.StatusTerlambat
		}
		return domain.StatusTepatWaktu
	}

	// Presensi Pulang: Jika jam aktual sebelum jam pulang jadwal
	if tAktual.Before(tPulang) {
		return domain.StatusPulangCepat
	}
	return domain.StatusPulangNormal
}

// GetTodayAttendance mengambil informasi kehadiran pengguna pada hari ini.
func (s *PresensiService) GetTodayAttendance(ctx context.Context, nik string) (*domain.TodayAttendanceResponse, error) {
	today := time.Now().Format("2006-01-02")
	records, err := s.presensiRepo.FindByNIKAndTanggal(ctx, nik, today)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal memuat status presensi hari ini")
	}

	resp := &domain.TodayAttendanceResponse{
		Tanggal:     today,
		SudahMasuk:  false,
		SudahPulang: false,
	}

	for _, r := range records {
		recCopy := r
		if r.JenisPresensi == domain.JenisMasuk {
			resp.SudahMasuk = true
			resp.Masuk = &recCopy
		} else if r.JenisPresensi == domain.JenisPulang {
			resp.SudahPulang = true
			resp.Pulang = &recCopy
		}
	}

	if resp.SudahMasuk && resp.SudahPulang && resp.Masuk != nil && resp.Pulang != nil {
		durationText, minutes := CalculateWorkDuration(resp.Masuk.Jam, resp.Pulang.Jam)
		resp.TotalJamKerja = durationText
		resp.DurasiMenit = minutes
	}

	return resp, nil
}

// CalculateWorkDuration menghitung durasi waktu kerja efektif antara jam masuk dan jam pulang.
// Mengembalikan teks berformat "X Jam Y Menit" dan total durasi dalam menit.
func CalculateWorkDuration(jamMasuk, jamPulang string) (string, int) {
	cleanMasuk := strings.TrimSpace(jamMasuk)
	if idx := strings.Index(cleanMasuk, " "); idx != -1 {
		cleanMasuk = cleanMasuk[:idx]
	}
	cleanPulang := strings.TrimSpace(jamPulang)
	if idx := strings.Index(cleanPulang, " "); idx != -1 {
		cleanPulang = cleanPulang[:idx]
	}

	if len(cleanMasuk) == 5 {
		cleanMasuk += ":00"
	}
	if len(cleanPulang) == 5 {
		cleanPulang += ":00"
	}

	tMasuk, err1 := time.Parse("15:04:05", cleanMasuk)
	tPulang, err2 := time.Parse("15:04:05", cleanPulang)
	if err1 != nil || err2 != nil {
		return "", 0
	}

	diff := tPulang.Sub(tMasuk)
	if diff < 0 {
		diff += 24 * time.Hour
	}

	totalMinutes := int(diff.Minutes())
	hours := totalMinutes / 60
	minutes := totalMinutes % 60

	return fmt.Sprintf("%d Jam %d Menit", hours, minutes), totalMinutes
}

// GetMyHistory mengambil riwayat kehadiran pengguna berdasarkan filter bulan dan tahun.
func (s *PresensiService) GetMyHistory(ctx context.Context, nik string, month int, year int) ([]domain.LogPresensi, error) {
	records, err := s.presensiRepo.FindHistoryByNIK(ctx, nik, month, year)
	if err != nil {
		return nil, NewAppError(http.StatusInternalServerError, "DB_ERROR", "Gagal mengambil riwayat presensi")
	}
	if records == nil {
		records = []domain.LogPresensi{}
	}
	return records, nil
}
