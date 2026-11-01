package geo

import (
	"math"
	"testing"
)

func TestCalculateDistance(t *testing.T) {
	// Titik 1: Kantor Cabang Palu
	lat1, lon1 := -0.8917000, 119.8872000
	// Titik 2: Titik yang berjarak sangat dekat (~15-20 meter)
	lat2, lon2 := -0.8918000, 119.8872000

	dist := CalculateDistance(lat1, lon1, lat2, lon2)
	if dist <= 0 || dist > 50 {
		t.Errorf("Ekspektasi jarak dekat sekitar 11 meter, dapat: %f", dist)
	}

	// Jarak ke titik yang sama harus 0
	zeroDist := CalculateDistance(lat1, lon1, lat1, lon1)
	if math.Abs(zeroDist) > 0.0001 {
		t.Errorf("Ekspektasi jarak ke titik yang sama adalah 0, dapat: %f", zeroDist)
	}

	// Titik 3: Lokasi Jakarta (~1600 km dari Palu)
	latJkt, lonJkt := -6.2088000, 106.8456000
	distJkt := CalculateDistance(lat1, lon1, latJkt, lonJkt)
	if distJkt < 1500000 { // > 1.500 km
		t.Errorf("Ekspektasi jarak antar-pulau > 1.500 km, dapat: %f", distJkt)
	}
}
