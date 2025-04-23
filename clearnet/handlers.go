package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// CreateVirtualChannelParams represents parameters needed for virtual channel creation
type CreateVirtualChannelParams struct {
	Participants       []string     `json:"participants"` // Participants signer addresses spacified when creating his direct channel.
	InitialAllocations []Allocation `json:"allocations"`
	Signers            []string     `json:"signers"` // Participants agree on a set of signers required to close the channel.
}

// CloseVirtualChannelParams represents parameters needed for virtual channel closure
type CloseVirtualChannelParams struct {
	ChannelID        string       `json:"channel_id"`
	FinalAllocations []Allocation `json:"allocations"`
}

// CloseDirectChannelParams represents parameters needed for virtual channel closure
type CloseDirectChannelParams struct {
	ChannelID        string `json:"channel_id"`
	FundsDestination string `json:"funds_destination"`
}

// CloseDirectChannelResponse represents the response for closing a direct channel
type CloseDirectChannelResponse struct {
	ChannelID        string         `json:"channel_id"`
	StateData        string         `json:"state_data"`
	FinalAllocations []Allocation   `json:"allocations"`
	Signature        CloseSignature `json:"server_signature"`
}

type CloseSignature struct {
	V uint8  `json:"v,string"`
	R string `json:"r,string"`
	S string `json:"s,string"`
}

// ChannelResponse represents response data for channel operations
type ChannelResponse struct {
	ChannelID string `json:"channel_id"`
	Status    string `json:"status"`
}

