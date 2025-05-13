package eth

import (
	"crypto/ecdsa"

	ecrypto "github.com/ethereum/go-ethereum/crypto"
)

type LocalSigner struct {
	privateKey *ecdsa.PrivateKey
	address    Address
}

func NewLocalSigner(privateKey *ecdsa.PrivateKey) LocalSigner {
	publicKey := privateKey.PublicKey
	return LocalSigner{
		privateKey: privateKey,
		address:    NewAddressFromPubkey(publicKey),
	}
}

func (s LocalSigner) Sign(msg []byte) (Signature, error) {
	sigBytes, err := ecrypto.Sign(msg, s.privateKey)
	if err != nil {
		return Signature{}, err
	}

	return NewSignatureFromBytes(sigBytes), nil
}

func (s LocalSigner) PublicKey() *ecdsa.PublicKey {
	return &s.privateKey.PublicKey
}

func (s LocalSigner) Address() Address {
	return s.address
}
