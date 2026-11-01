package service

import "fmt"

// AppError merepresentasikan custom error terstruktur untuk penanganan HTTP.
type AppError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func NewAppError(status int, code, message string) *AppError {
	return &AppError{
		StatusCode: status,
		Code:       code,
		Message:    message,
	}
}
