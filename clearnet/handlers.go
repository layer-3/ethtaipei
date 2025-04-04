package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// CreateChannelParams represents parameters needed for direct channel creation
type CreateChannelParams struct {
	ChannelID    string   `json:"channelId"`
	Participant  string   `json:"participant"`
	TokenAddress string   `json:"tokenAddress"`
	InitialFunds *big.Int `json:"initialFunds,string,omitempty"`
}

// CreateVirtualChannelParams represents parameters needed for virtual channel creation
type CreateVirtualChannelParams struct {
	ParticipantA string   `json:"participantA"`
	ParticipantB string   `json:"participantB"`
	TokenAddress string   `json:"tokenAddress"`
	AmountA      *big.Int `json:"amountA,string"`
	AmountB      *big.Int `json:"amountB,string"`
	Adjudicator  string   `json:"adjudicator,omitempty"`
	Challenge    uint64   `json:"challenge,omitempty"`
	Nonce        uint64   `json:"nonce,omitempty"`
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
func HandleCreateChannel(req *RPCRequest, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
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
	if params.ChannelID == "" || params.Participant == "" || params.TokenAddress == "" {
		return nil, errors.New("missing required parameters: channelId, participant, or tokenAddress")
	}

	// Create the channel with the broker
	channel, err := channelService.GetOrCreateChannel(
		params.ChannelID,
		params.Participant,
		params.TokenAddress,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create channel: %w", err)
	}

	// If initial funds are provided, add them to the ledger
	if params.InitialFunds != nil && params.InitialFunds.Sign() > 0 {
		account := ledger.Account(params.ChannelID, params.Participant, params.TokenAddress)
		if err := account.Record(params.InitialFunds.Int64()); err != nil {
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

	// Validate required parameters
	if params.ParticipantA == "" || params.ParticipantB == "" || params.TokenAddress == "" {
		return nil, errors.New("missing required parameters: participantA, participantB, or tokenAddress")
	}

	if params.AmountA == nil || params.AmountB == nil {
		return nil, errors.New("missing required parameters: amountA or amountB")
	}

	// Set default values if not provided
	if params.Adjudicator == "" {
		params.Adjudicator = "0x0000000000000000000000000000000000000000"
	}

	if params.Challenge == 0 {
		params.Challenge = 86400 // Default 24 hours in seconds
	}

	if params.Nonce == 0 {
		params.Nonce = uint64(time.Now().UnixNano())
	}

	// Convert to common.Address
	participantA := common.HexToAddress(params.ParticipantA)
	participantB := common.HexToAddress(params.ParticipantB)
	adjudicator := common.HexToAddress(params.Adjudicator)

	// Generate a unique channel ID for the virtual channel
	nitroliteChannel := nitrolite.Channel{
		Participants: [2]common.Address{participantA, participantB},
		Adjudicator:  adjudicator,
		Challenge:    params.Challenge,
		Nonce:        params.Nonce,
	}
	virtualChannelID := nitrolite.GetChannelID(nitroliteChannel)

	// Set channel expiration time (default 24 hours from now)
	expiresAt := time.Now().Add(24 * time.Hour)

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// 1. Check that both participants have direct channels with the broker
		for _, participant := range []string{params.ParticipantA, params.ParticipantB} {
			// Find the direct channel where the participant is participantA and participantB is the broker
			var directChannel DBChannel
			if err := tx.Where("participant_a = ? AND participant_b = ?",
				participant, BrokerAddress).First(&directChannel).Error; err != nil {
				return fmt.Errorf("no direct channel found for participant %s: %w", participant, err)
			}
		}

		// 2. Check that both participants have sufficient funds
		participantAChannel, err := getDirectChannelForParticipant(tx, params.ParticipantA)
		if err != nil {
			return err
		}

		participantBChannel, err := getDirectChannelForParticipant(tx, params.ParticipantB)
		if err != nil {
			return err
		}

		// Check if participantA has enough funds
		accountA := ledgerTx.Account(participantAChannel.ChannelID, params.ParticipantA, params.TokenAddress)
		balanceA, err := accountA.Balance()
		if err != nil {
			return fmt.Errorf("failed to check participant A balance: %w", err)
		}

		// Check if participantB has enough funds
		accountB := ledgerTx.Account(participantBChannel.ChannelID, params.ParticipantB, params.TokenAddress)
		balanceB, err := accountB.Balance()
		if err != nil {
			return fmt.Errorf("failed to check participant B balance: %w", err)
		}

		// Ensure sufficient funds
		if balanceA < params.AmountA.Int64() {
			return errors.New("insufficient funds for participant A")
		}

		if balanceB < params.AmountB.Int64() {
			return errors.New("insufficient funds for participant B")
		}

		// 3. Record the virtual channel creation in state
		virtualChannel := &VirtualChannel{
			ChannelID:    virtualChannelID.Hex(),
			ParticipantA: params.ParticipantA,
			ParticipantB: params.ParticipantB,
			TokenAddress: params.TokenAddress,
			Status:       "open",
			Version:      0,
			ExpiresAt:    expiresAt,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(virtualChannel).Error; err != nil {
			return fmt.Errorf("failed to record virtual channel: %w", err)
		}

		// 4. Set up message routing between participants
		if client != nil && router != nil {
			// Set up two-way message forwarding between participants
			if err := router.AddRoute(params.ParticipantA, params.ParticipantB, virtualChannelID.Hex()); err != nil {
				return fmt.Errorf("failed to set up routing for participant A: %w", err)
			}

			if err := router.AddRoute(params.ParticipantB, params.ParticipantA, virtualChannelID.Hex()); err != nil {
				return fmt.Errorf("failed to set up routing for participant B: %w", err)
			}
		}

		// 5. Transfer funds from direct channels to virtual channel
		// Transfer from participant A
		fromAccountA := ledgerTx.Account(participantAChannel.ChannelID, params.ParticipantA, params.TokenAddress)
		toAccountA := ledgerTx.Account(virtualChannelID.Hex(), params.ParticipantA, params.TokenAddress)
		if err := fromAccountA.Transfer(toAccountA, params.AmountA.Int64()); err != nil {
			return fmt.Errorf("failed to transfer funds from participant A: %w", err)
		}

		// Transfer from participant B
		fromAccountB := ledgerTx.Account(participantBChannel.ChannelID, params.ParticipantB, params.TokenAddress)
		toAccountB := ledgerTx.Account(virtualChannelID.Hex(), params.ParticipantB, params.TokenAddress)
		if err := fromAccountB.Transfer(toAccountB, params.AmountB.Int64()); err != nil {
			return fmt.Errorf("failed to transfer funds from participant B: %w", err)
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
		ParticipantA: params.ParticipantA,
		ParticipantB: params.ParticipantB,
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
	var virtualChannel VirtualChannel
	if err := ledger.db.Where("channel_id = ?", sendReq.ChannelID).First(&virtualChannel).Error; err != nil {
		return "", fmt.Errorf("failed to find virtual channel: %w", err)
	}

	fmt.Println()
	fmt.Println("virtualChannel:", virtualChannel)
	fmt.Println("sender:", sender)
	fmt.Println("virtualChannel.ParticipantA:", virtualChannel.ParticipantA)
	fmt.Println("virtualChannel.ParticipantB:", virtualChannel.ParticipantB)
	fmt.Println()
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

// HandlePing responds to a ping request with a pong response in RPC format
func HandlePing(req *RPCRequest) (*RPCResponse, error) {
	rpcResponse := CreateResponse(req.Req.RequestID, "pong", []any{}, time.Now())
	return rpcResponse, nil
}

// HandleAuthenticate handles the authentication process
func HandleAuthenticate(conn *websocket.Conn, authMessage []byte) (string, error) {
	// Parse the authentication message
	var authMsg AuthMessage
	if err := json.Unmarshal(authMessage, &authMsg); err != nil {
		return "", errors.New("invalid authentication message format")
	}

	// // Validate authentication message format
	// if len(authMsg.Req) < 4 || authMsg.Sig == "" {
	// 	return "", errors.New("invalid authentication message format")
	// }

	// Extract method and ensure it's auth
	method, ok := authMsg.Req[1].(string)
	if !ok || method != "auth" {
		return "", errors.New("first message must be an authentication message")
	}

	// Extract public key from req[2]
	pubKeyArr, ok := authMsg.Req[2].([]interface{})
	if !ok || len(pubKeyArr) == 0 {
		return "", errors.New("missing public key in authentication message")
	}

	pubKey, ok := pubKeyArr[0].(string)
	if !ok || pubKey == "" {
		return "", errors.New("invalid public key format")
	}

	// Make sure pubKey is in the full format with 0x prefix
	if !strings.HasPrefix(pubKey, "0x") {
		pubKey = "0x" + pubKey
	}

	// // Authenticate using nitrolite.Verify
	address := common.HexToAddress(pubKey)

	// Decode the signature
	// sigBytes, err := hexutil.Decode(authMsg.Sig)
	// if err != nil || len(sigBytes) != 65 {
	// 	return "", errors.New("invalid signature format")
	// }

	// // Serialize the auth message request to JSON
	// reqBytes, err := json.Marshal(authMsg.Req)
	// if err != nil {
	// 	return "", errors.New("error serializing auth message")
	// }

	// Create a nitrolite.Signature from r, s, v components
	// var sig nitrolite.Signature
	// copy(sig.R[:], sigBytes[0:32])
	// copy(sig.S[:], sigBytes[32:64])
	// sig.V = sigBytes[64]

	// // Use nitrolite.Verify for signature verification
	// isValid, err := nitrolite.Verify(reqBytes, sig, address)
	// if err != nil || !isValid {
	// 	return "", errors.New("invalid signature")
	// }

	// Authentication successful, pubKey may be returned with or without 0x prefix
	// Strip the 0x prefix for consistency
	return address.Hex(), nil
}
