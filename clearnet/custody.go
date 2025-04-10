package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

var (
	custodyAbi *abi.ABI
)

// CustodyClientWrapper implements the BlockchainClient interface using the Custody contract
type CustodyClientWrapper struct {
	client       *ethclient.Client
	custody      *Custody
	custodyAddr  common.Address
	transactOpts *bind.TransactOpts
	networkID    string
	privateKey   *ecdsa.PrivateKey
}

// NewCustodyClientWrapper creates a new custody client wrapper
func NewCustodyClientWrapper(
	client *ethclient.Client,
	custodyAddress common.Address,
	transactOpts *bind.TransactOpts,
	networkID string,
	privateKey *ecdsa.PrivateKey,
) (*CustodyClientWrapper, error) {
	custody, err := NewCustody(custodyAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to bind custody contract: %w", err)
	}

	return &CustodyClientWrapper{
		client:       client,
		custody:      custody,
		custodyAddr:  custodyAddress,
		transactOpts: transactOpts,
		networkID:    networkID,
		privateKey:   privateKey,
	}, nil
}

// Join calls the join method on the custody contract
func (c *CustodyClientWrapper) Join(channelID string, lastStateData []byte) error {
	// Convert string channelID to bytes32
	channelIDBytes := common.HexToHash(channelID)

	// The broker will always join as participant with index 1 (second participant)
	index := big.NewInt(1)

	sig, err := nitrolite.Sign(lastStateData, c.privateKey)
	if err != nil {
		return fmt.Errorf("failed to sign data: %w", err)
	}

	gasPrice, err := c.client.SuggestGasPrice(context.Background())
	if err != nil {
		return fmt.Errorf("failed to suggest gas price: %w", err)
	}

	c.transactOpts.GasPrice = gasPrice.Add(gasPrice, gasPrice)
	// Call the join method on the custody contract
	tx, err := c.custody.Join(c.transactOpts, channelIDBytes, index, Signature{
		V: sig.V,
		R: sig.R,
		S: sig.S,
	})
	if err != nil {
		return fmt.Errorf("failed to join channel: %w", err)
	}
	log.Println("TxHash:", tx.Hash().Hex())

	return nil
}

// GetNetworkID returns the network ID for this client
func (c *CustodyClientWrapper) GetNetworkID() string {
	return c.networkID
}

func (c *CustodyClientWrapper) GetCustody() *Custody {
	return c.custody
}

func (c *CustodyClientWrapper) ListenEvents() {
	// TODO: store processed events in a database
	ListenEvents(c.client, c.networkID, c.custodyAddr, c.networkID, 0, c.handleBlockChainEvent)
}

func (c *CustodyClientWrapper) handleBlockChainEvent(l types.Log) {
	log.Printf("Received event: %+v\n", l)
	eventID := l.Topics[0]
	switch eventID {
	case custodyAbi.Events["Created"].ID:
		ev, err := c.custody.ParseCreated(l)
		log.Printf("[ChannelCreated] Event data: %+v\n", ev)
		if err != nil {
			fmt.Println("error parsing ChannelCreated event:", err)
			return
		}

		participantA := ev.Channel.Participants[0].Hex()
		tokenAddress := ev.Initial.Allocations[0].Token.Hex()
		tokenAmount := ev.Initial.Allocations[0].Amount
		nonce := ev.Channel.Nonce

		channelID := common.BytesToHash(ev.ChannelId[:])
		// Create or update the channel with network ID
		_, err = channelService.GetOrCreateChannel(
			channelID.Hex(),
			participantA,
			tokenAddress,
			nonce,
			c.networkID,
		)
		if err != nil {
			log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
			return
		}

		stateHash, err := encodeStateHash(ev.ChannelId, ev.Initial.Data, ev.Initial.Allocations)
		if err != nil {
			log.Printf("[ChannelCreated] Error encoding state hash: %v", err)
			return
		}
		if err := c.Join(channelID.Hex(), stateHash); err != nil {
			log.Printf("[ChannelCreated] Error joining channel: %v", err)
			return
		}
		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s",
			channelID, c.networkID)

		account := ledger.Account(channelID.Hex(), participantA, tokenAddress)
		if err := account.Record(tokenAmount.Int64()); err != nil {
			log.Printf("[ChannelCreated] Error recording initial balance for participant A: %v", err)
			return
		}
	case custodyAbi.Events["Joined"].ID:
		ev, err := c.custody.ParseJoined(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Joined event data: %+v\n", ev)
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}

func encodeStateHash(channelID [32]byte, stateData []byte, allocations []Allocation) ([]byte, error) {
	// Define Allocation[] as tuple[]
	allocationType, err := abi.NewType("tuple[]", "", []abi.ArgumentMarshaling{
		{
			Name: "destination",
			Type: "address",
		},
		{
			Name: "token",
			Type: "address",
		},
		{
			Name: "amount",
			Type: "uint256",
		},
	})
	if err != nil {
		return nil, err
	}

	// Convert Go structs to interface{} slice matching tuple[]
	var allocValues []interface{}
	for _, alloc := range allocations {
		allocValues = append(allocValues, struct {
			Destination common.Address
			Token       common.Address
			Amount      *big.Int
		}{
			Destination: alloc.Destination,
			Token:       alloc.Token,
			Amount:      alloc.Amount,
		})
	}

	// ABI encode channelId (bytes32), data (bytes), allocations (tuple[])
	args := abi.Arguments{
		{Type: abi.Type{T: abi.FixedBytesTy, Size: 32}}, // channelId
		{Type: abi.Type{T: abi.BytesTy}},                // data
		{Type: allocationType},                          // allocations as tuple[]
	}

	packed, err := args.Pack(channelID, stateData, allocations)
	if err != nil {
		return nil, err
	}
	return packed, nil
}
