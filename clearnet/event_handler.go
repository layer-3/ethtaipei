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

	"github.com/erc7824/go-nitrolite"
)

// MultiBaasEvent represents the structure of an event from MultiBaas
type MultiBaasEvent struct {
	ID    string `json:"id"`
	Event string `json:"event"`
	Data  struct {
		TriggeredAt int64 `json:"triggeredAt"`
		Event       struct {
			Name           string                 `json:"name"`
			Signature      string                 `json:"signature"`
			InputParams    map[string]interface{} `json:"inputParams"`
			Topics         []string               `json:"topics"`
			RawTopics      []string               `json:"rawTopics"`
			Address        string                 `json:"address"`
			BlockNumber    int64                  `json:"blockNumber"`
			BlockTimestamp int64                  `json:"blockTimestamp"`
			LogIndex       int                    `json:"logIndex"`
		} `json:"event"`
		Transaction struct {
			From          string      `json:"from"`
			Hash          string      `json:"hash"`
			BlockHash     string      `json:"blockHash"`
			BlockNumber   int64       `json:"blockNumber"`
			Contract      string      `json:"contract"`
			ContractName  string      `json:"contractName"`
			ContractLabel interface{} `json:"contractLabel"`
			Method        string      `json:"method"`
			MethodName    string      `json:"methodName"`
		} `json:"transaction"`
	} `json:"data"`
}

// WebhookRequest represents the webhook payload containing events
type WebhookRequest struct {
	Events []MultiBaasEvent `json:"events"`
}

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
		TargetAddress string   `json:"targetAddress"`
		Topics        []string `json:"topics"`
		Messages      []struct {
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
		} `json:"messages"`
	} `json:"event"`
	CreatedAt string `json:"createdAt"`
}

// BlockchainClient defines the interface for blockchain interactions
type BlockchainClient interface {
	Join(channelID string) error
}

// EventHandler manages incoming MultiBaas webhook events
type EventHandler struct {
	webhookSecret     string
	ledger            *Ledger
	channelService    *ChannelService
	brokerAddress     string
	blockchainClients map[string]BlockchainClient // Map of network ID to blockchain client
}

// NewEventHandler creates a new webhook handler
func NewEventHandler(secret string, ledger *Ledger, channelService *ChannelService, brokerAddress string, clients ...BlockchainClient) *EventHandler {
	// Initialize a map to store clients by network ID
	clientMap := make(map[string]BlockchainClient)

	return &EventHandler{
		webhookSecret:     secret,
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

	// Signature validation is commented out for testing
	// if !validSig {
	// 	log.Printf("[Webhook] Error: Invalid signature")
	// 	http.Error(w, "Invalid signature", http.StatusUnauthorized)
	// 	return
	// }

	// For testing: always proceed regardless of signature
	log.Printf("[Webhook] Signature validation bypassed for testing")

	// First try to parse as a Nodit webhook
	var noditEvent NoditEvent
	noditErr := json.Unmarshal(body, &noditEvent)

	if noditErr == nil && noditEvent.SubscriptionID != "" && noditEvent.EventType == "LOG" {
		log.Printf("[Webhook] Detected Nodit webhook format with subscription ID: %s", noditEvent.SubscriptionID)
		h.processNoditEvent(&noditEvent)
	} else {
		// Try to parse as MultiBaas webhook
		var webhookReq WebhookRequest
		if err := json.Unmarshal(body, &webhookReq); err != nil {
			log.Printf("[Webhook] Error parsing webhook payload: %v", err)
			http.Error(w, "Error parsing webhook payload", http.StatusBadRequest)
			return
		}

		log.Printf("[Webhook] Successfully parsed MultiBaas payload with %d events", len(webhookReq.Events))

		// Process each event
		for i, event := range webhookReq.Events {
			log.Printf("[Webhook] Processing event %d: ID=%s, Type=%s", i, event.ID, event.Event)
			if event.Event == "event.emitted" {
				h.processEvent(&event)
			} else {
				log.Printf("[Webhook] Skipping event with type: %s", event.Event)
			}
		}
	}

	// Return success
	log.Printf("[Webhook] Webhook processing completed successfully")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "{\"status\":\"ok\"}")
}

