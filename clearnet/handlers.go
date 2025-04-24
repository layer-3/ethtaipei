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

// VirtualChannelResponse represents response data for channel operations
type VirtualChannelResponse struct {
	ChannelID string `json:"channel_id"`
	Status    string `json:"status"`
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

// HandleCreateVirtualChannel creates a virtual channel between two participants
func HandleCreateVirtualChannel(rpc *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var virtualChannel CreateVirtualChannelParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &virtualChannel); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	log.Printf("Parsed parameters: %+v\n", virtualChannel)

	if len(virtualChannel.Participants) < 2 {
		return nil, errors.New("invalid number of participants")
	}

	// Allocation should be specified for each participant even if it is zero.
	if len(virtualChannel.InitialAllocations) != len(virtualChannel.Participants) {
		return nil, errors.New("invalid allocations")
	}

	var participantsAddresses []common.Address
	for _, participant := range virtualChannel.Participants {
		participantsAddresses = append(participantsAddresses, common.HexToAddress(participant))
	}

	// Generate a unique channel ID for the virtual channel (TODO: rethink channel ID generation)
	nitroliteChannel := nitrolite.Channel{
		Participants: participantsAddresses,
		Adjudicator:  common.HexToAddress("0x0000000000000000000000000000000000000000"),
		Challenge:    0, // Use placeholder values for virtual channels.
		Nonce:        rpc.Req.Timestamp,
	}
	virtualChannelID := nitrolite.GetChannelID(nitroliteChannel)

	reqBytes, err := json.Marshal(rpc.Req)
	if err != nil {
		return nil, errors.New("error serializing auth message")
	}

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		for _, allocation := range virtualChannel.InitialAllocations {
			participantChannel, err := getDirectChannelForParticipant(tx, allocation.Participant)
			if err != nil {
				return err
			}

			if allocation.Amount.Sign() < 0 {
				return errors.New("invalid allocation")
			}

			if allocation.Amount.Sign() > 0 {
				if err := validateSignature(reqBytes, rpc.Sig, allocation.Participant); err != nil {
					return err
				}
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
			Participants: virtualChannel.Participants,
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
	response := &VirtualChannelResponse{
		ChannelID: virtualChannelID.Hex(),
		Status:    string(ChannelStatusOpen),
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// PublicMessageRequest represents a request to broadcast a message to all participants
type PublicMessageRequest struct {
	Message string `json:"message"`
}

// getVCRecipients handles sending a message through a virtual channel
func getVCRecipients(address, virtualChannelID string, ledger *Ledger) ([]string, error) {
	// Validate required fields.
	if virtualChannelID == "" {
		return nil, errors.New("missing required field: channelId")
	}

	// TODO: use cache, do not go to database in each request.

	// Query the database for the virtual channel
	var virtualChannel DBVirtualChannel
	if err := ledger.db.Where("channel_id = ?", virtualChannelID).First(&virtualChannel).Error; err != nil {
		return nil, fmt.Errorf("failed to find virtual channel: %w", err)
	}

	// Exclude the sender address from the participants to send to
	var participants []string
	for _, participant := range virtualChannel.Participants {
		if participant != address {
			participants = append(participants, participant)
		}
	}

	return participants, nil
}

// ChannelAvailabilityResponse represents a participant's availability for virtual channels
type ChannelAvailabilityResponse struct {
	Address string `json:"address"`
	Amount  int64  `json:"amount"`
}

// HandleListParticipants returns a list of direct channels where virtual channels can be created
func HandleListParticipants(rpc *RPCMessage, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
	var tokenAddress string
	if len(rpc.Req.Params) > 0 {
		paramsJSON, err := json.Marshal(rpc.Req.Params[0])
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				tokenAddress = params["token_address"]
			}
		}
	}

	if tokenAddress == "" {
		return nil, errors.New("missing token address")
	}

	// Find all open direct channels where the broker is participant B
	var channels []DBChannel
	if err := channelService.db.Where("participant_b = ? AND status = ?", BrokerAddress, ChannelStatusOpen).Find(&channels).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch channels: %w", err)
	}

	// Create a response list with participant addresses and available funds
	var availableChannels []ChannelAvailabilityResponse
	for _, channel := range channels {
		account := ledger.Account(channel.ChannelID, channel.ParticipantA)
		balance, err := account.Balance(tokenAddress)
		if err != nil {
			continue
		}

		availableChannels = append(availableChannels, ChannelAvailabilityResponse{
			Address: channel.ParticipantA,
			Amount:  balance,
		})
	}

	// Create the RPC response
	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{availableChannels}, time.Now())
	return rpcResponse, nil
}

func HandleCloseDirectChannel(req *RPCMessage, ledger *Ledger, signer *Signer) (*RPCResponse, error) {
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
	sig, err := signer.NitroSign(encodedState)
	if err != nil {
		return nil, fmt.Errorf("failed to sign state: %w", err)
	}

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

// HandleCloseVirtualChannel closes a virtual channel and redistributes funds to participants
func HandleCloseVirtualChannel(req *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
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

		// Validate payload was signed by the virtual channel signers
		if len(req.Sig) != len(virtualChannel.Signers) {
			return fmt.Errorf("unexpected number of signatures: %v instead of %v", len(req.Sig), len(virtualChannel.Signers))
		}

		// Validate that RPC message is signed by the specified signers on channel creation.
		for _, signer := range virtualChannel.Signers {
			if err := validateSignature(reqBytes, req.Sig, signer); err != nil {
				return err
			}
		}

		// Process allocations
		totalVirtualChannelBalance, sumAllocations := int64(0), int64(0)
		for _, participant := range virtualChannel.Participants {
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
	})

	if err != nil {
		return nil, err
	}

	// Create response
	response := &VirtualChannelResponse{
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

// findAllocation retrieves the allocation for a specific participant
func findAllocation(allocations []Allocation, participant string) *Allocation {
	for _, alloc := range allocations {
		if alloc.Participant == participant {
			return &alloc
		}
	}
	return nil
}

// HandleBroadcastMessage broadcasts a message to all connected participants
func HandleBroadcastMessage(address string, req *RPCMessage, ledger *Ledger, wsHandler WebSocketHandler) (*RPCResponse, error) {
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
func HandleGetConfig(req *RPCMessage) (*RPCResponse, error) {
	config := BrokerConfig{
		BrokerAddress: BrokerAddress,
	}

	rpcResponse := CreateResponse(req.Req.RequestID, "config", []any{config}, time.Now())
	return rpcResponse, nil
}

// HandlePing responds to a ping request with a pong response in RPC format
func HandlePing(req *RPCMessage) (*RPCResponse, error) {
	rpcResponse := CreateResponse(req.Req.RequestID, "pong", []any{}, time.Now())
	return rpcResponse, nil
}

// HandleAuthenticate handles the authentication process
func HandleAuthenticate(signer *Signer, conn *websocket.Conn, authMessage []byte) (string, error) {
	// Parse the authentication message
	var authMsg RPCMessage
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

	// Send auth success confirmation.
	response := CreateResponse(0, "auth", []any{map[string]any{
		"address": address,
		"success": true,
	}}, time.Now())

	byteData, _ := json.Marshal(response.Res)
	signature, _ := signer.Sign(byteData)
	response.Sig = []string{hexutil.Encode(signature)}

	responseData, _ := json.Marshal(response)
	if err = conn.WriteMessage(websocket.TextMessage, responseData); err != nil {
		log.Printf("Error sending auth success: %v", err)
		return "", err
	}

	return address.Hex(), nil
}
