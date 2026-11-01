package service

import (
	"context"
	"os"
	"testing"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/repository/memory"
)

func TestPresensiService_PunchAttendance(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "test_uploads_*")
	if err != nil {
		t.Fatalf("Gagal membuat direktori temporary: %v", err)
	}
	defer os.RemoveAll(tempDir)

	store := memory.NewMemoryStore()
	karyawanRepo := memory.NewMemoryKaryawanRepository(store)
	lokasiRepo := memory.NewMemoryLokasiRepository(store)
	presensiRepo := memory.NewMemoryPresensiRepository(store)

	svc := NewPresensiService(presensiRepo, karyawanRepo, lokasiRepo, tempDir)

	ctx := context.Background()
	nik := "F5512530112" // Dian Abdillah, Lokasi 1 (Palu), belum ada log presensi masuk hari ini

	dummyPhoto := []byte("fake-jpeg-photo-content")

	// 1. Skenario presensi di LUAR radius geofence (di Jakarta)
	outOfGeofenceReq := domain.PunchRequest{
		Jenis:     domain.JenisMasuk,
		Latitude:  -6.2088000,
		Longitude: 106.8456000,
	}
	_, err = svc.PunchAttendance(ctx, nik, outOfGeofenceReq, dummyPhoto, "selfie.jpg")
	if err == nil {
		t.Fatal("Ekspektasi presensi di luar radius ditolak, tetapi berhasil")
	}
	appErr, ok := err.(*AppError)
	if !ok || appErr.Code != "OUT_OF_GEOFENCE" {
		t.Errorf("Ekspektasi error OUT_OF_GEOFENCE, didapat: %v", err)
	}

	// 2. Skenario presensi di DALAM radius kantor (~15 meter dari kantor Palu)
	inGeofenceReq := domain.PunchRequest{
		Jenis:     domain.JenisMasuk,
		Latitude:  -0.8918000,
		Longitude: 119.8872000,
	}
	resp, err := svc.PunchAttendance(ctx, nik, inGeofenceReq, dummyPhoto, "selfie.jpg")
	if err != nil {
		t.Fatalf("Presensi di dalam radius kantor gagal: %v", err)
	}
	if resp.IDPresensi == 0 || resp.JenisPresensi != domain.JenisMasuk {
		t.Errorf("Respons punch tidak sesuai: %+v", resp)
	}

	// 3. Skenario presensi ganda di hari yang sama (sudah absen masuk)
	_, errDouble := svc.PunchAttendance(ctx, nik, inGeofenceReq, dummyPhoto, "selfie2.jpg")
	if errDouble == nil {
		t.Fatal("Ekspektasi presensi ganda ditolak, tetapi berhasil")
	}
	doubleErr, ok := errDouble.(*AppError)
	if !ok || doubleErr.Code != "ALREADY_CHECKED_IN" {
		t.Errorf("Ekspektasi error ALREADY_CHECKED_IN, didapat: %v", errDouble)
	}
}

func TestPresensiService_EvaluateAttendanceStatus(t *testing.T) {
	svc := &PresensiService{}

	// Jadwal 08:00:00 -> Toleransi s/d 08:15:00
	// 08:05:00 -> TEPAT_WAKTU
	st1 := svc.evaluateAttendanceStatus(domain.JenisMasuk, "08:05:00", "08:00:00", "17:00:00")
	if st1 != domain.StatusTepatWaktu {
		t.Errorf("08:05:00 harus TEPAT_WAKTU, dapat: %s", st1)
	}

	// 08:15:00 -> TEPAT_WAKTU (batas toleransi pas 15 menit)
	st2 := svc.evaluateAttendanceStatus(domain.JenisMasuk, "08:15:00", "08:00:00", "17:00:00")
	if st2 != domain.StatusTepatWaktu {
		t.Errorf("08:15:00 harus TEPAT_WAKTU, dapat: %s", st2)
	}

	// 08:16:00 -> TERLAMBAT
	st3 := svc.evaluateAttendanceStatus(domain.JenisMasuk, "08:16:00", "08:00:00", "17:00:00")
	if st3 != domain.StatusTerlambat {
		t.Errorf("08:16:00 harus TERLAMBAT, dapat: %s", st3)
	}

	// Pulang 16:45:00 -> PULANG_CEPAT (jadwal 17:00:00)
	st4 := svc.evaluateAttendanceStatus(domain.JenisPulang, "16:45:00", "08:00:00", "17:00:00")
	if st4 != domain.StatusPulangCepat {
		t.Errorf("16:45:00 harus PULANG_CEPAT, dapat: %s", st4)
	}

	// Pulang 17:05:00 -> PULANG_NORMAL
	st5 := svc.evaluateAttendanceStatus(domain.JenisPulang, "17:05:00", "08:00:00", "17:00:00")
	if st5 != domain.StatusPulangNormal {
		t.Errorf("17:05:00 harus PULANG_NORMAL, dapat: %s", st5)
	}
}

