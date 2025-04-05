package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
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

// BlockchainClient defines the interface for blockchain interactions
type BlockchainClient interface {
	Join(channelID string) error
}

// EventHandler manages incoming MultiBaas webhook events
type EventHandler struct {
	webhookSecret    string
	ledger           *Ledger
	channelService   *ChannelService
	brokerAddress    string
	blockchainClient BlockchainClient
}

// NewEventHandler creates a new webhook handler
func NewEventHandler(secret string, ledger *Ledger, channelService *ChannelService, brokerAddress string, blockchainClient BlockchainClient) *EventHandler {
	return &EventHandler{
		webhookSecret:    secret,
		ledger:           ledger,
		channelService:   channelService,
		brokerAddress:    brokerAddress,
		blockchainClient: blockchainClient,
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

	if signature == "" || timestamp == "" {
		log.Printf("[Webhook] Error: Missing signature headers")
		http.Error(w, "Missing signature headers", http.StatusBadRequest)
		return
	}

	// Check if timestamp is recent (within 5 minutes)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		log.Printf("[Webhook] Error parsing timestamp '%s': %v", timestamp, err)
		http.Error(w, "Invalid timestamp", http.StatusBadRequest)
		return
	}

	// Validate timestamp is recent (within 5 minutes)
	timeDiff := time.Now().Unix() - ts
	if timeDiff > 300 {
		log.Printf("[Webhook] Error: Timestamp too old, diff: %d seconds", timeDiff)
		http.Error(w, "Timestamp too old", http.StatusBadRequest)
		return
	}

	// Validate signature
	validSig := h.validateSignature(body, signature, timestamp)
	log.Printf("[Webhook] Signature validation result: %v", validSig)
	
	if !validSig {
		log.Printf("[Webhook] Error: Invalid signature")
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse the webhook payload
	var webhookReq WebhookRequest
	if err := json.Unmarshal(body, &webhookReq); err != nil {
		log.Printf("[Webhook] Error parsing webhook payload: %v", err)
		http.Error(w, "Error parsing webhook payload", http.StatusBadRequest)
		return
	}

	log.Printf("[Webhook] Successfully parsed payload with %d events", len(webhookReq.Events))

	// Process each event
	for i, event := range webhookReq.Events {
		log.Printf("[Webhook] Processing event %d: ID=%s, Type=%s", i, event.ID, event.Event)
		if event.Event == "event.emitted" {
			h.processEvent(&event)
		} else {
			log.Printf("[Webhook] Skipping event with type: %s", event.Event)
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

	log.Printf("[ChannelOpened] Extracted params - Channel ID: %s, Participants: %s and %s, Token: %s",
		channelID, participantA, participantB, tokenAddress)

	// Get or create the channel in our system
	channel, err := h.channelService.GetOrCreateChannel(channelID, participantA, tokenAddress)
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

	// Log participant information
	for i, participant := range e.Channel.Participants {
		log.Printf("[ChannelCreated] Participant %d: %s", i, participant.Hex())
	}

	// Check if the broker is the second participant (index 1)
	log.Printf("[ChannelCreated] Checking if broker (%s) is participant", h.brokerAddress)
	if e.Channel.Participants[1].Hex() == h.brokerAddress {
		log.Printf("[ChannelCreated] Broker is participant in channel %s, joining...", channelID)

		// Broker should call join() on the blockchain for this channel
		if err := h.blockchainClient.Join(channelID.Hex()); err != nil {
			log.Printf("[ChannelCreated] Error: failed to join channel %s: %v", channelID.Hex(), err)
			return
		}

		log.Printf("[ChannelCreated] Successfully initiated join for channel %s", channelID)
	} else {
		log.Printf("[ChannelCreated] Broker is not a participant in this channel, skipping join")
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
