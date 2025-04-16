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
	"gorm.io/gorm"

	"github.com/layer-3/ethtaipei/clearnet/blocksync"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/stream"
)

var (
	custodyAbi *abi.ABI
)

// CustodyClientWrapper implements the BlockchainClient interface using the Custody contract
type CustodyClientWrapper struct {
	client       *ethclient.Client
	custody      *nitrolite.Custody
	custodyAddr  common.Address
	transactOpts *bind.TransactOpts
	networkID    string
	privateKey   *ecdsa.PrivateKey
	tracker      *blocksync.Tracker
}

// NewCustodyClientWrapper creates a new custody client wrapper
func NewCustodyClientWrapper(
	client *ethclient.Client,
	custodyAddress common.Address,
	transactOpts *bind.TransactOpts,
	networkID string,
	privateKey *ecdsa.PrivateKey,
) (*CustodyClientWrapper, error) {
	custody, err := nitrolite.NewCustody(custodyAddress, client)
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

func (c *CustodyClientWrapper) SignEncodedState(encodedState []byte) (nitrolite.Signature, error) {
	sig, err := nitrolite.Sign(encodedState, c.privateKey)
	if err != nil {
		return nitrolite.Signature{}, fmt.Errorf("failed to sign encoded state: %w", err)
	}
	return nitrolite.Signature{
		V: sig.V,
		R: sig.R,
		S: sig.S,
	}, nil
}

// Join calls the join method on the custody contract
func (c *CustodyClientWrapper) Join(channelID string, lastStateData []byte) error {
	// Convert string channelID to bytes32
	channelIDBytes := common.HexToHash(channelID)

	// The broker will always join as participant with index 1 (second participant)
	index := big.NewInt(1)

	sig, err := c.SignEncodedState(lastStateData)
	if err != nil {
		return fmt.Errorf("failed to sign data: %w", err)
	}

	gasPrice, err := c.client.SuggestGasPrice(context.Background())
	if err != nil {
		return fmt.Errorf("failed to suggest gas price: %w", err)
	}

	c.transactOpts.GasPrice = gasPrice.Add(gasPrice, gasPrice)
	// Call the join method on the custody contract
	tx, err := c.custody.Join(c.transactOpts, channelIDBytes, index, sig)
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

func (c *CustodyClientWrapper) GetCustody() *nitrolite.Custody {
	return c.custody
}

func (c *CustodyClientWrapper) ListenEvents() {
	chainID, err := c.client.ChainID(context.Background())
	if err != nil {
		log.Printf("Failed to get chain ID: %v", err)
		return
	}
	log.Printf("Using chain ID: %s", chainID.String())

	// Create a new blocksync tracker for this network
	// Create a node backend with our existing client
	backendClient := &eth.NodeBackend{Client: c.client}
	
	// Set up the tracker with the correct parameter order: client, store, confirmationNumber
	confNum := blocksync.DefaultConfirmationTiers[blocksync.Safe]
	c.tracker = blocksync.NewTracker(backendClient, blockSync, &confNum)

	// Start the tracker with background context
	ctx := context.Background()
	go func() {
		if err := c.tracker.Start(ctx); err != nil {
			log.Printf("Error starting tracker: %v", err)
		}
	}()

	// Subscribe to events from the contract address
	logSub := c.tracker.SubscribeEvents(stream.Topic(c.custodyAddr.Hex()))

	// Handle subscription errors
	go func() {
		for err := range logSub.Err() {
			log.Printf("Subscription error: %v", err)
		}
	}()

	// Process events
	go func() {
		for event := range logSub.Event() {
			if event.Removed {
				continue
			}

			// Convert the event to a types.Log for processing
			ethLog := types.Log{
				Address:     common.Address(event.Address),
				Topics:      make([]common.Hash, len(event.Topics)),
				Data:        event.Data,
				BlockNumber: event.Height,
				TxHash:      common.Hash(event.TxHash),
				TxIndex:     event.TxIndex,
				BlockHash:   common.Hash(event.BlockHash),
				Index:       event.LogIndex,
				Removed:     event.Removed,
			}

			// Convert topics from eth.Hash to common.Hash
			for i, topic := range event.Topics {
				ethLog.Topics[i] = common.Hash(topic)
			}

			c.handleBlockChainEvent(ethLog)
		}
	}()
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

		if len(ev.Channel.Participants) < 2 {
			log.Println("[ChannelCreated] Error: not enough participants in the channel")
			return
		}

		participantA := ev.Channel.Participants[0].Hex()
		nonce := ev.Channel.Nonce
		participantB := ev.Channel.Participants[1].Hex()

		// Check if channel was created with the broker.
		if participantB != BrokerAddress {
			fmt.Printf("participantB [%s] is not Broker[%s]: ", participantB, BrokerAddress)
			return
		}

		// Check if there is already existing open channel with the broker
		existingOpenChannel, err := channelService.CheckExistingChannels(participantA, participantB, c.networkID)
		if err != nil {
			log.Printf("[ChannelCreated] Error checking channels in database: %v", err)
			return
		}

		if existingOpenChannel != nil {
			log.Printf("[ChannelCreated] An open direct channel with broker already exists: %s", existingOpenChannel.ChannelID)
			// return // Do not return for debug reason
			// TODO: uncomment
		}

		channelID := common.BytesToHash(ev.ChannelId[:])
		err = channelService.CreateChannel(
			channelID.Hex(),
			participantA,
			nonce,
			ev.Channel.Adjudicator.Hex(),
			c.networkID,
		)
		if err != nil {
			log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
			return
		}

		encodedState, err := nitrolite.EncodeState(ev.ChannelId, ev.Initial.Data, ev.Initial.Allocations)
		if err != nil {
			log.Printf("[ChannelCreated] Error encoding state hash: %v", err)
			return
		}

		// TODO: We need to join on "Created" event, but record channel creation in the db om Joined event.
		if err := c.Join(channelID.Hex(), encodedState); err != nil {
			log.Printf("[ChannelCreated] Error joining channel: %v", err)
			return
		}

		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s", channelID, c.networkID)

		// TODO: create channel and record allocations in one transaction
		for _, allocation := range ev.Initial.Allocations {
			account := ledger.Account(channelID.Hex(), allocation.Destination.Hex())
			if err := account.Record(allocation.Token.Hex(), allocation.Amount.Int64()); err != nil {
				log.Printf("[ChannelCreated] Error recording initial balance for participant A: %v", err)
				return
			}
		}

	case custodyAbi.Events["Joined"].ID:
		ev, err := c.custody.ParseJoined(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Joined event data: %+v\n", ev)

	case custodyAbi.Events["ChannelClosed"].ID:
		ev, err := c.custody.ParseChannelClosed(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("ChannelClosed event data: %+v\n", ev)

		channelID := common.BytesToHash(ev.ChannelId[:])
		openDirectChannel, err := channelService.GetChannelByID(channelID.Hex())
		if err != nil {
			log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
			return
		}

		// TODO: add broker accounting for direct channels.
		account := ledger.Account(channelID.Hex(), openDirectChannel.ParticipantA)

		err = ledger.db.Transaction(func(tx *gorm.DB) error {
			account.db = tx
			balances, err := account.Balances()
			if err != nil {
				log.Printf("[ChannelCreated] Error getting balances for participant: %v", err)
				return err
			}

			for tokenAddress, balance := range balances {
				if err := account.Record(tokenAddress, -balance); err != nil {
					log.Printf("[ChannelCreated] Error recording initial balance for participant A: %v", err)
					return err
				}
			}

			err = CloseChannel(tx, channelID.Hex())
			if err != nil {
				log.Printf("[ChannelCreated] Error closing channel: %v", err)
				return err
			}
			return nil
		})
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}
