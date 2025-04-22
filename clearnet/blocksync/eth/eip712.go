package eth

import (
	"crypto/ecdsa"
	"errors"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// EIP712Domain represents a minimal EIP-712 domain struct.
type EIP712Domain struct {
	Name              string   // e.g. "My DApp"
	Version           string   // e.g. "1"
	ChainID           *big.Int // e.g. big.NewInt(1) for mainnet
	VerifyingContract common.Address
}

// NonceMessage stores the data you want to sign, in this case a simple nonce as either a string or byte array.
type NonceMessage []byte

// EIP712SignatureData encapsulates the domain and message for typed hashing and signature.
type EIP712SignatureData struct {
	Domain  EIP712Domain
	Message NonceMessage
}

// domainTypeHash = keccak256 of the domain type signature:
// "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
var domainTypeHash = crypto.Keccak256Hash([]byte(
	"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
))

// messageTypeHash = keccak256 of the message struct signature:
// "NonceMessage(string nonceString,bytes nonceBytes)"
var messageTypeHash = crypto.Keccak256Hash([]byte(
	"NonceMessage(string nonceString,bytes nonceBytes)",
))

// ComputeDomainSeparator hashes the domain fields into a 32-byte domain separator.
func ComputeDomainSeparator(domain EIP712Domain) [32]byte {
	// Hash each string field
	nameHash := crypto.Keccak256Hash([]byte(domain.Name))
	versionHash := crypto.Keccak256Hash([]byte(domain.Version))

	// Represent chainId and verifyingContract as 32-byte left-padded
	chainIdBytes := common.LeftPadBytes(domain.ChainID.Bytes(), 32)
	verifyingContractBytes := common.LeftPadBytes(domain.VerifyingContract.Bytes(), 32)

	// Concatenate domainTypeHash + nameHash + versionHash + chainId + verifyingContract
	encodedData := append(domainTypeHash.Bytes(), nameHash.Bytes()...)
	encodedData = append(encodedData, versionHash.Bytes()...)
	encodedData = append(encodedData, chainIdBytes...)
	encodedData = append(encodedData, verifyingContractBytes...)

	return crypto.Keccak256Hash(encodedData)
}

// ComputeMessageHash builds a 32-byte hash of the NonceMessage struct using EIP-712 encoding.
func ComputeMessageHash(msg NonceMessage) [32]byte {
	// For string or bytes in EIP-712, use keccak256 of the contents
	nonceBytesHash := crypto.Keccak256Hash(msg)

	// Concatenate messageTypeHash + keccak256(nonceString) + keccak256(nonceBytes)
	encodedData := append(messageTypeHash.Bytes(), nonceBytesHash.Bytes()...)

	return crypto.Keccak256Hash(encodedData)
}

// ComputeEIP712Hash creates the final EIP-191–style message hash: keccak256(0x19, 0x01, domainSeparator, messageHash).
func ComputeEIP712Hash(domainSeparator, messageHash [32]byte) [32]byte {
	prefix := []byte{0x19, 0x01}
	data := append(prefix, domainSeparator[:]...)
	data = append(data, messageHash[:]...)
	return crypto.Keccak256Hash(data)
}

// VerifySignature checks whether the provided signature corresponds to the given public key and message data.
func VerifySignature(domain EIP712Domain, msg NonceMessage, sig []byte, signerPubKey *ecdsa.PublicKey) (bool, error) {
	if len(sig) != 65 {
		return false, errors.New("signature must be 65 bytes (r, s, v)")
	}

	domainSeparator := ComputeDomainSeparator(domain)
	messageHash := ComputeMessageHash(msg)
	finalHash := ComputeEIP712Hash(domainSeparator, messageHash)

	// Ecrecover to get the raw public key bytes.
	recoveredPub, err := crypto.Ecrecover(finalHash[:], sig)
	if err != nil {
		return false, fmt.Errorf("error recovering public key: %v", err)
	}

	// Convert recovered bytes to an ecdsa.PublicKey.
	recoveredKey, err := crypto.UnmarshalPubkey(recoveredPub)
	if err != nil {
		return false, fmt.Errorf("error unmarshalling pubkey: %v", err)
	}

	matches := (recoveredKey.X.Cmp(signerPubKey.X) == 0 && recoveredKey.Y.Cmp(signerPubKey.Y) == 0)
	return matches, nil
}

// GenerateKeyPair creates a new private/public keypair for demonstration or testing.
func GenerateKeyPair() (*ecdsa.PrivateKey, *ecdsa.PublicKey, error) {
	sk, err := crypto.GenerateKey()
	if err != nil {
		return nil, nil, err
	}
	return sk, &sk.PublicKey, nil
}

// SignEIP712Hash produces an EIP-712 signature using the provided private key, domain, and message.
func SignEIP712Hash(privKey *ecdsa.PrivateKey, domain EIP712Domain, msg NonceMessage) ([]byte, error) {
	domainSeparator := ComputeDomainSeparator(domain)
	messageHash := ComputeMessageHash(msg)
	finalHash := ComputeEIP712Hash(domainSeparator, messageHash)
	return crypto.Sign(finalHash[:], privKey)
}
