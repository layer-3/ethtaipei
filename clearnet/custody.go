package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"gorm.io/gorm"
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
	signer       *Signer
}

// NewCustodyClientWrapper creates a new custody client wrapper
func NewCustodyClientWrapper(
	client *ethclient.Client,
	custodyAddress common.Address,
	transactOpts *bind.TransactOpts,
	networkID string,
	signer *Signer,
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
		signer:       signer,
	}, nil
}

// Join calls the join method on the custody contract
func (c *CustodyClientWrapper) Join(channelID string, lastStateData []byte) error {
	// Convert string channelID to bytes32
	channelIDBytes := common.HexToHash(channelID)

	// The broker will always join as participant with index 1 (second participant)
	index := big.NewInt(1)

	sig, err := c.signer.NitroSign(lastStateData)
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

// GetCustody returns the underlying Custody contract instance
func (c *CustodyClientWrapper) GetCustody() *nitrolite.Custody {
	return c.custody
}

// ListenEvents initializes event listening for the custody contract
func (c *CustodyClientWrapper) ListenEvents(ctx context.Context) {
	// TODO: store processed events in a database
	ListenEvents(ctx, c.client, c.networkID, c.custodyAddr, c.networkID, 0, c.handleBlockChainEvent)
}

// MultiNetworkCustodyWrapper manages custody clients across multiple networks
type MultiNetworkCustodyWrapper struct {
	clients        map[string]*CustodyClientWrapper
	defaultChainID string
}

// NewMultiNetworkCustodyWrapper creates a new multi-network custody wrapper
func NewMultiNetworkCustodyWrapper(clients map[string]*CustodyClientWrapper, defaultChainID string) *MultiNetworkCustodyWrapper {
	return &MultiNetworkCustodyWrapper{
		clients:        clients,
		defaultChainID: defaultChainID,
	}
}

// GetClient returns a client for the specified network ID
func (m *MultiNetworkCustodyWrapper) GetClient(networkID string) *CustodyClientWrapper {
	if client, ok := m.clients[networkID]; ok {
		return client
	}
	return nil
}

// GetDefaultClient returns the default client
func (m *MultiNetworkCustodyWrapper) GetDefaultClient() *CustodyClientWrapper {
	return m.clients[m.defaultChainID]
}

// ListenAllEvents initializes event listeners for all networks
func (m *MultiNetworkCustodyWrapper) ListenAllEvents(ctx context.Context) {
	for _, client := range m.clients {
		go client.ListenEvents(ctx)
	}
}

// handleBlockChainEvent processes different event types received from the blockchain
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
			return
		}

		tokenAddress := ev.Initial.Allocations[0].Token.Hex()
		tokenAmount := ev.Initial.Allocations[0].Amount

		channelID := common.BytesToHash(ev.ChannelId[:])
		err = channelService.CreateChannel(
			channelID.Hex(),
			participantA,
			nonce,
			ev.Channel.Adjudicator.Hex(),
			c.networkID,
			tokenAddress,
			tokenAmount.Int64(),
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

		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s",
			channelID, c.networkID)

		account := ledger.SelectBeneficiaryAccount(channelID.Hex(), participantA)
		fmt.Println("recording token address:", tokenAddress)
		fmt.Println("recording token amount:", tokenAmount.Int64())

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

	case custodyAbi.Events["Closed"].ID:
		ev, err := c.custody.ParseClosed(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Closed event data: %+v\n", ev)

		channelID := common.BytesToHash(ev.ChannelId[:])

		err = ledger.db.Transaction(func(tx *gorm.DB) error {
			var channel Channel
			result := tx.Where("channel_id = ?", channelID.Hex()).First(&channel)
			if result.Error != nil {
				if errors.Is(result.Error, gorm.ErrRecordNotFound) {
					return fmt.Errorf("channel with ID %s not found", channelID)
				}
				return fmt.Errorf("error finding channel: %w", result.Error)
			}

			// Update the channel status to "closed"
			channel.Status = ChannelStatusClosed
			participantA := channel.ParticipantA
			channel.Amount = 0
			channel.UpdatedAt = time.Now()
			channel.Version++
			if err := tx.Save(&channel).Error; err != nil {
				return fmt.Errorf("failed to close channel: %w", err)
			}

			account := ledger.SelectBeneficiaryAccount(channelID.Hex(), participantA)
			account.db = tx
			balance, err := account.Balance()
			if err != nil {
				log.Printf("[Closed] Error getting balances for participant: %v", err)
				return err
			}

			if err := account.Record(-balance); err != nil {
				log.Printf("[Closed] Error recording initial balance for participant A: %v", err)
				return err
			}

			log.Printf("Closed channel with ID: %s", channelID)

			return nil
		})
		if err != nil {
			log.Printf("[Closed] Error closing channel in database: %v", err)
			return
		}
	case custodyAbi.Events["Resized"].ID:
		ev, err := c.custody.ParseResized(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Closed event data: %+v\n", ev)

		channelID := common.BytesToHash(ev.ChannelId[:])

		change := ev.DeltaAllocations[0]
		var channel Channel
		result := ledger.db.Where("channel_id = ?", channelID).First(&channel)
		if result.Error != nil {
			log.Println("error finding channel:", result.Error)
			return
		}

		channel.Amount += change.Int64()
		channel.UpdatedAt = time.Now()
		channel.Version++
		if err := ledger.db.Save(&channel).Error; err != nil {
			log.Printf("[Resized] Error saving channel in database: %v", err)
			return
		}
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}
