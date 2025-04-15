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

// CreateChannelParams represents parameters needed for direct channel creation
type CreateChannelParams struct {
	ChannelID    string   `json:"channelId"`
	TokenAddress string   `json:"token_address"`
	Amount       *big.Int `json:"amount,string,omitempty"`
	NetworkID    string   `json:"network_id,omitempty"`
}

// CreateVirtualChannelParams represents parameters needed for virtual channel creation
type CreateVirtualChannelParams struct {
	ParticipantA string   `json:"participantA"`
	ParticipantB string   `json:"participantB"`
	TokenAddress string   `json:"token_address"`
	AmountA      *big.Int `json:"amountA,string"`
	AmountB      *big.Int `json:"amountB,string"`
}

// CloseVirtualChannelParams represents parameters needed for virtual channel closure
type CloseVirtualChannelParams struct {
	ChannelID   string            `json:"channelId"`
	Allocations []FinalAllocation `json:"allocations"`
}

// CloseDirectChannelParams represents parameters needed for virtual channel closure
type CloseDirectChannelParams struct {
	ChannelID        string `json:"channelId"`
	FundsDestination string `json:"fundsDestination"`
}

type CloseDirectChannelResponse struct {
	ChannelID   string            `json:"channelId"`
	StateData   string            `json:"stateData"`
	Allocations []CloseAllocation `json:"allocations"`
	Signature   CloseSignature    `json:"server-signature"`
}

type CloseAllocation struct {
	Destination string   `json:"destination"`
	Token       string   `json:"token"`
	Amount      *big.Int `json:"amount,string"`
}

type CloseSignature struct {
	V uint8  `json:"v,string"`
	R string `json:"r,string"`
	S string `json:"s,string"`
}

// FinalAllocation represents the final allocation for a participant when closing a channel
type FinalAllocation struct {
	Participant  string   `json:"participant"`
	TokenAddress string   `json:"token_address"`
	Amount       *big.Int `json:"amount,string"`
}

// ChannelResponse represents response data for channel operations
type ChannelResponse struct {
	ChannelID    string `json:"channelId"`
	Status       string `json:"status"`
	ParticipantA string `json:"participantA,omitempty"`
	ParticipantB string `json:"participantB,omitempty"`
}

