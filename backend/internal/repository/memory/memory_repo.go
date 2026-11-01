package memory

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"

	"absensi-backend/internal/domain"
	"absensi-backend/pkg/hash"
)

type MemoryStore struct {
	mu          sync.RWMutex
	karyawan    map[string]*domain.Karyawan
	lokasi      map[int]*domain.LokasiKantor
	presensi    map[int64]*domain.LogPresensi
	izin        map[int64]*domain.PengajuanIzin
	nextLokasiID int
	nextPresensiID int64
	nextIzinID     int64
}

func NewMemoryStore() *MemoryStore {
	store := &MemoryStore{
		karyawan:       make(map[string]*domain.Karyawan),
		lokasi:         make(map[int]*domain.LokasiKantor),
		presensi:       make(map[int64]*domain.LogPresensi),
		izin:           make(map[int64]*domain.PengajuanIzin),
		nextLokasiID:   3,
		nextPresensiID: 100,
		nextIzinID:     50,
	}
	store.seedData()
	return store
}

func (s *MemoryStore) seedData() {
	now := time.Now()
	today := now.Format("2006-01-02")

	// 1. Lokasi Kantor
	lokasi1 := &domain.LokasiKantor{
		IDLokasi:    1,
		NamaKantor:  "Kantor Cabang Palu (Untad)",
		Alamat:      "Jl. Soekarno-Hatta Km. 9, Palu, Sulawesi Tengah",
		Latitude:    -0.8917000,
		Longitude:   119.8872000,
		RadiusMeter: 50,
		StatusAktif: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	lokasi2 := &domain.LokasiKantor{
		IDLokasi:    2,
		NamaKantor:  "Kantor Pusat Jakarta",
		Alamat:      "Jl. Jend. Sudirman Kav. 25, Jakarta Selatan",
		Latitude:    -6.2088000,
		Longitude:   106.8456000,
		RadiusMeter: 100,
		StatusAktif: true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	s.lokasi[1] = lokasi1
	s.lokasi[2] = lokasi2

	// 2. Karyawan (Password hash)
	adminHash, _ := hash.HashPassword("admin123")
	userHash, _ := hash.HashPassword("karyawan123")

	s.karyawan["ADM001"] = &domain.Karyawan{
		NIK:             "ADM001",
		NamaLengkap:     "Admin HRD Utama",
		Email:           "admin@absensi.com",
		PasswordHash:    adminHash,
		NomorTelepon:    "081234567890",
		Jabatan:         "HRD Lead Manager",
		Role:            "ADMIN",
		IDLokasi:        1,
		JamMasukJadwal:  "08:00:00",
		JamPulangJadwal: "17:00:00",
		StatusAktif:     true,
		NamaKantor:      lokasi1.NamaKantor,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	s.karyawan["F5512530109"] = &domain.Karyawan{
		NIK:             "F5512530109",
		NamaLengkap:     "Ilham Arifin",
		Email:           "ilham@absensi.com",
		PasswordHash:    userHash,
		NomorTelepon:    "082199887766",
		Jabatan:         "Fullstack Developer",
		Role:            "KARYAWAN",
		IDLokasi:        1,
		JamMasukJadwal:  "08:00:00",
		JamPulangJadwal: "17:00:00",
		StatusAktif:     true,
		NamaKantor:      lokasi1.NamaKantor,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	s.karyawan["F5512530110"] = &domain.Karyawan{
		NIK:             "F5512530110",
		NamaLengkap:     "Andiardi",
		Email:           "andiardi@absensi.com",
		PasswordHash:    userHash,
		NomorTelepon:    "082211445566",
		Jabatan:         "Mobile Application Engineer",
		Role:            "KARYAWAN",
		IDLokasi:        1,
		JamMasukJadwal:  "08:00:00",
		JamPulangJadwal: "17:00:00",
		StatusAktif:     true,
		NamaKantor:      lokasi1.NamaKantor,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	s.karyawan["F5512530112"] = &domain.Karyawan{
		NIK:             "F5512530112",
		NamaLengkap:     "Dian Abdillah Melosovic",
		Email:           "dian@absensi.com",
		PasswordHash:    userHash,
		NomorTelepon:    "085233441122",
		Jabatan:         "QA & Test Automation Specialist",
		Role:            "KARYAWAN",
		IDLokasi:        1,
		JamMasukJadwal:  "08:00:00",
		JamPulangJadwal: "17:00:00",
		StatusAktif:     true,
		NamaKantor:      lokasi1.NamaKantor,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// 3. Sample Presensi
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	s.presensi[1] = &domain.LogPresensi{
		IDPresensi:      1,
		NIK:             "F5512530109",
		IDLokasi:        1,
		Tanggal:         yesterday,
		Jam:             "08:04:12",
		JenisPresensi:   domain.JenisMasuk,
		StatusKehadiran: domain.StatusTepatWaktu,
		Latitude:        -0.891710,
		Longitude:       119.887210,
		JarakMeter:      12.5,
		URLFoto:         "/uploads/selfies/sample_ilham.jpg",
		CreatedAt:       now.AddDate(0, 0, -1),
		NamaKaryawan:    "Ilham Arifin",
		Jabatan:         "Fullstack Developer",
		NamaKantor:      lokasi1.NamaKantor,
	}

	s.presensi[2] = &domain.LogPresensi{
		IDPresensi:      2,
		NIK:             "F5512530110",
		IDLokasi:        1,
		Tanggal:         today,
		Jam:             "08:24:05",
		JenisPresensi:   domain.JenisMasuk,
		StatusKehadiran: domain.StatusTerlambat,
		Latitude:        -0.891690,
		Longitude:       119.887190,
		JarakMeter:      24.1,
		URLFoto:         "/uploads/selfies/sample_andiardi.jpg",
		CreatedAt:       now,
		NamaKaryawan:    "Andiardi",
		Jabatan:         "Mobile Application Engineer",
		NamaKantor:      lokasi1.NamaKantor,
	}

	// 4. Sample Izin
	s.izin[1] = &domain.PengajuanIzin{
		IDIzin:         1,
		NIK:            "F5512530112",
		JenisIzin:      domain.JenisIzinSakit,
		TanggalMulai:   today,
		TanggalSelesai: today,
		Alasan:         "Pemeriksaan kesehatan rawat jalan klinik",
		Status:         domain.StatusIzinPending,
		CreatedAt:      now,
		NamaKaryawan:   "Dian Abdillah Melosovic",
		Jabatan:        "QA & Test Automation Specialist",
	}
}

// =================== IMPLEMENTASI KARYAWAN ===================

type MemKaryawanRepo struct {
	store *MemoryStore
}

func NewMemoryKaryawanRepository(store *MemoryStore) *MemKaryawanRepo {
	return &MemKaryawanRepo{store: store}
}

func (r *MemKaryawanRepo) FindByEmailOrNIK(ctx context.Context, identifier string) (*domain.Karyawan, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	cleanID := strings.TrimSpace(identifier)
	for _, k := range r.store.karyawan {
		if strings.EqualFold(k.Email, cleanID) || k.NIK == cleanID {
			cpy := *k
			if loc, ok := r.store.lokasi[k.IDLokasi]; ok {
				cpy.NamaKantor = loc.NamaKantor
			}
			return &cpy, nil
		}
	}
	return nil, errors.New("karyawan tidak ditemukan")
}

func (r *MemKaryawanRepo) FindByNIK(ctx context.Context, nik string) (*domain.Karyawan, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	k, ok := r.store.karyawan[nik]
	if !ok {
		return nil, errors.New("karyawan tidak ditemukan")
	}
	cpy := *k
	if loc, ok := r.store.lokasi[k.IDLokasi]; ok {
		cpy.NamaKantor = loc.NamaKantor
	}
	return &cpy, nil
}

func (r *MemKaryawanRepo) FindAll(ctx context.Context, search string) ([]domain.Karyawan, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var result []domain.Karyawan
	sLower := strings.ToLower(search)
	for _, k := range r.store.karyawan {
		if search == "" ||
			strings.Contains(strings.ToLower(k.NIK), sLower) ||
			strings.Contains(strings.ToLower(k.NamaLengkap), sLower) ||
			strings.Contains(strings.ToLower(k.Jabatan), sLower) {
			cpy := *k
			if loc, ok := r.store.lokasi[k.IDLokasi]; ok {
				cpy.NamaKantor = loc.NamaKantor
			}
			result = append(result, cpy)
		}
	}
	return result, nil
}

func (r *MemKaryawanRepo) Create(ctx context.Context, k *domain.Karyawan) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	if _, exists := r.store.karyawan[k.NIK]; exists {
		return errors.New("karyawan dengan NIK tersebut sudah ada")
	}
	now := time.Now()
	k.CreatedAt = now
	k.UpdatedAt = now
	cpy := *k
	r.store.karyawan[k.NIK] = &cpy
	return nil
}

func (r *MemKaryawanRepo) Update(ctx context.Context, k *domain.Karyawan) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	existing, exists := r.store.karyawan[k.NIK]
	if !exists {
		return errors.New("karyawan tidak ditemukan")
	}

	existing.NamaLengkap = k.NamaLengkap
	existing.Email = k.Email
	if k.PasswordHash != "" {
		existing.PasswordHash = k.PasswordHash
	}
	existing.NomorTelepon = k.NomorTelepon
	existing.Jabatan = k.Jabatan
	existing.Role = k.Role
	existing.IDLokasi = k.IDLokasi
	existing.JamMasukJadwal = k.JamMasukJadwal
	existing.JamPulangJadwal = k.JamPulangJadwal
	existing.StatusAktif = k.StatusAktif
	existing.UpdatedAt = time.Now()
	return nil
}

func (r *MemKaryawanRepo) CountActive(ctx context.Context) (int, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	count := 0
	for _, k := range r.store.karyawan {
		if k.StatusAktif {
			count++
		}
	}
	return count, nil
}

// =================== IMPLEMENTASI LOKASI ===================

type MemLokasiRepo struct {
	store *MemoryStore
}

func NewMemoryLokasiRepository(store *MemoryStore) *MemLokasiRepo {
	return &MemLokasiRepo{store: store}
}

func (r *MemLokasiRepo) FindByID(ctx context.Context, id int) (*domain.LokasiKantor, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	l, ok := r.store.lokasi[id]
	if !ok {
		return nil, errors.New("lokasi kantor tidak ditemukan")
	}
	cpy := *l
	return &cpy, nil
}

func (r *MemLokasiRepo) FindAll(ctx context.Context) ([]domain.LokasiKantor, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var result []domain.LokasiKantor
	for _, l := range r.store.lokasi {
		result = append(result, *l)
	}
	return result, nil
}

func (r *MemLokasiRepo) Create(ctx context.Context, l *domain.LokasiKantor) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	l.IDLokasi = r.store.nextLokasiID
	r.store.nextLokasiID++
	now := time.Now()
	l.CreatedAt = now
	l.UpdatedAt = now
	cpy := *l
	r.store.lokasi[l.IDLokasi] = &cpy
	return nil
}

func (r *MemLokasiRepo) Update(ctx context.Context, l *domain.LokasiKantor) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	existing, ok := r.store.lokasi[l.IDLokasi]
	if !ok {
		return errors.New("lokasi kantor tidak ditemukan")
	}
	existing.NamaKantor = l.NamaKantor
	existing.Alamat = l.Alamat
	existing.Latitude = l.Latitude
	existing.Longitude = l.Longitude
	existing.RadiusMeter = l.RadiusMeter
	existing.StatusAktif = l.StatusAktif
	existing.UpdatedAt = time.Now()
	return nil
}

// =================== IMPLEMENTASI PRESENSI ===================

type MemPresensiRepo struct {
	store *MemoryStore
}

func NewMemoryPresensiRepository(store *MemoryStore) *MemPresensiRepo {
	return &MemPresensiRepo{store: store}
}

func (r *MemPresensiRepo) Create(ctx context.Context, p *domain.LogPresensi) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	p.IDPresensi = r.store.nextPresensiID
	r.store.nextPresensiID++
	now := time.Now()
	p.CreatedAt = now

	// Attach relations
	if k, ok := r.store.karyawan[p.NIK]; ok {
		p.NamaKaryawan = k.NamaLengkap
		p.Jabatan = k.Jabatan
	}
	if loc, ok := r.store.lokasi[p.IDLokasi]; ok {
		p.NamaKantor = loc.NamaKantor
	}

	cpy := *p
	r.store.presensi[p.IDPresensi] = &cpy
	return nil
}

func (r *MemPresensiRepo) FindByNIKAndTanggal(ctx context.Context, nik string, tanggal string) ([]domain.LogPresensi, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []domain.LogPresensi
	for _, p := range r.store.presensi {
		if p.NIK == nik && p.Tanggal == tanggal {
			list = append(list, *p)
		}
	}
	return list, nil
}

func (r *MemPresensiRepo) FindHistoryByNIK(ctx context.Context, nik string, month int, year int) ([]domain.LogPresensi, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []domain.LogPresensi
	for _, p := range r.store.presensi {
		if p.NIK != nik {
			continue
		}
		if month != 0 || year != 0 {
			t, err := time.Parse("2006-01-02", p.Tanggal)
			if err == nil {
				if month != 0 && int(t.Month()) != month {
					continue
				}
				if year != 0 && t.Year() != year {
					continue
				}
			}
		}
		list = append(list, *p)
	}
	return list, nil
}

func (r *MemPresensiRepo) FindRecap(ctx context.Context, startDate, endDate, idLokasi, search string) ([]domain.RekapItem, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	lokasiID := 0
	if idLokasi != "" {
		lokasiID, _ = strconv.Atoi(idLokasi)
	}
	sLower := strings.ToLower(search)

	var list []domain.RekapItem
	for _, p := range r.store.presensi {
		if startDate != "" && p.Tanggal < startDate {
			continue
		}
		if endDate != "" && p.Tanggal > endDate {
			continue
		}
		if lokasiID != 0 && p.IDLokasi != lokasiID {
			continue
		}
		if search != "" {
			namaMatch := strings.Contains(strings.ToLower(p.NamaKaryawan), sLower)
			nikMatch := strings.Contains(strings.ToLower(p.NIK), sLower)
			jabatanMatch := strings.Contains(strings.ToLower(p.Jabatan), sLower)
			if !namaMatch && !nikMatch && !jabatanMatch {
				continue
			}
		}

		item := domain.RekapItem{
			IDPresensi:      p.IDPresensi,
			NIK:             p.NIK,
			NamaKaryawan:    p.NamaKaryawan,
			Jabatan:         p.Jabatan,
			NamaKantor:      p.NamaKantor,
			Tanggal:         p.Tanggal,
			Jam:             p.Jam,
			JenisPresensi:   p.JenisPresensi,
			StatusKehadiran: p.StatusKehadiran,
			JarakMeter:      p.JarakMeter,
			URLFoto:         p.URLFoto,
			DiupdateOleh:    p.DiupdateOleh,
			WaktuUpdate:     p.WaktuUpdate,
			CatatanKoreksi:  p.CatatanKoreksi,
		}
		list = append(list, item)
	}
	return list, nil
}

func (r *MemPresensiRepo) FindByID(ctx context.Context, id int64) (*domain.LogPresensi, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	p, ok := r.store.presensi[id]
	if !ok {
		return nil, errors.New("data presensi tidak ditemukan")
	}
	cpy := *p
	return &cpy, nil
}

func (r *MemPresensiRepo) UpdateCorrection(ctx context.Context, id int64, statusKehadiran, catatan, adminNIK string, waktuUpdate time.Time) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	p, ok := r.store.presensi[id]
	if !ok {
		return errors.New("data presensi tidak ditemukan")
	}
	p.StatusKehadiran = statusKehadiran
	p.CatatanKoreksi = &catatan
	p.DiupdateOleh = &adminNIK
	p.WaktuUpdate = &waktuUpdate
	return nil
}

