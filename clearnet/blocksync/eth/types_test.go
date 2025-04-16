package eth

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestHashValue(t *testing.T) {
	// Expected hexadecimal string for the hash.
	expectedHex := "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
	// Create an eth.Hash value from a known common.Hash.
	hash := Hash(common.HexToHash(expectedHex))

	val, err := hash.Value()
	if err != nil {
		t.Fatalf("Hash.Value() returned error: %v", err)
	}

	str, ok := val.(string)
	if !ok {
		t.Fatalf("expected value to be string, got %T", val)
	}
	if str != expectedHex {
		t.Errorf("Hash.Value() = %s; want %s", str, expectedHex)
	}
}

func TestHashScanFromString(t *testing.T) {
	expectedHex := "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
	var hash Hash

	// Scan from a string value.
	if err := hash.Scan(expectedHex); err != nil {
		t.Fatalf("Hash.Scan() returned error from string: %v", err)
	}

	if common.Hash(hash).Hex() != expectedHex {
		t.Errorf("after Scan, hash = %s; want %s", common.Hash(hash).Hex(), expectedHex)
	}
}

func TestHashScanFromBytes(t *testing.T) {
	expectedHex := "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd"
	var hash Hash

	// Scan from a []byte value.
	if err := hash.Scan([]byte(expectedHex)); err != nil {
		t.Fatalf("Hash.Scan() returned error from []byte: %v", err)
	}

	if common.Hash(hash).Hex() != expectedHex {
		t.Errorf("after Scan, hash = %s; want %s", common.Hash(hash).Hex(), expectedHex)
	}
}

func TestHashScanInvalid(t *testing.T) {
	var hash Hash

	// Pass an unsupported type.
	if err := hash.Scan(123); err == nil {
		t.Error("expected error when scanning unsupported type, got nil")
	}

	// Pass a string without the required "0x" prefix.
	if err := hash.Scan("abcdef"); err == nil {
		t.Error("expected error when scanning invalid hex string without 0x, got nil")
	}
}

func TestAddressValue(t *testing.T) {
	// Expected hexadecimal string for the address.
	expectedHex := common.HexToAddress("0x1234567890abcdef1234567890abcdef12345678").Hex()
	addr := Address(common.HexToAddress(expectedHex))

	val, err := addr.Value()
	if err != nil {
		t.Fatalf("Address.Value() returned error: %v", err)
	}

	str, ok := val.(string)
	if !ok {
		t.Fatalf("expected value to be string, got %T", val)
	}
	if str != expectedHex {
		t.Errorf("Address.Value() = %s; want %s", str, expectedHex)
	}
}

func TestAddressScanFromString(t *testing.T) {
	expectedHex := common.HexToAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd").Hex()
	var addr Address

	// Scan from a string value.
	if err := addr.Scan(expectedHex); err != nil {
		t.Fatalf("Address.Scan() returned error from string: %v", err)
	}

	if common.Address(addr).Hex() != expectedHex {
		t.Errorf("after Scan, address = %s; want %s", common.Address(addr).Hex(), expectedHex)
	}
}

func TestAddressScanFromBytes(t *testing.T) {
	expectedHex := common.HexToAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd").Hex()
	var addr Address

	// Scan from a []byte value.
	if err := addr.Scan([]byte(expectedHex)); err != nil {
		t.Fatalf("Address.Scan() returned error from []byte: %v", err)
	}

	if common.Address(addr).Hex() != expectedHex {
		t.Errorf("after Scan, address = %s; want %s", common.Address(addr).Hex(), expectedHex)
	}
}

func TestAddressScanInvalid(t *testing.T) {
	var addr Address

	// Pass an unsupported type.
	if err := addr.Scan(123); err == nil {
		t.Error("expected error when scanning unsupported type for address, got nil")
	}

	// Pass a string without the "0x" prefix.
	if err := addr.Scan("abcdef"); err == nil {
		t.Error("expected error when scanning invalid address string without 0x, got nil")
	}
}
