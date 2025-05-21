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
	"github.com/prometheus/client_golang/prometheus"
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
		log.Printf("[Created] Event data: %+v\n", ev)
		if err != nil {
			fmt.Println("error parsing Created event:", err)
			return
		}

		if len(ev.Channel.Participants) < 2 {
			log.Println("[Created] Error: not enough participants in the channel")
			return
		}

		participantA := ev.Channel.Participants[0].Hex()
		participantB := ev.Channel.Participants[1].Hex()
		tokenAddress := ev.Initial.Allocations[0].Token.Hex()
		tokenAmount := ev.Initial.Allocations[0].Amount.Int64()
		channelID := common.BytesToHash(ev.ChannelId[:]).Hex()
		nonce := ev.Channel.Nonce

		// Check if channel was created with the broker.
		if participantB != BrokerAddress {
			fmt.Printf("participantB [%s] is not Broker[%s]: ", participantB, BrokerAddress)
			return
		}

		// Allow only one channel with broker per token per network.
		existingOpenChannel, err := CheckExistingChannels(c.ledger.db, participantA, participantB, c.networkID, tokenAddress)
		if err != nil {
			log.Printf("[Created] Error checking channels in database: %v", err)
			return
		}

		if existingOpenChannel != nil {
			log.Printf("[Created] An open channel with broker already exists: %s", existingOpenChannel.ChannelID)
			return
		}

		err = CreateChannel(
			c.ledger.db,
			channelID,
			participantA,
			nonce,
			ev.Channel.Adjudicator.Hex(),
			c.networkID,
			tokenAddress,
			tokenAmount,
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

		if err := c.Join(channelID, encodedState); err != nil {
			log.Printf("[ChannelCreated] Error joining channel: %v", err)
			return
		}

		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s", channelID, c.networkID)

	case custodyAbi.Events["Joined"].ID:
		ev, err := c.custody.ParseJoined(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Joined event data: %+v\n", ev)

		channelID := common.BytesToHash(ev.ChannelId[:]).Hex()
		err = c.ledger.db.Transaction(func(tx *gorm.DB) error {
			var channel Channel
			result := tx.Where("channel_id = ?", channelID).First(&channel)
			if result.Error != nil {
				if errors.Is(result.Error, gorm.ErrRecordNotFound) {
					return fmt.Errorf("channel with ID %s not found", channelID)
				}
				return fmt.Errorf("error finding channel: %w", result.Error)
			}

			// Update the channel status to "open"
			channel.Status = ChannelStatusOpen
			channel.UpdatedAt = time.Now()
			if err := tx.Save(&channel).Error; err != nil {
				return fmt.Errorf("failed to close channel: %w", err)
			}
			log.Printf("Joined channel with ID: %s", channelID)

			channelAccount := c.ledger.SelectBeneficiaryAccount(channelID, channel.ParticipantA)
			if err := channelAccount.Record(channel.Amount); err != nil {
				log.Printf("[ChannelCreated] Error recording initial balance for participant A: %v", err)
				return err
			}

			asset, ok := getAssetFromTokenNetwork(channel.Token, c.networkID)
			if !ok {
				log.Println("Error: asset not found for token network:", channel.Token, c.networkID)
				return nil
			}

			account := SelectUnifiedAccount(tx, asset, channel.ParticipantA)
			if err := account.Record(channel.Amount); err != nil {
				log.Printf("Error recording initial balance for participant A: %v", err)
				return err
			}

			return nil
		})
		if err != nil {
			log.Printf("[Joined] Error closing channel in database: %v", err)
			return
		}

	case custodyAbi.Events["Closed"].ID:
		ev, err := c.custody.ParseClosed(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("Closed event data: %+v\n", ev)

		channelID := common.BytesToHash(ev.ChannelId[:]).Hex()

		err = c.ledger.db.Transaction(func(tx *gorm.DB) error {
			var channel Channel
			result := tx.Where("channel_id = ?", channelID).First(&channel)
			if result.Error != nil {
				if errors.Is(result.Error, gorm.ErrRecordNotFound) {
					return fmt.Errorf("channel with ID %s not found", channelID)
				}
				return fmt.Errorf("error finding channel: %w", result.Error)
			}

			// Update the channel status to "closed"
			channel.Status = ChannelStatusClosed
			channel.Amount = 0
			channel.UpdatedAt = time.Now()
			channel.Version++
			if err := tx.Save(&channel).Error; err != nil {
				return fmt.Errorf("failed to close channel: %w", err)
			}

			channelAccount := c.ledger.SelectBeneficiaryAccount(channelID, channel.ParticipantA)
			channelAccount.db = tx
			balance, err := channelAccount.Balance()
			if err != nil {
				log.Printf("[Closed] Error getting balances for participant: %v", err)
				return err
			}

			if err := channelAccount.Record(-balance); err != nil {
				log.Printf("Error recording initial balance for participant A: %v", err)
				return err
			}

			asset, ok := getAssetFromTokenNetwork(channel.Token, c.networkID)
			if !ok {
				log.Printf("(unsupported) failed to find asset for token: %s on network: %s", channel.Token, channel.NetworkID)
				return nil
			}

			account := SelectUnifiedAccount(tx, asset, channel.ParticipantA)
			if err := account.Record(-balance); err != nil {
				log.Printf("Error recording initial balance for participant A: %v", err)
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
		log.Printf("Resized event data: %+v\n", ev)

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

// UpdateBalanceMetrics fetches the broker's account information from the smart contract and updates metrics
func (c *Custody) UpdateBalanceMetrics(ctx context.Context, tokens []common.Address, metrics *Metrics) {
	if metrics == nil {
		logger.Errorw("Metrics not initialized for custody client", "network", c.networkID)
		return
	}

	brokerAddr := common.HexToAddress(BrokerAddress)

	for _, token := range tokens {
		// Create a call opts with the provided context
		callOpts := &bind.CallOpts{
			Context: ctx,
		}

		logger.Infow("Fetching account info", "network", c.networkID, "token", token.Hex(), "broker", brokerAddr.Hex())
		// Call getAccountInfo on the custody contract
		info, err := c.custody.GetAccountInfo(callOpts, brokerAddr, token)
		if err != nil {
			logger.Errorw("Failed to get account info", "network", c.networkID, "token", token.Hex(), "error", err)
			continue
		}

		// Update the metrics
		metrics.BrokerBalanceAvailable.With(prometheus.Labels{
			"network": c.networkID,
			"token":   token.Hex(),
		}).Set(float64(info.Available.Int64()))

		metrics.BrokerChannelCount.With(prometheus.Labels{
			"network": c.networkID,
			"token":   token.Hex(),
		}).Set(float64(info.ChannelCount.Int64()))

		logger.Infow("Updated contract balance metrics", "network", c.networkID, "token", token.Hex(), "available", info.Available.String(), "channels", info.ChannelCount.String())
	}
}
