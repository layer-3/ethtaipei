package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/davecgh/go-spew/spew"
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

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to suggest gas price: %w", err)
	}
	transactOpts.GasPrice = gasPrice

	return &CustodyClientWrapper{
		client:       client,
		custody:      custody,
		custodyAddr:  custodyAddress,
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
func (c *CustodyClientWrapper) GetNetworkID() string {
	return c.networkID
}

func (c *CustodyClientWrapper) GetCustody() *Custody {
	return c.custody
}

func (c *CustodyClientWrapper) ListenEvents() {
	go func() {
		<-time.After(2 * time.Second)
		fmt.Println("Simulating event propagation...")
		c.propagateTestEvent()
		fmt.Println("Test event propagated.")
	}()
	ListenEvents(c.client, c.networkID, c.custodyAddr, c.networkID, 0, c.handleBlockChainEvent)
}

func (c *CustodyClientWrapper) handleBlockChainEvent(l types.Log) {

	fmt.Println("Received event:", l)
	eventID := l.Topics[0]
	switch eventID {
	case custodyAbi.Events["Created"].ID:
		ev, err := c.custody.ParseCreated(l)
		if err != nil {
			fmt.Println("error parsing ChannelCreated event:", err)
			return
		}
		spew.Dump(ev)
		spew.Dump(string(ev.ChannelId[:]))

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

		if err := c.Join(channelID.Hex()); err != nil {
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
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}

var testChannelOpenedEvent = `{"address":"0xdb33fec4e2994a675133320867a6439da4a5acd8","topics":["0x9cf47bec6921029dd28de10cd49d84ea4f8ff5520f34e71399741090651b0cc6","0x51333ec136d8a3f9c55bbcba2e062757804e2e9cc6d68e2f433042d6dba587b2"],"data":"0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c2ba5c5e2c4848f64187aa1f3f32a331b0c031b90000000000000000000000000000000000000000000000000000000000015180000000000000000000000000000000000000000000000000000001961aeddbea0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000422c6bd557cc07d47a62373d5c337d6b3eecb855000000000000000000000000d4d81a4e51f3b43ff181adc50cfd7b20a0638f99000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000001ec5000000000000000000000000000000000000000000000000000000000000000200000000000000000000000047b56a639d1dbe3edfb3c34b1bb583bf4312be970000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c335900000000000000000000000000000000000000000000000000000000000000fa000000000000000000000000d4d81a4e51f3b43ff181adc50cfd7b20a0638f990000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c335900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000001cedb6f56595e702622738bb61b2f42f68ba987c3e65949ca7720ae2fdd36528d012d58768780ce3042dc7632c7a9fd61966765f4a8cc3f649b9e3e8ff2fe0d452","blockNumber":"0x42d81eb","transactionHash":"0x5eb1e323419f58af542b386bbec45ddd35ab240df32d4531136bf39874a00d9a","transactionIndex":"0x57","blockHash":"0x2177f9227bbea2475972703d731bc7bfa135575c23f2788d89c57d7eaf6d77c3","logIndex":"0x14f","removed":false}`

func (c *CustodyClientWrapper) propagateTestEvent() {
	var testLog types.Log
	err := json.Unmarshal([]byte(testChannelOpenedEvent), &testLog)
	if err != nil {
		log.Fatalf("Failed to unmarshal test event: %v", err)
	}
	c.handleBlockChainEvent(testLog)
}