func TestPresensiService_CalculateWorkDuration(t *testing.T) {
	// 1. Kasus 08:04:00 s/d 16:28:00 -> 8 Jam 24 Menit
	text1, mins1 := CalculateWorkDuration("08:04:00", "16:28:00")
	if text1 != "8 Jam 24 Menit" || mins1 != 504 {
		t.Errorf("Ekspektasi '8 Jam 24 Menit' (504m), dapat '%s' (%dm)", text1, mins1)
	}

	// 2. Kasus 08:00:00 s/d 17:00:00 -> 9 Jam 0 Menit
	text2, mins2 := CalculateWorkDuration("08:00:00", "17:00:00")
	if text2 != "9 Jam 0 Menit" || mins2 != 540 {
		t.Errorf("Ekspektasi '9 Jam 0 Menit' (540m), dapat '%s' (%dm)", text2, mins2)
	}

	// 3. Normalisasi format dengan suffix zona waktu
	text3, _ := CalculateWorkDuration("08:30:00 WITA", "17:45:00 WITA")
	if text3 != "9 Jam 15 Menit" {
		t.Errorf("Ekspektasi '9 Jam 15 Menit', dapat '%s'", text3)
	}
}

func TestPresensiService_PunchPulangAndLifecycle(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "test_uploads_pulang_*")
	if err != nil {
		t.Fatalf("Gagal membuat temporary dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	store := memory.NewMemoryStore()
	karyawanRepo := memory.NewMemoryKaryawanRepository(store)
	lokasiRepo := memory.NewMemoryLokasiRepository(store)
	presensiRepo := memory.NewMemoryPresensiRepository(store)

	svc := NewPresensiService(presensiRepo, karyawanRepo, lokasiRepo, tempDir)
	ctx := context.Background()
	nik := "F5512530112" // Dian Abdillah (Lokasi Palu)
	dummyPhoto := []byte("fake-photo-data")

	inGeofenceReq := domain.PunchRequest{
		Jenis:     domain.JenisPulang,
		Latitude:  -0.8918000,
		Longitude: 119.8872000,
	}

	// 1. Mencoba PULANG sebelum MASUK -> Harus ditolak (CHECK_IN_REQUIRED)
	_, err = svc.PunchAttendance(ctx, nik, inGeofenceReq, dummyPhoto, "pulang1.jpg")
	if err == nil {
		t.Fatal("Ekspektasi pulang sebelum masuk ditolak, tapi berhasil")
	}
	appErr, ok := err.(*AppError)
	if !ok || appErr.Code != "CHECK_IN_REQUIRED" {
		t.Errorf("Ekspektasi error CHECK_IN_REQUIRED, didapat: %v", err)
	}

	// 2. Lakukan presensi MASUK
	masukReq := domain.PunchRequest{
		Jenis:     domain.JenisMasuk,
		Latitude:  -0.8918000,
		Longitude: 119.8872000,
	}
	respMasuk, err := svc.PunchAttendance(ctx, nik, masukReq, dummyPhoto, "masuk.jpg")
	if err != nil {
		t.Fatalf("Presensi masuk gagal: %v", err)
	}
	if respMasuk.JenisPresensi != domain.JenisMasuk {
		t.Errorf("Ekspektasi MASUK, dapat: %s", respMasuk.JenisPresensi)
	}

	// 3. Lakukan presensi PULANG
	pulangReq := domain.PunchRequest{
		Jenis:     domain.JenisPulang,
		Latitude:  -0.8918000,
		Longitude: 119.8872000,
	}
	respPulang, err := svc.PunchAttendance(ctx, nik, pulangReq, dummyPhoto, "pulang.jpg")
	if err != nil {
		t.Fatalf("Presensi pulang gagal: %v", err)
	}
	if respPulang.JenisPresensi != domain.JenisPulang {
		t.Errorf("Ekspektasi PULANG, dapat: %s", respPulang.JenisPresensi)
	}

	// 4. Verifikasi GetTodayAttendance mengembalikan status lengkap & kalkulasi TotalJamKerja
	todayAtt, err := svc.GetTodayAttendance(ctx, nik)
	if err != nil {
		t.Fatalf("GetTodayAttendance gagal: %v", err)
	}
	if !todayAtt.SudahMasuk || !todayAtt.SudahPulang {
		t.Errorf("Ekspektasi SudahMasuk && SudahPulang true, dapat: %+v", todayAtt)
	}
	if todayAtt.TotalJamKerja == "" {
		t.Errorf("TotalJamKerja tidak boleh kosong jika sudah masuk & pulang")
	}

	// 5. Presensi PULANG kedua kali pada hari sama -> Harus ditolak (ALREADY_CHECKED_OUT)
	_, errDoublePulang := svc.PunchAttendance(ctx, nik, pulangReq, dummyPhoto, "pulang_double.jpg")
	if errDoublePulang == nil {
		t.Fatal("Ekspektasi presensi pulang ganda ditolak, tapi berhasil")
	}
	doubleErr, ok := errDoublePulang.(*AppError)
	if !ok || doubleErr.Code != "ALREADY_CHECKED_OUT" {
		t.Errorf("Ekspektasi error ALREADY_CHECKED_OUT, didapat: %v", errDoublePulang)
	}
}
