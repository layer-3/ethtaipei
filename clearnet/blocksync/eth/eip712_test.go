package eth

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestEIP712SignVerify(t *testing.T) {
	// Generate a keypair
	privKey, pubKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("Failed to generate key pair: %v", err)
	}

	// Define a sample EIP712Domain
	domain := EIP712Domain{
		Name:              "Example DApp",
		Version:           "1",
		ChainID:           big.NewInt(1),
		VerifyingContract: common.HexToAddress("0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"),
	}

	// Create a sample message
	msg := NonceMessage("sample-nonce")

	// Sign the message using our EIP-712 logic
	sig, err := SignEIP712Hash(privKey, domain, msg)
	if err != nil {
		t.Fatalf("Failed to sign EIP-712 hash: %v", err)
	}

	if len(sig) != 65 {
		t.Fatalf("Expected signature of length 65, got %d", len(sig))
	}

	// Verify the signature
	verified, err := VerifySignature(domain, msg, sig, pubKey)
	if err != nil {
		t.Fatalf("Error verifying signature: %v", err)
	}

	if !verified {
		t.Fatalf("Expected signature to be valid, but verification failed")
	}
}