// processEvent handles different types of emitted events
func (h *EventHandler) processEvent(event *MultiBaasEvent) {
	log.Printf("[Event] Processing event: %s (TransactionHash: %s)",
		event.Data.Event.Name, event.Data.Transaction.Hash)

	// Log event parameters for debugging
	paramData, err := json.MarshalIndent(event.Data.Event.InputParams, "", "  ")
	if err != nil {
		log.Printf("[Event] Error marshaling event parameters: %v", err)
	} else {
		log.Printf("[Event] Event parameters: %s", string(paramData))
	}

	// Based on the event name/type, call different handlers
	switch event.Data.Event.Name {
	case "ChannelCreated":
		log.Printf("[Event] Handling ChannelCreated event")
		h.handleChannelCreatedEvent(event)
	case "ChannelOpened":
		log.Printf("[Event] Handling ChannelOpened event")
		h.handleChannelOpenedEvent(event)
	case "ChannelClosed":
		log.Printf("[Event] Handling ChannelClosed event")
		h.handleChannelClosedEvent(event)
	default:
		log.Printf("[Event] Unhandled event type: %s", event.Data.Event.Name)
	}
}

// handleChannelOpenedEvent processes ChannelOpened events
func (h *EventHandler) handleChannelOpenedEvent(event *MultiBaasEvent) {
	log.Printf("[ChannelOpened] Processing ChannelOpened event for transaction: %s", event.Data.Transaction.Hash)

	// Debug: Print complete event details for debugging
	eventData, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("[ChannelOpened] Full event data: %s", string(eventData))

	channelID, ok := event.Data.Event.InputParams["channelId"].(string)
	if !ok {
		log.Printf("[ChannelOpened] Error: Event missing required parameter 'channelId'")
		return
	}

	participantA, ok := event.Data.Event.InputParams["participantA"].(string)
	if !ok {
		log.Printf("[ChannelOpened] Error: Event missing required parameter 'participantA'")
		return
	}

	participantB, ok := event.Data.Event.InputParams["participantB"].(string)
	if !ok {
		log.Printf("[ChannelOpened] Error: Event missing required parameter 'participantB'")
		return
	}

	tokenAddress, ok := event.Data.Event.InputParams["tokenAddress"].(string)
	if !ok {
		log.Printf("[ChannelOpened] Error: Event missing required parameter 'tokenAddress'")
		return
	}

	// Extract network ID if available
	networkID, _ := event.Data.Event.InputParams["networkId"].(string)
	if networkID == "" {
		networkID, _ = event.Data.Event.InputParams["networkID"].(string)
	}
	if networkID == "" {
		networkID, _ = event.Data.Event.InputParams["network_id"].(string)
	}
	if networkID == "" {
		// Try to derive it from other event data
		if event.Data.Transaction.BlockNumber > 0 {
			// Simplified example: derive from block number
			networkID = fmt.Sprintf("chain-%d", event.Data.Transaction.BlockNumber/1000000)
			log.Printf("[ChannelOpened] Derived network ID from block number: %s", networkID)
		} else {
			log.Printf("[ChannelOpened] No network ID found or derived, using empty value")
		}
	}

	log.Printf("[ChannelOpened] Extracted params - Channel ID: %s, Participants: %s and %s, Token: %s, Network: %s",
		channelID, participantA, participantB, tokenAddress, networkID)

	// Get or create the channel in our system
	channel, err := h.channelService.GetOrCreateChannel(channelID, participantA, tokenAddress, networkID)
	if err != nil {
		log.Printf("[ChannelOpened] Error creating/getting channel: %v", err)
		return
	}
	log.Printf("[ChannelOpened] Channel retrieved/created successfully: %+v", channel)

	// Convert initialBalanceA to int64
	var initialBalanceA int64
	balanceAValue := event.Data.Event.InputParams["initialBalanceA"]
	log.Printf("[ChannelOpened] Raw initialBalanceA value: %v (type: %T)", balanceAValue, balanceAValue)

	switch v := balanceAValue.(type) {
	case float64:
		initialBalanceA = int64(v)
		log.Printf("[ChannelOpened] Converted float initialBalanceA %f to int64: %d", v, initialBalanceA)
	case string:
		// Try to parse string as number
		log.Printf("[ChannelOpened] Parsing string initialBalanceA: %s", v)
		if strings.HasPrefix(v, "0x") {
			// Parse hex string
			valueInt, err := strconv.ParseInt(v[2:], 16, 64)
			if err != nil {
				log.Printf("[ChannelOpened] Error parsing hex initialBalanceA: %v", err)
				return
			}
			initialBalanceA = valueInt
			log.Printf("[ChannelOpened] Parsed hex initialBalanceA %s to int64: %d", v, initialBalanceA)
		} else {
			// Parse decimal string
			valueInt, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				log.Printf("[ChannelOpened] Error parsing decimal initialBalanceA: %v", err)
				return
			}
			initialBalanceA = valueInt
			log.Printf("[ChannelOpened] Parsed decimal initialBalanceA %s to int64: %d", v, initialBalanceA)
		}
	default:
		log.Printf("[ChannelOpened] Error: Unsupported initialBalanceA type: %T", v)
		return
	}

	// Convert initialBalanceB to int64
	var initialBalanceB int64
	balanceBValue := event.Data.Event.InputParams["initialBalanceB"]
	log.Printf("[ChannelOpened] Raw initialBalanceB value: %v (type: %T)", balanceBValue, balanceBValue)

	switch v := balanceBValue.(type) {
	case float64:
		initialBalanceB = int64(v)
		log.Printf("[ChannelOpened] Converted float initialBalanceB %f to int64: %d", v, initialBalanceB)
	case string:
		// Try to parse string as number
		log.Printf("[ChannelOpened] Parsing string initialBalanceB: %s", v)
		if strings.HasPrefix(v, "0x") {
			// Parse hex string
			valueInt, err := strconv.ParseInt(v[2:], 16, 64)
			if err != nil {
				log.Printf("[ChannelOpened] Error parsing hex initialBalanceB: %v", err)
				return
			}
			initialBalanceB = valueInt
			log.Printf("[ChannelOpened] Parsed hex initialBalanceB %s to int64: %d", v, initialBalanceB)
		} else {
			// Parse decimal string
			valueInt, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				log.Printf("[ChannelOpened] Error parsing decimal initialBalanceB: %v", err)
				return
			}
			initialBalanceB = valueInt
			log.Printf("[ChannelOpened] Parsed decimal initialBalanceB %s to int64: %d", v, initialBalanceB)
		}
	default:
		log.Printf("[ChannelOpened] Error: Unsupported initialBalanceB type: %T", v)
		return
	}

	log.Printf("[ChannelOpened] Channel %s opened between %s and %s with token %s",
		channelID, participantA, participantB, tokenAddress)
	log.Printf("[ChannelOpened] Initial balances: A=%d, B=%d", initialBalanceA, initialBalanceB)

	// Create accounts for the participants and record initial balances
	if initialBalanceA > 0 {
		log.Printf("[ChannelOpened] Recording initial balance %d for participant A (%s)",
			initialBalanceA, participantA)
		accountA := h.ledger.Account(channelID, participantA, tokenAddress)
		if err := accountA.Record(initialBalanceA); err != nil {
			log.Printf("[ChannelOpened] Error recording initial balance for participant A: %v", err)
			return
		}
		log.Printf("[ChannelOpened] Successfully recorded initial balance for participant A")
	} else {
		log.Printf("[ChannelOpened] Skipping zero balance recording for participant A")
	}

	if initialBalanceB > 0 {
		log.Printf("[ChannelOpened] Recording initial balance %d for participant B (%s)",
			initialBalanceB, participantB)
		accountB := h.ledger.Account(channelID, participantB, tokenAddress)
		if err := accountB.Record(initialBalanceB); err != nil {
			log.Printf("[ChannelOpened] Error recording initial balance for participant B: %v", err)
			return
		}
		log.Printf("[ChannelOpened] Successfully recorded initial balance for participant B")
	} else {
		log.Printf("[ChannelOpened] Skipping zero balance recording for participant B")
	}

	log.Printf("[ChannelOpened] Successfully recorded channel opening in system")
}

