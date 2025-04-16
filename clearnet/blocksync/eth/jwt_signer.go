package eth

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"errors"
	"math/big"

	ecrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/golang-jwt/jwt/v5"
)

var (
	// ErrInvalidSignerType is returned when the key is not a valid eth.Signer
	ErrInvalidSignerType = errors.New("key is not of type eth.Signer")

	// ErrInvalidKeyType is returned when the key is not of the expected type
	ErrInvalidKeyType = errors.New("key is not of valid type")

	// ErrInvalidSigningString is returned when the signing string is invalid
	ErrInvalidSigningString = errors.New("invalid signing string")
)

// ES256Signer implements jwt.SigningMethod for ES256 using an eth.Signer
type ES256Signer struct{}

// Alg returns the algorithm identifier
func (m *ES256Signer) Alg() string {
	return "ES256"
}

// Verify implements the Verify method from jwt.SigningMethod
// For verification, we directly use the public key to verify the signature
func (m *ES256Signer) Verify(signingString string, signature []byte, key interface{}) error {
	var publicKey *ecdsa.PublicKey

	// Extract the public key from the provided key
	switch k := key.(type) {
	case Signer:
		publicKey = k.PublicKey()
	case *ecdsa.PublicKey:
		publicKey = k
	default:
		return ErrInvalidKeyType
	}

	// ES256 signatures should be 64 bytes: R (32 bytes) + S (32 bytes)
	if len(signature) != 64 {
		return jwt.ErrSignatureInvalid
	}

	// Create the message hash using SHA-256 (same as ES256)
	if len(signingString) == 0 {
		return ErrInvalidSigningString
	}

	hasher := sha256.New()
	hasher.Write([]byte(signingString))
	msgHash := hasher.Sum(nil)

	// Convert signature from JWT format (R||S) to Ethereum format
	// Extract R and S values
	r := new(big.Int).SetBytes(signature[:32])
	s := new(big.Int).SetBytes(signature[32:])

	// Verify the signature using standard ECDSA
	if !ecrypto.VerifySignature(
		ecrypto.FromECDSAPub(publicKey),
		msgHash,
		append(r.Bytes(), s.Bytes()...),
	) {
		return jwt.ErrSignatureInvalid
	}

	return nil
}

// Sign implements the Sign method from jwt.SigningMethod
// Using eth.Signer to create a signature
func (m *ES256Signer) Sign(signingString string, key interface{}) ([]byte, error) {
	var signer Signer
	var ok bool

	// Convert key to an eth.Signer
	if signer, ok = key.(Signer); !ok {
		return nil, ErrInvalidSignerType
	}

	// Create the message hash using SHA-256 (same as ES256)
	hasher := sha256.New()
	hasher.Write([]byte(signingString))
	msgHash := hasher.Sum(nil)

	// Sign the hash using the signer
	signature, err := signer.Sign(msgHash)
	if err != nil {
		return nil, err
	}

	// Format signature for JWT (ES256 format is just R and S concatenated)
	// JWT ES256 signatures are 64 bytes: R (32 bytes) + S (32 bytes)
	jwtSignature := make([]byte, 64)
	copy(jwtSignature[:32], signature.R)
	copy(jwtSignature[32:], signature.S)
	// JWT doesn't use the V value

	return jwtSignature, nil
}

// RegisterES256Signer registers the ES256Signer as a JWT signing method
func RegisterES256Signer() {
	jwt.RegisterSigningMethod("ES256", func() jwt.SigningMethod {
		return &ES256Signer{}
	})
}

