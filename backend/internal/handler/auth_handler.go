package handler

import (
	"encoding/json"
	"net/http"

	"absensi-backend/internal/domain"
	"absensi-backend/internal/middleware"
	"absensi-backend/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Login menangani autentikasi akun via POST /api/v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, false, "Format JSON tidak valid", nil)
		return
	}

	res, err := h.authService.Login(r.Context(), req)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Login berhasil", res)
}

// GetMe mengembalikan profil pengguna yang sedang login via GET /api/v1/auth/me.
func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		WriteJSON(w, http.StatusUnauthorized, false, "Sesi login tidak sah", nil)
		return
	}

	profile, err := h.authService.GetProfile(r.Context(), user.NIK)
	if err != nil {
		WriteError(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, true, "Profil pengguna berhasil dimuat", profile)
}
