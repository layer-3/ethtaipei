package eth

import (
	"crypto/sha256"
	"strings"
	"testing"

	ecrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestES256Signer_Alg(t *testing.T) {
	t.Parallel()

	signer := &ES256Signer{}
	assert.Equal(t, "ES256", signer.Alg())
}

func TestES256Signer_SignAndVerify(t *testing.T) {
	t.Parallel()

	privateKey, err := ecrypto.GenerateKey()
	assert.NoError(t, err)

	ethSigner := NewLocalSigner(privateKey)
	es256Signer := &ES256Signer{}

	signingString := "test.signing.string"

	// Test signing
	signature, err := es256Signer.Sign(signingString, ethSigner)
	assert.NoError(t, err)
	assert.Equal(t, 64, len(signature))

	// Test verification with signer interface
	err = es256Signer.Verify(signingString, signature, ethSigner)
	assert.NoError(t, err)

	// Test verification with public key directly
	err = es256Signer.Verify(signingString, signature, &privateKey.PublicKey)
	assert.NoError(t, err)
}

func TestES256Signer_VerifyFailsWithInvalidSignature(t *testing.T) {
	t.Parallel()

	privateKey, err := ecrypto.GenerateKey()
	assert.NoError(t, err)

	ethSigner := NewLocalSigner(privateKey)
	es256Signer := &ES256Signer{}

	// Create a valid signature
	signingString := "test.signing.string"
	signature, err := es256Signer.Sign(signingString, ethSigner)
	assert.NoError(t, err)

	// Modify the signature to make it invalid
	invalidSignature := make([]byte, len(signature))
	copy(invalidSignature, signature)
	invalidSignature[0] ^= 0xFF // Flip some bits

	// Verification should fail
	err = es256Signer.Verify(signingString, invalidSignature, ethSigner)
	assert.Error(t, err)
	assert.Equal(t, jwt.ErrSignatureInvalid, err)
}

func TestES256Signer_SignFailsWithInvalidKey(t *testing.T) {
	t.Parallel()

	es256Signer := &ES256Signer{}
	invalidKey := "not a valid key"

	_, err := es256Signer.Sign("test", invalidKey)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidSignerType, err)
}

func TestES256Signer_VerifyFailsWithInvalidKey(t *testing.T) {
	t.Parallel()

	es256Signer := &ES256Signer{}
	invalidKey := "not a valid key"
	signature := make([]byte, 64)

	err := es256Signer.Verify("test", signature, invalidKey)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidKeyType, err)
}

func TestES256Signer_VerifyFailsWithInvalidSignatureLength(t *testing.T) {
	t.Parallel()

	privateKey, err := ecrypto.GenerateKey()
	assert.NoError(t, err)

	ethSigner := NewLocalSigner(privateKey)
	es256Signer := &ES256Signer{}

	// Create an invalid signature (wrong length)
	invalidSignature := make([]byte, 32) // Should be 64 bytes

	err = es256Signer.Verify("test", invalidSignature, ethSigner)
	assert.Error(t, err)
	assert.Equal(t, jwt.ErrSignatureInvalid, err)
}

func TestRegisterES256Signer(t *testing.T) {
	t.Parallel()

	// Register the ES256Signer
	RegisterES256Signer()

	// Verify it was registered correctly
	method := jwt.GetSigningMethod("ES256")
	assert.NotNil(t, method)
	assert.IsType(t, &ES256Signer{}, method)
}

func TestJWTWithES256Signer(t *testing.T) {
	t.Parallel()

	// Register the custom ES256Signer
	jwt.RegisterSigningMethod("ES256", func() jwt.SigningMethod {
		return &ES256Signer{}
	})

	privateKey, err := ecrypto.GenerateKey()
	assert.NoError(t, err)

	ethSigner := NewLocalSigner(privateKey)

	// Create a JWT token
	token := jwt.NewWithClaims(jwt.GetSigningMethod("ES256"), jwt.MapClaims{
		"sub": "1234567890",
		"iat": 1516239022,
	})

	// Sign the token
	tokenString, err := token.SignedString(ethSigner)
	assert.NoError(t, err)
	assert.NotEmpty(t, tokenString)

	// Parse and verify the token
	parsedToken, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Return the verification key
		return ethSigner, nil
	})

	assert.NoError(t, err)
	assert.True(t, parsedToken.Valid)
}

func TestES256Signer_Verify_HashCorrectness(t *testing.T) {
	t.Parallel()

	// This test validates that the hashing in ES256Signer.Verify is correct
	
	privateKey, err := ecrypto.GenerateKey()
	assert.NoError(t, err)
	
	es256Signer := &ES256Signer{}
	ethSigner := NewLocalSigner(privateKey)
	
	signingString := strings.Repeat("test", 16) // Longer test string
	
	// Create the message hash correctly using SHA-256
	hasher := sha256.New()
	hasher.Write([]byte(signingString))
	msgHash := hasher.Sum(nil)
	
	// Sign with the signer
	signature, err := ethSigner.Sign(msgHash)
	assert.NoError(t, err)
	
	// Format as JWT would
	jwtSignature := make([]byte, 64)
	copy(jwtSignature[:32], signature.R)
	copy(jwtSignature[32:], signature.S)
	
	// Verify using ES256Signer's Verify method
	err = es256Signer.Verify(signingString, jwtSignature, ethSigner)
	assert.NoError(t, err)
}