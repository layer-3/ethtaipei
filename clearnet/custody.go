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

// Custody implements the BlockchainClient interface using the Custody contract
type Custody struct {
	client       *ethclient.Client
	custody      *nitrolite.Custody
	ledger       *Ledger
	custodyAddr  common.Address
	transactOpts *bind.TransactOpts
	networkID    string
	signer       *Signer
}

// NewCustody initializes the Ethereum client and custody contract wrapper.
func NewCustody(signer *Signer, ledger *Ledger, infuraURL, custodyAddressStr, networkID string) (*Custody, error) {
	custodyAddress := common.HexToAddress(custodyAddressStr)
	client, err := ethclient.Dial(infuraURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum node: %w", err)
	}

	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Create auth options for transactions.
	auth, err := bind.NewKeyedTransactorWithChainID(signer.GetPrivateKey(), chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction signer: %w", err)
	}
	auth.GasPrice = big.NewInt(30000000000) // 20 gwei.
	auth.GasLimit = uint64(3000000)

	custody, err := nitrolite.NewCustody(custodyAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to bind custody contract: %w", err)
	}

	return &Custody{
		client:       client,
		custody:      custody,
		ledger:       ledger,
		custodyAddr:  custodyAddress,
		transactOpts: auth,
		networkID:    networkID,
		signer:       signer,
	}, nil
}

// ListenEvents initializes event listening for the custody contract
func (c *Custody) ListenEvents(ctx context.Context) {
	// TODO: store processed events in a database
	listenEvents(ctx, c.client, c.networkID, c.custodyAddr, c.networkID, 0, c.handleBlockChainEvent)
}

// Join calls the join method on the custody contract
func (c *Custody) Join(channelID string, lastStateData []byte) error {
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

// handleBlockChainEvent processes different event types received from the blockchain
func (c *Custody) handleBlockChainEvent(l types.Log) {
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
		existingOpenChannel, err := CheckExistingChannels(c.ledger.db, participantA, participantB, c.networkID)
		if err != nil {
			log.Printf("[ChannelCreated] Error checking channels in database: %v", err)
			return
		}

		if existingOpenChannel != nil {
			log.Printf("[ChannelCreated] An open channel with broker already exists: %s", existingOpenChannel.ChannelID)
			return
		}

		tokenAddress := ev.Initial.Allocations[0].Token.Hex()
		tokenAmount := ev.Initial.Allocations[0].Amount

		channelID := common.BytesToHash(ev.ChannelId[:])
		err = CreateChannel(
			c.ledger.db,
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

		encodedState, err := nitrolite.EncodeState(ev.ChannelId, nitrolite.IntentINITIALIZE, big.NewInt(0), ev.Initial.Data, ev.Initial.Allocations)
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

		account := c.ledger.SelectBeneficiaryAccount(channelID.Hex(), participantA)

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

		err = c.ledger.db.Transaction(func(tx *gorm.DB) error {
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

			account := c.ledger.SelectBeneficiaryAccount(channelID.Hex(), participantA)
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

		var channel Channel
		result := c.ledger.db.Where("channel_id = ?", channelID.Hex()).First(&channel)
		if result.Error != nil {
			log.Println("error finding channel:", result.Error)
			return
		}

		for _, change := range ev.DeltaAllocations {
			channel.Amount += change.Int64()
		}

		channel.UpdatedAt = time.Now()
		channel.Version++
		if err := c.ledger.db.Save(&channel).Error; err != nil {
			log.Printf("[Resized] Error saving channel in database: %v", err)
			return
		}
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}