// HandleCreateVirtualChannel creates a virtual channel between two participants
func HandleCreateVirtualChannel(req *RPCRequest, ledger *Ledger) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var virtualChannel CreateVirtualChannelParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &virtualChannel); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	log.Printf("Parsed parameters: %+v\n", virtualChannel)

	reqBytes, err := json.Marshal(req.Req)
	if err != nil {
		return nil, errors.New("error serializing auth message")
	}

	if len(virtualChannel.Participants) < 2 {
		return nil, errors.New("invalid number of participants")
	}

	// Allocation should be specified for each participant even if it is zero.
	if len(virtualChannel.InitialAllocations) != len(virtualChannel.Participants) {
		return nil, errors.New("invalid allocations")
	}

	// TODO: allow having more than 2 participants on the database level.
	participantA := virtualChannel.Participants[0]
	participantB := virtualChannel.Participants[1]

	// Generate a unique channel ID for the virtual channel (TODO: rethink channel ID generation)
	nitroliteChannel := nitrolite.Channel{
		Participants: []common.Address{common.HexToAddress(participantA), common.HexToAddress(participantB)},
		Adjudicator:  common.HexToAddress("0x0000000000000000000000000000000000000000"),
		Challenge:    0, // Use placeholder values for virtual channels.
		Nonce:        req.Req.Timestamp,
	}
	virtualChannelID := nitrolite.GetChannelID(nitroliteChannel)

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// Check that both participants have direct channels with the broker
		for i, participant := range virtualChannel.Participants {
			isValid, err := ValidateSignature(reqBytes, req.Sig[i], participant)
			if err != nil || !isValid {
				log.Printf("Signature verification failed: %v", err)
				return errors.New("invalid signature")
			}

			// Find the direct channel where the participant is participantA and participantB is the broker
			var directChannel DBChannel
			if err := tx.Where("participant_a = ? AND participant_b = ?",
				participant, BrokerAddress).First(&directChannel).Error; err != nil {
				return fmt.Errorf("no direct channel found for participant %s: %w", participant, err)
			}
		}

		for _, allocation := range virtualChannel.InitialAllocations {
			participantChannel, err := getDirectChannelForParticipant(tx, allocation.Participant)
			if err != nil {
				return err
			}

			account := ledgerTx.Account(participantChannel.ChannelID, allocation.Participant)
			balance, err := account.Balance(allocation.TokenAddress)
			if err != nil {
				return fmt.Errorf("failed to check participant A balance: %w", err)
			}
			if balance < allocation.Amount.Int64() {
				return errors.New("insufficient funds")
			}

			toAccount := ledgerTx.Account(virtualChannelID.Hex(), allocation.Participant)
			if err := account.Transfer(toAccount, allocation.TokenAddress, allocation.Amount.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds from participant A: %w", err)
			}
		}

		// Record the virtual channel creation in state
		virtualChannelDB := &DBVirtualChannel{
			ChannelID:    virtualChannelID.Hex(),
			ParticipantA: participantA,
			ParticipantB: participantB,
			Status:       ChannelStatusOpen,
			Signers:      virtualChannel.Signers,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(virtualChannelDB).Error; err != nil {
			return fmt.Errorf("failed to record virtual channel: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create a response
	response := &ChannelResponse{
		ChannelID: virtualChannelID.Hex(),
		Status:    string(ChannelStatusOpen),
	}

	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// PublicMessageRequest represents a request to broadcast a message to all participants
type PublicMessageRequest struct {
	Message string `json:"message"`
}

// HandleSendMessage handles sending a message through a virtual channel
func HandleSendMessage(address, virtualChannelID string, req *RPCRequest, ledger *Ledger) ([]string, error) {
	// Validate required fields.
	if virtualChannelID == "" {
		return nil, errors.New("missing required field: channelId")
	}

	// Determine the sender from the request context
	// For now, we'll use the request method as the sender ID
	sender := address

	// Query the database for the virtual channel
	var virtualChannel DBVirtualChannel
	if err := ledger.db.Where("channel_id = ?", virtualChannelID).First(&virtualChannel).Error; err != nil {
		return nil, fmt.Errorf("failed to find virtual channel: %w", err)
	}

	// Determine the recipient (the participant that is not the sender)
	var recipient []string
	if virtualChannel.ParticipantA == sender {
		recipient = append(recipient, virtualChannel.ParticipantB)
	} else if virtualChannel.ParticipantB == sender {
		recipient = append(recipient, virtualChannel.ParticipantA)
	} else {
		return nil, errors.New("sender is not a participant in this channel")
	}

	// Just return the recipient, no response needed
	return recipient, nil
}

// ChannelAvailabilityResponse represents a participant's availability for virtual channels
type ChannelAvailabilityResponse struct {
	Address string `json:"address"`
	Amount  int64  `json:"amount"`
}

// HandleListOpenParticipants returns a list of direct channels where virtual channels can be created
func HandleListOpenParticipants(req *RPCRequest, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
	// Extract token address from parameters if provided
	var tokenAddress string
	if len(req.Req.Params) > 0 {
		paramsJSON, err := json.Marshal(req.Req.Params[0])
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				tokenAddress = params["token_address"]
			}
		}
	}

	// If no token address provided, use a default empty string
	if tokenAddress == "" {
		tokenAddress = ""
	}

	// Find all direct channels where the broker is participant B
	var channels []DBChannel
	if err := channelService.db.Where("participant_b = ?", BrokerAddress).Find(&channels).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch channels: %w", err)
	}

	fmt.Println("Foundbroker channels:", channels)

	// Create a response list with participant addresses and available funds
	var availableChannels []ChannelAvailabilityResponse
	for _, channel := range channels {
		// Get participant's balance in this channel
		log.Printf("Checking balance for channel: %+v\n", channel)
		account := ledger.Account(channel.ChannelID, channel.ParticipantA)
		balance, err := account.Balance(tokenAddress)
		if err != nil {
			// Skip this channel if there's an error getting balance
			continue
		}

		// Only include if the participant has available funds
		if balance > 0 {
			// Print debug info about the balance calculation
			log.Printf("Participant %s has balance %d in channel %s",
				channel.ParticipantA, balance, channel.ChannelID)

			availableChannels = append(availableChannels, ChannelAvailabilityResponse{
				Address: channel.ParticipantA,
				Amount:  balance,
			})
		}
	}

	// Create the RPC response
	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{availableChannels}, time.Now())
	return rpcResponse, nil
}

