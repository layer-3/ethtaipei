package eth

import (
	"crypto/ecdsa"
)

type Signer interface {
	Sign(msg []byte) (Signature, error)
	PublicKey() *ecdsa.PublicKey
	Address() Address
}