func (r *MemPresensiRepo) CountTodayStats(ctx context.Context, tanggal string) (totalHadir, totalTepatWaktu, totalTerlambat int, err error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	nikHadir := make(map[string]bool)
	for _, p := range r.store.presensi {
		if p.Tanggal == tanggal {
			nikHadir[p.NIK] = true
			if p.JenisPresensi == domain.JenisMasuk {
				if p.StatusKehadiran == domain.StatusTepatWaktu {
					totalTepatWaktu++
				} else if p.StatusKehadiran == domain.StatusTerlambat {
					totalTerlambat++
				}
			}
		}
	}
	return len(nikHadir), totalTepatWaktu, totalTerlambat, nil
}

// =================== IMPLEMENTASI IZIN ===================

type MemIzinRepo struct {
	store *MemoryStore
}

func NewMemoryIzinRepository(store *MemoryStore) *MemIzinRepo {
	return &MemIzinRepo{store: store}
}

func (r *MemIzinRepo) Create(ctx context.Context, i *domain.PengajuanIzin) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	i.IDIzin = r.store.nextIzinID
	r.store.nextIzinID++
	now := time.Now()
	i.Status = domain.StatusIzinPending
	i.CreatedAt = now

	if k, ok := r.store.karyawan[i.NIK]; ok {
		i.NamaKaryawan = k.NamaLengkap
		i.Jabatan = k.Jabatan
	}

	cpy := *i
	r.store.izin[i.IDIzin] = &cpy
	return nil
}

