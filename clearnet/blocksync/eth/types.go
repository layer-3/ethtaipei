package eth

import (
	"crypto/ecdsa"
	"database/sql/driver"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	ecrypto "github.com/ethereum/go-ethereum/crypto"
)

// Hash represents a common.Hash stored as a hexadecimal string with a 0x prefix.
type Hash common.Hash

// Value implements the driver.Valuer interface.
// It returns the hexadecimal string representation (with 0x prefix) of the hash.
func (h Hash) Value() (driver.Value, error) {
	// common.Hash has a Hex() method that returns a 0x-prefixed hex string.
	return h.String(), nil
}

func (h Hash) String() string {
	return common.Hash(h).Hex()
}

// Scan implements the sql.Scanner interface.
// It expects a hexadecimal string (with a 0x prefix) and converts it into a Hash.
func (h *Hash) Scan(src interface{}) error {
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("unsupported type %T for Hash", src)
	}

	s = strings.TrimSpace(s)
	if len(s) < 2 || s[:2] != "0x" {
		return fmt.Errorf("invalid hash string: %s", s)
	}

	// Convert the hex string into a common.Hash.
	*h = Hash(common.HexToHash(s))
	return nil
}

// Address represents a common.Address stored as a hexadecimal string with a 0x prefix.
type Address common.Address

// Value implements the driver.Valuer interface.
// It returns the hexadecimal string representation (with 0x prefix) of the address.
func (a Address) Value() (driver.Value, error) {
	return a.String(), nil
}

func (a Address) String() string {
	return common.Address(a).Hex()
}

func NewAddressFromPubkey(pub ecdsa.PublicKey) Address {
	return Address(ecrypto.PubkeyToAddress(pub))
}

// Scan implements the sql.Scanner interface.
// It expects a hexadecimal string (with a 0x prefix) and converts it into an Address.
func (a *Address) Scan(src interface{}) error {
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("unsupported type %T for Address", src)
	}

	s = strings.TrimSpace(s)
	if len(s) < 2 || s[:2] != "0x" {
		return fmt.Errorf("invalid address string: %s", s)
	}

	*a = Address(common.HexToAddress(s))
	return nil
}
