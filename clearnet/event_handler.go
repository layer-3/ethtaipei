package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// NoditEvent represents events from Nodit webhook format
type NoditEvent struct {
	SubscriptionID   string `json:"subscriptionId"`
	Description      string `json:"description"`
	Protocol         string `json:"protocol"`
	Network          string `json:"network"`
	SubscriptionType string `json:"subscriptionType"`
	Notification     struct {
		WebhookURL string `json:"webhookUrl"`
	} `json:"notification"`
	EventType string `json:"eventType"`
	Event     struct {
		TargetAddress string         `json:"targetAddress"`
		Topics        []string       `json:"topics"`
		Messages      []NoditMessage `json:"messages"`
	} `json:"event"`
	CreatedAt string `json:"createdAt"`
}

type NoditMessage struct {
	Address          string   `json:"address"`
	Topics           []string `json:"topics"`
	Data             string   `json:"data"`
	BlockNumber      int64    `json:"block_number"`
	TransactionHash  string   `json:"transaction_hash"`
	TransactionIndex int      `json:"transaction_index"`
	LogIndex         int      `json:"log_index"`
	BlockHash        string   `json:"block_hash"`
	BlockTimestamp   int64    `json:"block_timestamp"`
	Removed          bool     `json:"removed"`
	Type             string   `json:"type"`
}

// EventHandler manages incoming MultiBaas webhook events
type EventHandler struct {
	webhookSecret     string
	ledger            *Ledger
	channelService    *ChannelService
	brokerAddress     string
	blockchainClients map[string]*CustodyClientWrapper // Map of network ID to blockchain client
}

// NewEventHandler creates a new webhook handler
func NewEventHandler(ledger *Ledger, channelService *ChannelService, brokerAddress string, clients ...*CustodyClientWrapper) *EventHandler {
	// Initialize a map to store clients by network ID
	clientMap := make(map[string]*CustodyClientWrapper)

	for _, client := range clients {
		if client != nil {
			networkID := client.GetNetworkID()
			clientMap[networkID] = client
		}
	}

	return &EventHandler{
		ledger:            ledger,
		channelService:    channelService,
		brokerAddress:     brokerAddress,
		blockchainClients: clientMap,
	}
}

// validateSignature validates the MultiBaas webhook signature
func (h *EventHandler) validateSignature(payload []byte, signature, timestamp string) bool {
	// Simple implementation - in production, use proper HMAC-SHA256
	if h.webhookSecret == "" {
		return true // For development, accept all if no secret set
	}

	// Create the string to sign (timestamp + "." + body)
	stringToSign := timestamp + "." + string(payload)

	// Create HMAC-SHA256 with the secret key
	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write([]byte(stringToSign))

	// Get the signature
	calculatedSignature := hex.EncodeToString(mac.Sum(nil))

	// Compare with provided signature
	return hmac.Equal([]byte(signature), []byte(calculatedSignature))
}

