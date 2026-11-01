package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"absensi-backend/internal/service"
)

type APIResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	ErrorCode string      `json:"error_code,omitempty"`
}

func WriteJSON(w http.ResponseWriter, status int, success bool, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Success: success,
		Message: message,
		Data:    data,
	})
}

func WriteError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")

	var appErr *service.AppError
	if errors.As(err, &appErr) {
		w.WriteHeader(appErr.StatusCode)
		_ = json.NewEncoder(w).Encode(APIResponse{
			Success:   false,
			Message:   appErr.Message,
			ErrorCode: appErr.Code,
		})
		return
	}

	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Success:   false,
		Message:   err.Error(),
		ErrorCode: "INTERNAL_SERVER_ERROR",
	})
}
