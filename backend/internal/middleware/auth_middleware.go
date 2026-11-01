package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"absensi-backend/pkg/token"
)

type contextKey string

const userContextKey contextKey = "user_claims"

type errorResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	ErrorCode string `json:"error_code,omitempty"`
}

func writeJSONError(w http.ResponseWriter, status int, message, errorCode string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorResponse{
		Success:   false,
		Message:   message,
		ErrorCode: errorCode,
	})
}

// AuthMiddleware memverifikasi Bearer token JWT dan menyuntikkan claims ke Context.
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeJSONError(w, http.StatusUnauthorized, "Token autentikasi tidak ditemukan", "UNAUTHORIZED")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeJSONError(w, http.StatusUnauthorized, "Format header otorisasi harus Bearer <token>", "INVALID_HEADER")
				return
			}

			tokenStr := parts[1]
			claims, err := token.ValidateToken(tokenStr, jwtSecret)
			if err != nil {
				writeJSONError(w, http.StatusUnauthorized, "Sesi login tidak sah atau telah kedaluwarsa", "TOKEN_EXPIRED_OR_INVALID")
				return
			}

			ctx := context.WithValue(r.Context(), userContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserFromContext mengekstrak data claims pengguna dari context.
func GetUserFromContext(ctx context.Context) *token.Claims {
	claims, ok := ctx.Value(userContextKey).(*token.Claims)
	if !ok {
		return nil
	}
	return claims
}

// RequireRole membatasi akses endpoint hanya untuk role tertentu (misal: "ADMIN").
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			if user == nil {
				writeJSONError(w, http.StatusUnauthorized, "Autentikasi pengguna diperlukan", "UNAUTHORIZED")
				return
			}

			allowed := false
			for _, r := range roles {
				if strings.EqualFold(user.Role, r) {
					allowed = true
					break
				}
			}

			if !allowed {
				writeJSONError(w, http.StatusForbidden, "Akses ditolak: otorisasi hak akses tidak mencukupi", "FORBIDDEN")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
