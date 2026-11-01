package geo

import (
	"math"
)

const earthRadiusMeter = 6371000.0 // Radius rata-rata bumi dalam meter

// degreesToRadians mengonversi sudut derajat ke radian.
func degreesToRadians(degrees float64) float64 {
	return degrees * math.Pi / 180.0
}

// CalculateDistance menghitung jarak lingkaran besar (great-circle distance)
// antara dua titik koordinat GPS (latitude, longitude) dalam satuan meter
// menggunakan rumus Haversine.
func CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := degreesToRadians(lat2 - lat1)
	dLon := degreesToRadians(lon2 - lon1)

	radLat1 := degreesToRadians(lat1)
	radLat2 := degreesToRadians(lat2)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(radLat1)*math.Cos(radLat2)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusMeter * c
}