// ServeHTTP implements the http.Handler interface for WebhookHandler
func (h *EventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log.Printf("[Webhook] Received webhook request from %s", r.RemoteAddr)

	if r.Method != http.MethodPost {
		log.Printf("[Webhook] Error: Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[Webhook] Error reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	// Debug log the payload
	log.Printf("[Webhook] Received payload: %s", string(body))

	// Validate the signature
	signature := r.Header.Get("X-MultiBaas-Signature")
	timestamp := r.Header.Get("X-MultiBaas-Timestamp")

	log.Printf("[Webhook] Headers - Signature: %s, Timestamp: %s", signature, timestamp)

	// Optional header validation for testing
	if signature == "" || timestamp == "" {
		log.Printf("[Webhook] Warning: Missing signature headers - continuing anyway for testing")
		// Use a default timestamp for testing if missing
		if timestamp == "" {
			timestamp = fmt.Sprintf("%d", time.Now().Unix())
			log.Printf("[Webhook] Using current time as default timestamp: %s", timestamp)
		}
		// http.Error(w, "Missing signature headers", http.StatusBadRequest)
		// return
	}

	// Check if timestamp is recent (within 5 minutes)
	ts := time.Now().Unix() // Default to current time
	if timestamp != "" {
		var parseErr error
		ts, parseErr = strconv.ParseInt(timestamp, 10, 64)
		if parseErr != nil {
			log.Printf("[Webhook] Error parsing timestamp '%s': %v - using current time instead", timestamp, parseErr)
			ts = time.Now().Unix()
		}
	}

	// Validate timestamp is recent (within 5 minutes)
	timeDiff := time.Now().Unix() - ts
	if timeDiff > 300 {
		log.Printf("[Webhook] Warning: Timestamp is old, diff: %d seconds", timeDiff)
		// Commented out for testing
		// http.Error(w, "Timestamp too old", http.StatusBadRequest)
		// return
	}

	log.Printf("[Webhook] Timestamp validation bypassed for testing")

	// Validate signature
	validSig := h.validateSignature(body, signature, timestamp)
	log.Printf("[Webhook] Signature validation result: %v", validSig)

	// First try to parse as a Nodit webhook
	var noditEvent NoditEvent
	noditErr := json.Unmarshal(body, &noditEvent)
	if noditErr != nil {
		log.Printf("[Webhook] Error parsing Nodit event: %v", noditErr)
		http.Error(w, "Invalid Nodit event", http.StatusBadRequest)
		return
	}
	h.processNoditEvent(&noditEvent)

	// Return success
	log.Printf("[Webhook] Webhook processing completed successfully")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "{\"status\":\"ok\"}")
}

// processNoditEvent handles incoming events from Nodit webhooks
func (h *EventHandler) processNoditEvent(event *NoditEvent) {
	log.Printf("[Nodit] Processing Nodit webhook event, target address: %s", event.Event.TargetAddress)

	// Debug: Print complete event details for debugging
	eventData, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("[Nodit] Full event data: %s", string(eventData))

	// Process each message in the event
	for i, message := range event.Event.Messages {
		log.Printf("[Nodit] Processing message %d from block %d, tx: %s",
			i, message.BlockNumber, message.TransactionHash)

		// Check if the topics match known event signatures
		if len(message.Topics) > 0 {
			// First topic is the event signature
			eventSignature := message.Topics[0]
			log.Printf("[Nodit] Event signature: %s", eventSignature)

			// Check common ERC20 Transfer event signature - 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
			if eventSignature == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" {
				h.handleERC20Transfer(message)
			} else if eventSignature == "0x9cf47bec6921029dd28de10cd49d84ea4f8ff5520f34e71399741090651b0cc6" {
				log.Printf("[Nodit] ChannelCreated event detected")
				ethLog := noditMessageToEthLog(message)
				h.handleChannelCreatedEventNodit(event.Network, ethLog)
			} else if eventSignature == "0xd087f17acc177540af5f382bc30c65363705b90855144d285a822536ee11fdd1" {
				log.Printf("[Nodit] ChannelOpened event detected")
				ethLog := noditMessageToEthLog(message)
				h.handleChannelOpenedEventNodit(ethLog)
			} else {
				// Handle other event types based on their signatures
				// This can be expanded with additional event signature checks
				log.Printf("[Nodit] Unhandled event signature: %s", eventSignature)
			}
		}
	}

	log.Printf("[Nodit] Completed processing Nodit webhook event")
}

// handleERC20Transfer processes ERC20 transfer events from Nodit webhooks
func (h *EventHandler) handleERC20Transfer(message NoditMessage) {
	log.Printf("[ERC20Transfer] Processing Transfer event from transaction: %s", message.TransactionHash)

	// For ERC20 Transfer: topic[0] = signature, topic[1] = from address, topic[2] = to address, data = value
	if len(message.Topics) < 3 {
		log.Printf("[ERC20Transfer] Error: Insufficient topics in transfer event")
		return
	}

	// Parse addresses from topics (removing padding)
	fromAddress := "0x" + strings.TrimPrefix(message.Topics[1], "0x000000000000000000000000")
	toAddress := "0x" + strings.TrimPrefix(message.Topics[2], "0x000000000000000000000000")
	tokenAddress := message.Address

	log.Printf("[ERC20Transfer] Transfer from %s to %s using token %s",
		fromAddress, toAddress, tokenAddress)

	// Parse value from data field
	valueHex := message.Data
	value := int64(0)

	if valueHex != "" && strings.HasPrefix(valueHex, "0x") {
		// Remove 0x prefix and parse hex
		valueStr := strings.TrimPrefix(valueHex, "0x")
		valueBig, success := new(big.Int).SetString(valueStr, 16)
		if success {
			// Check if the value can fit into an int64
			if valueBig.IsInt64() {
				value = valueBig.Int64()
				log.Printf("[ERC20Transfer] Parsed value: %d", value)
			} else {
				log.Printf("[ERC20Transfer] Warning: Value too large for int64, using max value")
				value = 9223372036854775807 // Max int64
			}
		} else {
			log.Printf("[ERC20Transfer] Error parsing value from data: %s", valueHex)
		}
	}

	// Here you would implement your business logic for handling transfers
	// For example, update balances in your system

	log.Printf("[ERC20Transfer] Successfully processed ERC20 transfer event")
}

