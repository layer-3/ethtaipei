package eth

import (
	"crypto/rand"
	"errors"
	"io"
)

// Allowed characters for the nonce
var nonceChars = []byte("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

// RandomNonce returns a secure random byte slice of the specified length.
// The output includes only characters A-Z, a-z, and 0-9.
func Nonce(length int) ([]byte, error) {

	if length < 8 || length > 128 {
		return nil, errors.New("nonce length must be between 8 and 128")
	}

	out := make([]byte, length)
	randomBytes := make([]byte, length)

	_, err := io.ReadFull(rand.Reader, randomBytes)
	if err != nil {
		return nil, err
	}

	for i := 0; i < length; i++ {
		out[i] = nonceChars[int(randomBytes[i])%len(nonceChars)]
	}

	return out, nil
}