func HandleCloseDirectChannel(req *RPCRequest, ledger *Ledger, custodyWrapper *CustodyClientWrapper) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var params CloseDirectChannelParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	// Grab channel
	channel, err := channelService.GetChannelByID(params.ChannelID)
	if err != nil {
		return nil, fmt.Errorf("failed to find channel: %w", err)
	}

	// Grab user balances
	account := ledger.Account(channel.ChannelID, channel.ParticipantA)
	balance, err := account.Balance(channel.TokenAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	if channel.Amount-balance < 0 {
		return nil, errors.New("temporary dev error: resize this channel first")
	}

	if balance < 0 {
		return nil, errors.New("insufficient funds for participant: " + channel.TokenAddress)
	}

	allocations := []nitrolite.Allocation{
		{
			Destination: common.HexToAddress(params.FundsDestination),
			Token:       common.HexToAddress(channel.TokenAddress),
			Amount:      big.NewInt(balance),
		},
		{
			Destination: common.HexToAddress(channel.ParticipantB),
			Token:       common.HexToAddress(channel.TokenAddress),
			Amount:      big.NewInt(channel.Amount - balance), // Broker receives the remaining amount
		},
	}

	stateDataStr := "0x0000000000000000000000000000000000000000000000000000000000001ec7"
	stateData, err := hexutil.Decode(stateDataStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode state data: %w", err)
	}

	channelID := common.HexToHash(channel.ChannelID)
	encodedState, err := nitrolite.EncodeState(channelID, stateData, allocations)
	if err != nil {
		return nil, fmt.Errorf("failed to encode state hash: %w", err)
	}

	fmt.Printf("State hash: %s\n", crypto.Keccak256Hash(encodedState).Hex())
	sig, err := custodyWrapper.SignEncodedState(encodedState)

	response := CloseDirectChannelResponse{
		ChannelID:        channel.ChannelID,
		StateData:        stateDataStr, // Placeholder for state data
		FinalAllocations: []Allocation{},
		Signature: CloseSignature{
			V: sig.V,
			R: hexutil.Encode(sig.R[:]),
			S: hexutil.Encode(sig.S[:]),
		},
	}

	for _, alloc := range allocations {
		response.FinalAllocations = append(response.FinalAllocations, Allocation{
			Participant:  alloc.Destination.Hex(),
			TokenAddress: alloc.Token.Hex(),
			Amount:       alloc.Amount,
		})
	}
	// Create the RPC response
	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

func HandleCloseVirtualChannel(req *RPCRequest, ledger *Ledger) (*RPCResponse, error) {
	// Extract parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var params CloseVirtualChannelParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	if params.ChannelID == "" || len(params.FinalAllocations) == 0 {
		return nil, errors.New("missing required parameters: channelId or allocations")
	}

	reqBytes, err := json.Marshal(req.Req)
	if err != nil {
		return nil, errors.New("error serializing auth message")
	}

	// Perform atomic transaction
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// Fetch and validate the virtual channel
		var virtualChannel DBVirtualChannel
		if err := tx.Where("channel_id = ? AND status = ?", params.ChannelID, ChannelStatusOpen).Order("nonce DESC").
			First(&virtualChannel).Error; err != nil {
			return fmt.Errorf("virtual channel not found or not open: %w", err)
		}

		virtualChannelParticipants := []string{virtualChannel.ParticipantA, virtualChannel.ParticipantB}

		// Validate payload was signed by the virtual channel signers
		if len(req.Sig) != len(virtualChannel.Signers) {
			return fmt.Errorf("unexpected number of signatures: %v instead of %v", len(req.Sig), len(virtualChannel.Signers))
		}

		// Validate that RPC message is signed by all and only virtual channel participants.
		if err := validateSignatures(reqBytes, req.Sig, virtualChannel.Signers); err != nil {
			return err
		}

		// Process allocations
		totalVirtualChannelBalance, sumAllocations := int64(0), int64(0)
		for _, participant := range virtualChannelParticipants {
			allocation := findAllocation(params.FinalAllocations, participant)
			if allocation == nil || allocation.Amount == nil || allocation.Amount.Sign() < 0 {
				return errors.New("invalid allocation")
			}

			// Adjust balances
			virtualBalance := ledgerTx.Account(virtualChannel.ChannelID, participant)
			participantBalance, err := virtualBalance.Balance(allocation.TokenAddress)
			if err != nil {
				return fmt.Errorf("failed to check balance for %s: %w", participant, err)
			}
			totalVirtualChannelBalance += participantBalance

			if err := virtualBalance.Record(allocation.TokenAddress, -participantBalance); err != nil {
				return fmt.Errorf("failed to adjust virtual balance for %s: %w", participant, err)
			}

			directChannel, err := getDirectChannelForParticipant(tx, participant)
			if err != nil {
				return fmt.Errorf("failed to find direct channel for %s: %w", participant, err)
			}

			toAccount := ledgerTx.Account(directChannel.ChannelID, participant)
			if err := toAccount.Record(allocation.TokenAddress, allocation.Amount.Int64()); err != nil {
				return fmt.Errorf("failed to adjust direct balance for %s: %w", participant, err)
			}
			sumAllocations += allocation.Amount.Int64()
		}

		if sumAllocations != totalVirtualChannelBalance {
			return errors.New("allocation mismatch with virtual channel balance")
		}

		// Close the virtual channel
		return tx.Model(&virtualChannel).Updates(map[string]any{
			"status":     ChannelStatusClosed,
			"updated_at": time.Now(),
		}).Error

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create response
	response := &ChannelResponse{
		ChannelID: params.ChannelID,
		Status:    string(ChannelStatusClosed),
	}
	return CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now()), nil
}