func (r *MemIzinRepo) FindByNIK(ctx context.Context, nik string) ([]domain.PengajuanIzin, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []domain.PengajuanIzin
	for _, i := range r.store.izin {
		if i.NIK == nik {
			list = append(list, *i)
		}
	}
	return list, nil
}

func (r *MemIzinRepo) FindAll(ctx context.Context, status string) ([]domain.PengajuanIzin, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []domain.PengajuanIzin
	for _, i := range r.store.izin {
		if status == "" || i.Status == status {
			list = append(list, *i)
		}
	}
	return list, nil
}

func (r *MemIzinRepo) FindByID(ctx context.Context, id int64) (*domain.PengajuanIzin, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	i, ok := r.store.izin[id]
	if !ok {
		return nil, errors.New("data permohonan izin tidak ditemukan")
	}
	cpy := *i
	return &cpy, nil
}

func (r *MemIzinRepo) UpdateReview(ctx context.Context, id int64, status, catatanAdmin, adminNIK string, waktuVerifikasi time.Time) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	i, ok := r.store.izin[id]
	if !ok {
		return errors.New("data permohonan izin tidak ditemukan")
	}
	i.Status = status
	i.CatatanAdmin = &catatanAdmin
	i.DiverifikasiOleh = &adminNIK
	i.WaktuVerifikasi = &waktuVerifikasi
	return nil
}

func (r *MemIzinRepo) CountActiveToday(ctx context.Context, tanggal string) (int, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	count := 0
	for _, i := range r.store.izin {
		if i.Status == domain.StatusIzinDisetujui &&
			i.TanggalMulai <= tanggal && i.TanggalSelesai >= tanggal {
			count++
		}
	}
	return count, nil
}