// TODO: this will be triggered automatically when we receive an event from Blockchain.
// HandleCreateChannel creates a direct channel between a participant and the broker
func HandleCreateChannel(hostAddress string, req *RPCRequest, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var params CreateChannelParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	// Validate required parameters
	if params.ChannelID == "" || params.TokenAddress == "" {
		return nil, errors.New("missing required parameters: channelId, participant, or tokenAddress")
	}

	// Create the channel with the broker, including network ID if provided
	channel, err := channelService.GetOrCreateChannel(
		params.ChannelID,
		hostAddress,
		0,
		"",
		params.NetworkID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create channel: %w", err)
	}

	// If initial funds are provided, add them to the ledger
	if params.Amount != nil && params.Amount.Sign() > 0 {
		account := ledger.Account(params.ChannelID, hostAddress)
		if err := account.Record(params.TokenAddress, params.Amount.Int64()); err != nil {
			return nil, fmt.Errorf("failed to add initial funds: %w", err)
		}
	}

	// Create the response
	response := &ChannelResponse{
		ChannelID:    channel.ChannelID,
		Status:       "created",
		ParticipantA: channel.ParticipantA,
		ParticipantB: channel.ParticipantB,
	}

	// Create the RPC response
	rpcResponse := CreateResponse(req.Req.RequestID, req.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
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
	if virtualChannel.ParticipantA == "" || virtualChannel.ParticipantB == "" || virtualChannel.TokenAddress == "" {
		return nil, errors.New("missing required parameters: participantA, participantB, or tokenAddress")
	}

	if virtualChannel.AmountA == nil || virtualChannel.AmountB == nil {
		return nil, errors.New("missing required parameters: amountA or amountB")
	}

	// Convert to common.Address
	participantA := common.HexToAddress(virtualChannel.ParticipantA)
	participantB := common.HexToAddress(virtualChannel.ParticipantB)
	adjudicator := common.HexToAddress("0x0000000000000000000000000000000000000000")

	// Generate a unique channel ID for the virtual channel
	nitroliteChannel := nitrolite.Channel{
		Participants: []common.Address{participantA, participantB},
		Adjudicator:  adjudicator,
		Challenge:    60,
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

		// 2. Check that both participants have sufficient funds
		participantAChannel, err := getDirectChannelForParticipant(tx, virtualChannel.ParticipantA)
		if err != nil {
			return err
		}

		log.Printf("Participant A channel: %+v\n", participantAChannel)
		participantBChannel, err := getDirectChannelForParticipant(tx, virtualChannel.ParticipantB)
		if err != nil {
			return err
		}
		log.Printf("Participant B channel: %+v\n", participantBChannel)

		// Check if participantA has enough funds
		accountA := ledgerTx.Account(participantAChannel.ChannelID, virtualChannel.ParticipantA)
		balanceA, err := accountA.Balance(virtualChannel.TokenAddress)
		if err != nil {
			return fmt.Errorf("failed to check participant A balance: %w", err)
		}

		// Check if participantB has enough funds
		accountB := ledgerTx.Account(participantBChannel.ChannelID, virtualChannel.ParticipantB)
		balanceB, err := accountB.Balance(virtualChannel.TokenAddress)
		if err != nil {
			return fmt.Errorf("failed to check participant B balance: %w", err)
		}

		log.Printf("Participant A balance: %d, Amount A: %d", balanceA, virtualChannel.AmountA.Int64())
		log.Printf("Participant B balance: %d, Amount B: %d", balanceB, virtualChannel.AmountB.Int64())
		// Ensure sufficient funds
		if balanceA < virtualChannel.AmountA.Int64() {
			return errors.New("insufficient funds for participant A")
		}

		if balanceB < virtualChannel.AmountB.Int64() {
			return errors.New("insufficient funds for participant B")
		}

		// 3. Record the virtual channel creation in state
		virtualChannelDB := &DBVirtualChannel{
			ChannelID:    virtualChannelID.Hex(),
			ParticipantA: virtualChannel.ParticipantA,
			ParticipantB: virtualChannel.ParticipantB,
			Status:       "open",
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

		// 5. Transfer funds from direct channels to virtual channel
		// Transfer from participant A
		if virtualChannel.AmountA.Int64() > 0 {
			fromAccountA := ledgerTx.Account(participantAChannel.ChannelID, virtualChannelDB.ParticipantA)
			toAccountA := ledgerTx.Account(virtualChannelID.Hex(), virtualChannelDB.ParticipantA)
			if err := fromAccountA.Transfer(toAccountA, virtualChannel.TokenAddress, virtualChannel.AmountA.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds from participant A: %w", err)
			}
		}

		// Transfer from participant B
		if virtualChannel.AmountB.Int64() > 0 {
			// Transfer from participant B
			fromAccountB := ledgerTx.Account(participantBChannel.ChannelID, virtualChannel.ParticipantB)
			toAccountB := ledgerTx.Account(virtualChannelID.Hex(), virtualChannel.ParticipantB)
			if err := fromAccountB.Transfer(toAccountB, virtualChannel.TokenAddress, virtualChannel.AmountB.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds from participant B: %w", err)
			}

		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create a response
	response := &ChannelResponse{
		ChannelID:    virtualChannelID.Hex(),
		Status:       "created",
		ParticipantA: virtualChannel.ParticipantA,
		ParticipantB: virtualChannel.ParticipantB,
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

	// Grab user balance
	tokenAddress := "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
	account := ledger.Account(channel.ChannelID, channel.ParticipantA)
	balance, err := account.Balance(tokenAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	if balance < 0 {
		return nil, fmt.Errorf("insufficient funds for participant A")
	}

	stateDataStr := "0x0000000000000000000000000000000000000000000000000000000000001ec7"
	stateData, err := hexutil.Decode(stateDataStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode state data: %w", err)
	}

	allocations := []nitrolite.Allocation{
		{
			Destination: common.HexToAddress(params.FundsDestination),
			Token:       common.HexToAddress(tokenAddress),
			Amount:      big.NewInt(balance),
		},
		{
			Destination: common.HexToAddress(channel.ParticipantB),
			Token:       common.HexToAddress(tokenAddress),
			Amount:      big.NewInt(0),
		},
	}
	channelID := common.HexToHash(channel.ChannelID)

	encodedState, err := nitrolite.EncodeState(channelID, stateData, allocations)
	if err != nil {
		return nil, fmt.Errorf("failed to encode state hash: %w", err)
	}

	fmt.Printf("State hash: %s\n", crypto.Keccak256Hash(encodedState).Hex())
	sig, err := custodyWrapper.SignEncodedState(encodedState)

	response := CloseDirectChannelResponse{
		ChannelID:   channel.ChannelID,
		StateData:   stateDataStr, // Placeholder for state data
		Allocations: []CloseAllocation{},
		Signature: CloseSignature{
			V: sig.V,
			R: hexutil.Encode(sig.R[:]),
			S: hexutil.Encode(sig.S[:]),
		},
	}

	for _, alloc := range allocations {
		response.Allocations = append(response.Allocations, CloseAllocation{
			Destination: alloc.Destination.Hex(),
			Token:       alloc.Token.Hex(),
			Amount:      alloc.Amount,
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

	// First, parse parameters as a map to handle flexible input formats
	var rawParams map[string]interface{}
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to marshal parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &rawParams); err != nil {
		return nil, fmt.Errorf("failed to parse parameters as map: %w", err)
	}

	// Extract parameters
	var params CloseVirtualChannelParams
	params.ChannelID, _ = rawParams["channelId"].(string)

	// Handle allocations
	allocationsRaw, ok := rawParams["allocations"].([]interface{})
	if !ok {
		return nil, errors.New("invalid allocations format")
	}

	// TODO: do a proper parsing
	params.Allocations = make([]FinalAllocation, 0, len(allocationsRaw))
	for _, alloc := range allocationsRaw {
		allocMap, ok := alloc.(map[string]interface{})
		if !ok {
			return nil, errors.New("invalid allocation entry format")
		}

		participant, _ := allocMap["participant"].(string)

		// Handle the amount which could be in various formats
		var amount *big.Int
		switch amountVal := allocMap["amount"].(type) {
		case string:
			// Parse string to big.Int
			amount = new(big.Int)
			amount, ok = amount.SetString(amountVal, 10)
			if !ok {
				return nil, fmt.Errorf("invalid amount format: %s", amountVal)
			}
		case float64:
			// Convert float64 to big.Int
			amount = big.NewInt(int64(amountVal))
		case int64:
			amount = big.NewInt(amountVal)
		case json.Number:
			// Parse JSON number
			amountStr := string(amountVal)
			amount = new(big.Int)
			amount, ok = amount.SetString(amountStr, 10)
			if !ok {
				return nil, fmt.Errorf("invalid amount format: %s", amountStr)
			}
		default:
			return nil, fmt.Errorf("unsupported amount type: %T", allocMap["amount"])
		}

		tokenAddress, _ := allocMap["token_address"].(string)

		params.Allocations = append(params.Allocations, FinalAllocation{
			Participant:  participant,
			Amount:       amount,
			TokenAddress: tokenAddress,
		})
	}

	// Log the parsed parameters for debugging
	log.Printf("Parsed allocations: %+v", params.Allocations)

	// Validate required parameters
	if params.ChannelID == "" {
		return nil, errors.New("missing required parameters: channelId")
	}

	if len(params.Allocations) == 0 {
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
		if virtualChannel.Status != "open" {
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

		for _, allocation := range params.Allocations {
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
		for _, allocation := range params.Allocations {
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
		if err := tx.Model(&virtualChannel).Updates(map[string]interface{}{
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
		Status:    "closed",
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

// HandleSendPublicMessage broadcasts a message to all connected participants
func HandleSendPublicMessage(address string, req *RPCRequest, ledger *Ledger, wsHandler WebSocketHandler) (*RPCResponse, error) {
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
	broadcastMsg := map[string]interface{}{
		"type":          "public_message",
		"senderAddress": address,
		"content":       params.Message, // Match the "content" field used in SendMessage
		"timestamp":     time.Now().Unix(),
	}

	// Broadcast the message to all connected participants
	wsHandler.BroadcastMessage(broadcastMsg)

	// Create the RPC response
	response := map[string]interface{}{
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
	addrArr, ok := authMsg.Req[2].([]interface{})
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