func (h *EventHandler) handleChannelCreatedEventNodit(networkID string, ethLog types.Log) {
	log.Printf("[ChannelCreated] Processing ChannelCreated event for transaction: %s", ethLog.TxHash.Hex())
	custodyInstance := h.blockchainClients["0"].GetCustody()
	channelCreatedEvent, err := custodyInstance.ParseCreated(ethLog)
	if err != nil {
		log.Printf("[ChannelCreated] Error parsing event: %v", err)
		return
	}

	log.Printf("[ChannelCreated] Channel created event: %+v", channelCreatedEvent)

	if channelCreatedEvent.Channel.Participants[1].Hex() != h.brokerAddress {
		log.Printf("[ChannelCreated] Broker is not a participant in this channel, skipping join")
		return
	}

	participantA := channelCreatedEvent.Channel.Participants[0].Hex()
	tokenAddress := channelCreatedEvent.Initial.Allocations[0].Token.Hex()
	tokenAmount := channelCreatedEvent.Initial.Allocations[0].Amount

	channelID := common.HexToHash(string(channelCreatedEvent.ChannelId[:]))
	// Create or update the channel with network ID
	_, err = h.channelService.GetOrCreateChannel(
		channelID.Hex(),
		participantA,
		channelCreatedEvent.Channel.Nonce,
		channelCreatedEvent.Channel.Adjudicator.Hex(),
		networkID,
	)
	if err != nil {
		log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
		// Continue anyway as the blockchain join is more important
	}

	if client, exists := h.blockchainClients[networkID]; exists {
		log.Printf("[ChannelCreated] Using blockchain client for network: %s", networkID)
		if err := client.Join(channelID.Hex(), nil); err != nil {
			log.Printf("[ChannelCreated] Error: failed to join channel %s on network %s: %v",
				channelID.Hex(), networkID, err)
			return
		}

		// Broker should call join() on the blockchain for this channel using the selected client
		log.Printf("[ChannelCreated] Successfully initiated join for channel %s on network %s",
			channelID, networkID)
	} else {
		log.Printf("[ChannelCreated] Broker is not a participant in this channel, skipping join")
	}

	account := ledger.Account(channelID.Hex(), participantA)
	if err := account.Record(tokenAddress, tokenAmount.Int64()); err != nil {
		log.Printf("[ChannelCreated] Error recording initial balance for participant A: %v", err)
		return
	}
}
func (h *EventHandler) handleChannelOpenedEventNodit(ethLog types.Log) {
	log.Printf("[ChannelOpened] Processing ChannelOpened event for transaction: %s", ethLog.TxHash.Hex())
	custodyInstance := h.blockchainClients["0"].GetCustody()
	channelOpenedEvent, err := custodyInstance.ParseOpened(ethLog)
	if err != nil {
		log.Printf("[ChannelOpened] Error parsing event: %v", err)
		return
	}

	log.Printf("[ChannelOpened] Channel opened event: %+v", channelOpenedEvent)
}

func noditMessageToEthLog(message NoditMessage) types.Log {
	// Convert NoditMessage to ethclient.Log
	var topics []common.Hash
	for _, topic := range message.Topics {
		topics = append(topics, common.HexToHash(topic))
	}
	ethLog := &types.Log{
		Address:     common.HexToAddress(message.Address),
		Topics:      topics,
		Data:        []byte(message.Data),
		BlockNumber: uint64(message.BlockNumber),
		TxHash:      common.HexToHash(message.TransactionHash),
		TxIndex:     uint(message.TransactionIndex),
		BlockHash:   common.HexToHash(message.BlockHash),
		Index:       uint(message.LogIndex),
		Removed:     false,
	}

	return *ethLog
}
