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

		// TODO: verify that ParticipantB is the broker.
		// Commented because dont want to break the current deployment.
		// participantB := ev.Channel.Participants[1].Hex()
		// if participantB != BrokerAddress {
		// 	return
		// }

		participantA := ev.Channel.Participants[0].Hex()
		tokenAddress := ev.Initial.Allocations[0].Token.Hex()
		tokenAmount := ev.Initial.Allocations[0].Amount
		nonce := ev.Channel.Nonce

		channelID := common.BytesToHash(ev.ChannelId[:])
		// Create or update the channel with network ID
		_, err = channelService.GetOrCreateChannel(
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
		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s",
			channelID, c.networkID)

		// TODO: Broker also needs to keep record for himself.
		account := ledger.Account(channelID.Hex(), participantA)
		if err := account.Record(tokenAddress, tokenAmount.Int64()); err != nil {
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
	case custodyAbi.Events["ChannelClosed"].ID:
		ev, err := c.custody.ParseChannelClosed(l)
		if err != nil {
			log.Println("error parsing ChannelJoined event:", err)
			return
		}
		log.Printf("ChannelClosed event data: %+v\n", ev)

		// Assumption: User have only one direct channel with the broker.
		// Assumption: We expect that participants agreed and closed virual channels.

		channelID := common.BytesToHash(ev.ChannelId[:])
		openDirectChannel, err := channelService.GetChannelByID(channelID.Hex())
		if err != nil {
			log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
			return
		}
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
			return nil
		})
	default:
		fmt.Println("Unknown event ID:", eventID.Hex())
	}
}
