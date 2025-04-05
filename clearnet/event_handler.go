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
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	// Validate the signature
	signature := r.Header.Get("X-MultiBaas-Signature")
	timestamp := r.Header.Get("X-MultiBaas-Timestamp")

	if signature == "" || timestamp == "" {
		http.Error(w, "Missing signature headers", http.StatusBadRequest)
		return
	}

	// Check if timestamp is recent (within 5 minutes)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		http.Error(w, "Invalid timestamp", http.StatusBadRequest)
		return
	}

	// Validate timestamp is recent (within 5 minutes)
	if time.Now().Unix()-ts > 300 {
		http.Error(w, "Timestamp too old", http.StatusBadRequest)
		return
	}

	// Validate signature
	if !h.validateSignature(body, signature, timestamp) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse the webhook payload
	var webhookReq WebhookRequest
	if err := json.Unmarshal(body, &webhookReq); err != nil {
		http.Error(w, "Error parsing webhook payload", http.StatusBadRequest)
		return
	}

	// Process each event
	for _, event := range webhookReq.Events {
		if event.Event == "event.emitted" {
			h.processEvent(&event)
		}
	}

	// Return success
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "{\"status\":\"ok\"}")
}

// processEvent handles different types of emitted events
func (h *EventHandler) processEvent(event *MultiBaasEvent) {
	log.Printf("Processing event: %s", event.Data.Event.Name)

	// Based on the event name/type, call different handlers
	switch event.Data.Event.Name {
	case "ChannelCreated":
		h.handleChannelCreatedEvent(event)
	case "ChannelOpened":
		h.handleChannelOpenedEvent(event)
	case "ChannelClosed":
		h.handleChannelClosedEvent(event)
	default:
		log.Printf("Unhandled event type: %s", event.Data.Event.Name)
	}
}

// handleChannelOpenedEvent processes ChannelOpened events
func (h *EventHandler) handleChannelOpenedEvent(event *MultiBaasEvent) {
	fmt.Println(event)

	channelID, ok := event.Data.Event.InputParams["channelId"].(string)
	if !ok {
		log.Printf("Error: ChannelOpened event missing 'channelId'")
		return
	}

	participantA, ok := event.Data.Event.InputParams["participantA"].(string)
	if !ok {
		log.Printf("Error: ChannelOpened event missing 'participantA'")
		return
	}

	participantB, ok := event.Data.Event.InputParams["participantB"].(string)
	if !ok {
		log.Printf("Error: ChannelOpened event missing 'participantB'")
		return
	}

	tokenAddress, ok := event.Data.Event.InputParams["tokenAddress"].(string)
	if !ok {
		log.Printf("Error: ChannelOpened event missing 'tokenAddress'")
		return
	}

	// Get or create the channel in our system
	_, err := h.channelService.GetOrCreateChannel(channelID, participantA, tokenAddress)
	if err != nil {
		log.Printf("Error creating/getting channel: %v", err)
		return
	}

	// Convert initialBalanceA to int64
	var initialBalanceA int64
	switch v := event.Data.Event.InputParams["initialBalanceA"].(type) {
	case float64:
		initialBalanceA = int64(v)
	case string:
		// Try to parse string as number
		if strings.HasPrefix(v, "0x") {
			// Parse hex string
			valueInt, err := strconv.ParseInt(v[2:], 16, 64)
			if err != nil {
				log.Printf("Error parsing hex initialBalanceA: %v", err)
				return
			}
			initialBalanceA = valueInt
		} else {
			// Parse decimal string
			valueInt, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				log.Printf("Error parsing decimal initialBalanceA: %v", err)
				return
			}
			initialBalanceA = valueInt
		}
	default:
		log.Printf("Unsupported initialBalanceA type: %T", v)
		return
	}

	// Convert initialBalanceB to int64
	var initialBalanceB int64
	switch v := event.Data.Event.InputParams["initialBalanceB"].(type) {
	case float64:
		initialBalanceB = int64(v)
	case string:
		// Try to parse string as number
		if strings.HasPrefix(v, "0x") {
			// Parse hex string
			valueInt, err := strconv.ParseInt(v[2:], 16, 64)
			if err != nil {
				log.Printf("Error parsing hex initialBalanceB: %v", err)
				return
			}
			initialBalanceB = valueInt
		} else {
			// Parse decimal string
			valueInt, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				log.Printf("Error parsing decimal initialBalanceB: %v", err)
				return
			}
			initialBalanceB = valueInt
		}
	default:
		log.Printf("Unsupported initialBalanceB type: %T", v)
		return
	}

	log.Printf("ChannelOpened event: Channel %s opened between %s and %s with token %s",
		channelID, participantA, participantB, tokenAddress)
	log.Printf("Initial balances: A=%d, B=%d", initialBalanceA, initialBalanceB)

	// TODO: update calculations

	// Create accounts for the participants and record initial balances
	if initialBalanceA > 0 {
		accountA := h.ledger.Account(channelID, participantA, tokenAddress)
		if err := accountA.Record(initialBalanceA); err != nil {
			log.Printf("Error recording initial balance for participant A: %v", err)
			return
		}
	}

	if initialBalanceB > 0 {
		accountB := h.ledger.Account(channelID, participantB, tokenAddress)
		if err := accountB.Record(initialBalanceB); err != nil {
			log.Printf("Error recording initial balance for participant B: %v", err)
			return
		}
	}

	log.Printf("Successfully recorded channel opening in system")
}

func (h *EventHandler) handleChannelCreatedEvent(event *MultiBaasEvent) {
	fmt.Println(event)

	e := CreatedEvent{}
	channelID := nitrolite.GetChannelID(e.Channel)

	if len(e.Channel.Participants) < 2 {
		log.Printf("Error: channel %s has insufficient participants", channelID)
		return
	}

	// Check if the broker is the second participant (index 1)
	if e.Channel.Participants[1].Hex() == h.brokerAddress {
		log.Printf("Broker is participant in channel %s, joining...", channelID)

		// Broker should call join() on the blockchain for this channel
		if err := h.blockchainClient.Join(channelID.Hex()); err != nil {
			log.Printf("Error: failed to join channel %s: %v", channelID.Hex(), err)
			return
		}

		log.Printf("Successfully initiated join for channel %s", channelID)
	}
}

// handleChannelClosedEvent processes ChannelClosed events
func (h *EventHandler) handleChannelClosedEvent(event *MultiBaasEvent) {
	fmt.Println(event)
}