// validateSignature checks if signer's signature is present in a list of signatures.
func validateSignature(reqBytes []byte, signatures []string, signer string) error {
	valid := false
	for _, sig := range signatures {
		if isValid, _ := ValidateSignature(reqBytes, sig, signer); isValid {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("invalid or missing signature for participant: %s", signer)
	}
	return nil
}

// HandleBroadcastMessage broadcasts a message to all connected participants
func HandleBroadcastMessage(address string, req *RPCRequest, ledger *Ledger, wsHandler WebSocketHandler) (*RPCResponse, error) {
	// Extract the message parameter from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var params PublicMessageRequest
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	// Validate required parameters
	if params.Message == "" {
		return nil, errors.New("missing required parameter: message")
	}

	// Get the sender's available balance for creating virtual channels
	var channel DBChannel

	// Find the direct channel for the sender
	if err := ledger.db.Where("participant_a = ? AND participant_b = ?",
		address, BrokerAddress).First(&channel).Error; err == nil {
	}

	// Create the broadcast message in a format similar to direct messages
	// The outer structure will be added by the BroadcastMessage method
	broadcastMsg := map[string]any{
		"type":          "public_message",
		"senderAddress": address,
		"content":       params.Message, // Match the "content" field used in SendMessage
		"timestamp":     time.Now().Unix(),
	}

	// Broadcast the message to all connected participants
	wsHandler.BroadcastMessage(broadcastMsg)

	// Create the RPC response
	response := map[string]any{
		"status":  "sent",
		"message": params.Message,
	}

	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// BrokerConfig represents the broker configuration information
type BrokerConfig struct {
	BrokerAddress string `json:"brokerAddress"`
}

// Global variable to track server start time
var serverStartTime = time.Now()

// HandleGetConfig returns the broker configuration
func HandleGetConfig(req *RPCRequest) (*RPCResponse, error) {
	config := BrokerConfig{
		BrokerAddress: BrokerAddress,
	}

	rpcResponse := CreateResponse(req.Req.RequestID, "config", []any{config}, time.Now())
	return rpcResponse, nil
}

// HandlePing responds to a ping request with a pong response in RPC format
func HandlePing(req *RPCRequest) (*RPCResponse, error) {
	rpcResponse := CreateResponse(req.Req.RequestID, "pong", []any{}, time.Now())
	return rpcResponse, nil
}

// HandleAuthenticate handles the authentication process
func HandleAuthenticate(conn *websocket.Conn, authMessage []byte) (string, error) {
	// Parse the authentication message
	var authMsg RPCRequest
	if err := json.Unmarshal(authMessage, &authMsg); err != nil {
		return "", errors.New("invalid authentication message format")
	}

	// Validate authentication message format
	if len(authMsg.Sig) == 0 {
		return "", errors.New("invalid authentication message format")
	}

	addr, ok := authMsg.Req.Params[0].(string)
	if !ok || addr == "" {
		return "", errors.New("invalid public key format")
	}

	// Make sure pubKey is in the full format with 0x prefix
	if !strings.HasPrefix(addr, "0x") {
		addr = "0x" + addr
	}

	// Authenticate using our signature validation utility
	// Serialize the auth message request to JSON
	reqBytes, err := json.Marshal(authMsg.Req)
	if err != nil {
		return "", errors.New("error serializing auth message")
	}

	// Validate the signature
	isValid, err := ValidateSignature(reqBytes, authMsg.Sig[0], addr)
	if err != nil || !isValid {
		log.Printf("Authentication signature verification failed: %v", err)
		return "", errors.New("invalid signature")
	}

	// Get the address from the public key
	address := common.HexToAddress(addr)

	return address.Hex(), nil
}