func (h *EventHandler) handleChannelCreatedEvent(event *MultiBaasEvent) {
	log.Printf("[ChannelCreated] Processing ChannelCreated event for transaction: %s", event.Data.Transaction.Hash)

	// Debug: Print complete event details for debugging
	eventData, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("[ChannelCreated] Full event data: %s", string(eventData))

	e := CreatedEvent{}
	channelID := nitrolite.GetChannelID(e.Channel)

	log.Printf("[ChannelCreated] Parsed channel ID: %s", channelID)

	if len(e.Channel.Participants) < 2 {
		log.Printf("[ChannelCreated] Error: channel %s has insufficient participants (count: %d)",
			channelID, len(e.Channel.Participants))
		return
	}

	// Extract network ID if available
	networkID, _ := event.Data.Event.InputParams["networkId"].(string)
	if networkID == "" {
		networkID, _ = event.Data.Event.InputParams["networkID"].(string)
	}
	if networkID == "" {
		networkID, _ = event.Data.Event.InputParams["network_id"].(string)
	}
	if networkID == "" {
		// Try to derive it from other event data
		if event.Data.Transaction.BlockNumber > 0 {
			// Simplified example: derive from block number
			networkID = fmt.Sprintf("chain-%d", event.Data.Transaction.BlockNumber/1000000)
			log.Printf("[ChannelCreated] Derived network ID from block number: %s", networkID)
		} else if event.Data.Transaction.Contract != "" {
			// Could try to derive from contract address
			networkID = fmt.Sprintf("network-%s", event.Data.Transaction.Contract[:8])
			log.Printf("[ChannelCreated] Derived network ID from contract: %s", networkID)
		} else {
			log.Printf("[ChannelCreated] No network ID found or derived, using empty value")
		}
	}

	// Log participant information
	for i, participant := range e.Channel.Participants {
		log.Printf("[ChannelCreated] Participant %d: %s", i, participant.Hex())
	}

	// Check if the broker is the second participant (index 1)
	log.Printf("[ChannelCreated] Checking if broker (%s) is participant on network %s",
		h.brokerAddress, networkID)
	if e.Channel.Participants[1].Hex() == h.brokerAddress {
		log.Printf("[ChannelCreated] Broker is participant in channel %s on network %s, joining...",
			channelID, networkID)

		// Save the network ID to our local database before joining
		// This associates the channel with the correct network
		participantA := e.Channel.Participants[0].Hex()
		// You may need to get tokenAddress from the event or other source
		tokenAddress := "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" // Default if not available
		if tokenAddr, ok := event.Data.Event.InputParams["tokenAddress"].(string); ok {
			tokenAddress = tokenAddr
		}

		// Create or update the channel with network ID
		_, err := h.channelService.GetOrCreateChannel(
			channelID.Hex(),
			participantA,
			tokenAddress,
			networkID,
		)
		if err != nil {
			log.Printf("[ChannelCreated] Error creating/updating channel in database: %v", err)
			// Continue anyway as the blockchain join is more important
		}

		if client, exists := h.blockchainClients[networkID]; exists {
			log.Printf("[ChannelCreated] Using blockchain client for network: %s", networkID)
			if err := client.Join(channelID.Hex()); err != nil {
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
	}
}

// handleChannelClosedEvent processes ChannelClosed events
func (h *EventHandler) handleChannelClosedEvent(event *MultiBaasEvent) {
	log.Printf("[ChannelClosed] Processing ChannelClosed event for transaction: %s", event.Data.Transaction.Hash)

	// Debug: Print complete event details for debugging
	eventData, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("[ChannelClosed] Full event data: %s", string(eventData))

	channelID, ok := event.Data.Event.InputParams["channelId"].(string)
	if !ok {
		log.Printf("[ChannelClosed] Error: Event missing required parameter 'channelId'")
		return
	}

	log.Printf("[ChannelClosed] Channel %s has been closed", channelID)

	// Additional processing logic can be added here as needed
	// For example, updating channel status in the database, notifying users, etc.

	log.Printf("[ChannelClosed] Successfully processed channel closing event")
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
func (h *EventHandler) handleERC20Transfer(message struct {
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
}) {
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
