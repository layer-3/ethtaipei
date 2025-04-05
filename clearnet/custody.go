package main

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// CustodyClientWrapper implements the BlockchainClient interface using the Custody contract
type CustodyClientWrapper struct {
	client       *ethclient.Client
	custody      *Custody
	transactOpts *bind.TransactOpts
	networkID    string
}

// NewCustodyClientWrapper creates a new custody client wrapper
func NewCustodyClientWrapper(
	client *ethclient.Client,
	custodyAddress common.Address,
	transactOpts *bind.TransactOpts,
	networkID string,
) (*CustodyClientWrapper, error) {
	custody, err := NewCustody(custodyAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to bind custody contract: %w", err)
	}

	return &CustodyClientWrapper{
		client:       client,
		custody:      custody,
		transactOpts: transactOpts,
		networkID:    networkID,
	}, nil
}

// Join calls the join method on the custody contract
func (c *CustodyClientWrapper) Join(channelID string) error {
	// Convert string channelID to bytes32
	channelIDBytes := common.HexToHash(channelID)

	// The broker will always join as participant with index 1 (second participant)
	index := big.NewInt(1)

	// For simple implementation we're using an empty signature
	// In a real implementation, this would be a valid signature
	sig := Signature{
		V: 0,
		R: [32]byte{},
		S: [32]byte{},
	}

	// Call the join method on the custody contract
	_, err := c.custody.Join(c.transactOpts, channelIDBytes, index, sig)
	if err != nil {
		return fmt.Errorf("failed to join channel: %w", err)
	}

	return nil
}

// GetNetworkID returns the network ID for this client
func (c *CustodyClientWrapper) GetNetworkID() (string, error) {
	networkID, err := c.client.NetworkID(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed to get network ID: %w", err)
	}
	return networkID.String(), nil
}
