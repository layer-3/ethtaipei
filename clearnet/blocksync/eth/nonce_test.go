package eth

import (
	"strings"
	"testing"
)

func TestNonce_ValidLength(t *testing.T) {
	length := 16
	nonce, err := Nonce(length)
	if err != nil {
		t.Fatalf("Failed to generate nonce of valid length %d: %v", length, err)
	}

	if len(nonce) != length {
		t.Fatalf("Expected nonce of length %d, got %d", length, len(nonce))
	}

	allowedChars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

	for _, char := range nonce {
		if !strings.ContainsRune(allowedChars, rune(char)) {
			t.Fatalf("Nonce contains invalid character: %c", char)
		}
	}
}

func TestNonce_TooShort(t *testing.T) {
	length := 7 // below the minimum of 8
	_, err := Nonce(length)
	if err == nil {
		t.Fatalf("Expected error for length %d, but got none", length)
	}
}

func TestNonce_TooLong(t *testing.T) {
	length := 129 // above the maximum of 128
	_, err := Nonce(length)
	if err == nil {
		t.Fatalf("Expected error for length %d, but got none", length)
	}
}
