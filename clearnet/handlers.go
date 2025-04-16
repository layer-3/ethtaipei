package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// Allocation represents a token allocation of a participant
type Allocation struct {
	Participant  string   `json:"participant"`
	TokenAddress string   `json:"token_address"`
	Amount       *big.Int `json:"amount,string"`
}

// CreateVirtualChannelParams represents parameters needed for virtual channel creation
type CreateVirtualChannelParams struct {
	ParticipantA       string       `json:"participant_a"`
	ParticipantB       string       `json:"participant_b"`
	InitialAllocations []Allocation `json:"allocations"`
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
func HandleCreateVirtualChannel(client *centrifuge.Client, req *RPCRequest, ledger *Ledger, router RouterInterface) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var params CreateVirtualChannelParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	log.Printf("Parsed parameters: %+v\n", params)

	// TODO: verify signatures
	virtualChannel := params

	// Validate required parameters
	if virtualChannel.ParticipantA == "" || virtualChannel.ParticipantB == "" {
		return nil, errors.New("missing required parameters: participantA, participantB")
	}

	// Convert to common.Address
	participantA := common.HexToAddress(virtualChannel.ParticipantA)
	participantB := common.HexToAddress(virtualChannel.ParticipantB)

	// Generate a unique channel ID for the virtual channel
	nitroliteChannel := nitrolite.Channel{
		Participants: []common.Address{participantA, participantB},
		Adjudicator:  common.HexToAddress("0x0000000000000000000000000000000000000000"),
		Challenge:    0, // Use placeholder values for virtual channels.
		Nonce:        uint64(time.Now().UnixNano()),
	}
	virtualChannelID := nitrolite.GetChannelID(nitroliteChannel)

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// 1. Check that both participants have direct channels with the broker
		for _, participant := range []string{virtualChannel.ParticipantA, virtualChannel.ParticipantB} {
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

			// Check if participantA has enough funds
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

		// 3. Record the virtual channel creation in state
		virtualChannelDB := &DBVirtualChannel{
			ChannelID:    virtualChannelID.Hex(),
			ParticipantA: virtualChannel.ParticipantA,
			ParticipantB: virtualChannel.ParticipantB,
			Status:       ChannelStatusOpen,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(virtualChannelDB).Error; err != nil {
			return fmt.Errorf("failed to record virtual channel: %w", err)
		}

		// 4. Set up message routing between participants
		if client != nil && router != nil {
			// Set up two-way message forwarding between participants
			if err := router.AddRoute(virtualChannelDB.ParticipantA, virtualChannelDB.ParticipantB, virtualChannelID.Hex()); err != nil {
				return fmt.Errorf("failed to set up routing for participant A: %w", err)
			}

			if err := router.AddRoute(virtualChannelDB.ParticipantB, virtualChannelDB.ParticipantA, virtualChannelID.Hex()); err != nil {
				return fmt.Errorf("failed to set up routing for participant B: %w", err)
			}
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

	// Create the RPC response
	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// Helper function to get the direct channel for a participant
func getDirectChannelForParticipant(tx *gorm.DB, participant string) (*DBChannel, error) {
	var directChannel DBChannel
	if err := tx.Where("participant_a = ? AND participant_b = ?",
		participant, BrokerAddress).First(&directChannel).Error; err != nil {
		return nil, fmt.Errorf("no direct channel found for participant %s: %w", participant, err)
	}
	return &directChannel, nil
}

type SendMessageRequest struct {
	ChannelID string          `json:"channelId"`
	Data      json.RawMessage `json:"data"`
}

// PublicMessageRequest represents a request to broadcast a message to all participants
type PublicMessageRequest struct {
	Message string `json:"message"`
}

// HandleSendMessage handles sending a message through a virtual channel
func HandleSendMessage(address string, node *centrifuge.Node, req *RPCRequest, router RouterInterface, ledger *Ledger) (string, error) {
	// Expect exactly one parameter in the request that is a JSON object matching SendMessageRequest.
	if len(req.Req.Params) != 1 {
		return "", errors.New("invalid parameters: expected a single JSON object with channelId and data")
	}

	// Convert the first parameter into JSON bytes.
	paramBytes, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return "", fmt.Errorf("failed to marshal parameter: %w", err)
	}

	// Parse the send message request.
	var sendReq SendMessageRequest
	if err := json.Unmarshal(paramBytes, &sendReq); err != nil {
		return "", fmt.Errorf("failed to parse send message request: %w", err)
	}

	// Validate required fields.
	if strings.TrimSpace(sendReq.ChannelID) == "" {
		return "", errors.New("missing required field: channelId")
	}
	if len(sendReq.Data) == 0 {
		return "", errors.New("missing required field: data")
	}

	// Determine the sender from the request context
	// For now, we'll use the request method as the sender ID
	sender := address

	// Query the database for the virtual channel
	var virtualChannel DBVirtualChannel
	if err := ledger.db.Where("channel_id = ?", sendReq.ChannelID).First(&virtualChannel).Error; err != nil {
		return "", fmt.Errorf("failed to find virtual channel: %w", err)
	}

	// Determine the recipient (the participant that is not the sender)
	var recipient string
	if virtualChannel.ParticipantA == sender {
		recipient = virtualChannel.ParticipantB
	} else if virtualChannel.ParticipantB == sender {
		recipient = virtualChannel.ParticipantA
	} else {
		return "", errors.New("sender is not a participant in this channel")
	}

	// Forward the message through the router using the provided channel ID.
	if err := router.ForwardMessage(sender, recipient, sendReq.Data, sendReq.ChannelID); err != nil {
		return "", fmt.Errorf("failed to route message: %w", err)
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
	balances, err := account.Balances()
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	allocations := []nitrolite.Allocation{}
	for token, balance := range balances {
		if balance < 0 {
			return nil, errors.New("insufficient funds for participant: " + token)
		}

		allocations = append(allocations, []nitrolite.Allocation{
			{
				Destination: common.HexToAddress(params.FundsDestination),
				Token:       common.HexToAddress(token),
				Amount:      big.NewInt(balance),
			},
			{
				Destination: common.HexToAddress(channel.ParticipantB),
				Token:       common.HexToAddress(token),
				Amount:      big.NewInt(0), // TODO: do not hardcode
			},
		}...)
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

// HandleCloseVirtualChannel closes a virtual channel and redistributes funds to participants
// TODO: this will be triggered automatically when we receive an event from Blockchain.
func HandleCloseVirtualChannel(req *RPCRequest, ledger *Ledger, router RouterInterface) (*RPCResponse, error) {
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

	// Log the parsed parameters for debugging
	log.Printf("Parsed allocations: %+v", params.FinalAllocations)

	// Validate required parameters
	if params.ChannelID == "" {
		return nil, errors.New("missing required parameters: channelId")
	}

	if len(params.FinalAllocations) == 0 {
		return nil, errors.New("missing required parameter: allocations")
	}

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// 1. Find the virtual channel
		var virtualChannel DBVirtualChannel
		if err := tx.Where("channel_id = ?", params.ChannelID).First(&virtualChannel).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("virtual channel not found")
			}
			return fmt.Errorf("failed to find virtual channel: %w", err)
		}

		// 2. Check if the channel is open
		if virtualChannel.Status != ChannelStatusOpen {
			return fmt.Errorf("channel is not open, current status: %s", virtualChannel.Status)
		}

		// 3. Find direct channels for both participants
		participantAChannel, err := getDirectChannelForParticipant(tx, virtualChannel.ParticipantA)
		if err != nil {
			return fmt.Errorf("failed to find direct channel for participant A: %w", err)
		}

		participantBChannel, err := getDirectChannelForParticipant(tx, virtualChannel.ParticipantB)
		if err != nil {
			return fmt.Errorf("failed to find direct channel for participant B: %w", err)
		}

		// 6. Validate and calculate total allocated amounts
		totalAllocatedAmount := big.NewInt(0)
		allocatedParticipants := make(map[string]bool)

		for _, allocation := range params.FinalAllocations {
			if allocation.Participant == "" || allocation.Amount == nil {
				return errors.New("invalid allocation: missing participant or amount")
			}

			if allocation.Amount.Sign() < 0 {
				return errors.New("invalid allocation: amount cannot be negative")
			}

			totalAllocatedAmount = totalAllocatedAmount.Add(totalAllocatedAmount, allocation.Amount)
			allocatedParticipants[allocation.Participant] = true
		}

		// 8. Check that we're only allocating to the virtual channel participants
		if len(allocatedParticipants) > 2 {
			return errors.New("allocations include more than the two channel participants")
		}

		if !allocatedParticipants[virtualChannel.ParticipantA] && !allocatedParticipants[virtualChannel.ParticipantB] {
			return errors.New("allocations do not include any of the channel participants")
		}

		// 9. Transfer funds back to direct channels according to allocations
		for _, allocation := range params.FinalAllocations {
			// Skip zero allocations
			if allocation.Amount.Sign() == 0 {
				continue
			}

			// Check which participant we're dealing with
			var directChannel *DBChannel
			if allocation.Participant == virtualChannel.ParticipantA {
				directChannel = participantAChannel
			} else if allocation.Participant == virtualChannel.ParticipantB {
				directChannel = participantBChannel
			} else {
				return fmt.Errorf("invalid participant in allocation: %s", allocation.Participant)
			}

			// Get source and destination accounts
			fromAccount := ledgerTx.Account(virtualChannel.ChannelID, allocation.Participant)
			toAccount := ledgerTx.Account(directChannel.ChannelID, allocation.Participant)

			// Check if participant has enough funds in the virtual channel
			participantBalance, err := fromAccount.Balance(allocation.TokenAddress)
			if err != nil {
				return fmt.Errorf("failed to check balance for %s: %w", allocation.Participant, err)
			}

			// If not enough funds, we need to handle the "payment" from the other participant
			if participantBalance < allocation.Amount.Int64() {
				// This is a redistribution to this participant - we first need to adjust the other participant's record
				diff := allocation.Amount.Int64() - participantBalance

				// Determine the other participant
				otherParticipant := virtualChannel.ParticipantA
				if allocation.Participant == virtualChannel.ParticipantA {
					otherParticipant = virtualChannel.ParticipantB
				}

				// Record a transfer from other participant to this participant within the virtual channel
				// This simulates the final settlement agreed upon by the participants
				transferAccount := ledgerTx.Account(virtualChannel.ChannelID, otherParticipant)
				if err := transferAccount.Record(allocation.TokenAddress, -diff); err != nil {
					return fmt.Errorf("failed to adjust balance for %s: %w", otherParticipant, err)
				}

				if err := fromAccount.Record(allocation.TokenAddress, diff); err != nil {
					return fmt.Errorf("failed to adjust balance for %s: %w", allocation.Participant, err)
				}
			}

			// Now transfer funds from virtual channel to direct channel
			if err := fromAccount.Transfer(toAccount, allocation.TokenAddress, allocation.Amount.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds for %s: %w", allocation.Participant, err)
			}
		}

		// 10. Mark the virtual channel as closed
		if err := tx.Model(&virtualChannel).Updates(map[string]any{
			"status":     "closed",
			"updated_at": time.Now(),
		}).Error; err != nil {
			return fmt.Errorf("failed to update virtual channel status: %w", err)
		}

		// 11. Remove message routing for this channel
		if router != nil {
			// We don't care if this fails since the routing will be cleared eventually
			_ = removeRoutes(router, virtualChannel.ParticipantA, virtualChannel.ParticipantB, virtualChannel.ChannelID)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create a response
	response := &ChannelResponse{
		ChannelID: params.ChannelID,
		Status:    string(ChannelStatusClosed),
	}

	// Create the RPC response
	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// Helper function to remove routes between participants
func removeRoutes(router RouterInterface, participantA, participantB, channelID string) error {
	// Since we don't have a direct "remove route" function, we'd need to implement it
	// For now, we'll just log the action as the Router interface doesn't have this functionality
	log.Printf("Removing message routes for channel %s between %s and %s",
		channelID, participantA, participantB)
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
	var authMsg RegularMessage
	if err := json.Unmarshal(authMessage, &authMsg); err != nil {
		return "", errors.New("invalid authentication message format")
	}

	// Validate authentication message format
	if len(authMsg.Req) < 4 || len(authMsg.Sig) == 0 {
		return "", errors.New("invalid authentication message format")
	}

	// Extract method and ensure it's auth
	method, ok := authMsg.Req[1].(string)
	if !ok || method != "auth" {
		return "", errors.New("first message must be an authentication message")
	}

	// Extract public key from req[2]
	addrArr, ok := authMsg.Req[2].([]any)
	if !ok || len(addrArr) == 0 {
		return "", errors.New("missing public key in authentication message")
	}

	addr, ok := addrArr[0].(string)
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
