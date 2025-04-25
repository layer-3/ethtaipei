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
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// CreateVAppParams represents parameters needed for virtual app creation
type CreateVAppParams struct {
	Participants       []string     `json:"participants"` // Participants signer addresses spacified when creating his direct channel.
	InitialAllocations []Allocation `json:"allocations"`
	Signers            []string     `json:"signers"` // Participants agree on a set of signers required to close the channel.
}

// CloseVAppParams represents parameters needed for virtual app closure
type CloseVAppParams struct {
	AppID            string       `json:"app_id"`
	FinalAllocations []Allocation `json:"allocations"`
}

// VAppResponse represents response data for channel operations
type VAppResponse struct {
	ChannelID string `json:"app_id"`
	Status    string `json:"status"`
}

// CloseDirectChannelParams represents parameters needed for virtual app closure
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

// HandleCreateVApp creates a virtual app between two participants
func HandleCreateVApp(rpc *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	// Extract the channel parameters from the request
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	// Parse the parameters
	var vApp CreateVAppParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &vApp); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	log.Printf("Parsed parameters: %+v\n", vApp)

	if len(vApp.Participants) < 2 {
		return nil, errors.New("invalid number of participants")
	}

	// Allocation should be specified for each participant even if it is zero.
	if len(vApp.InitialAllocations) != len(vApp.Participants) {
		return nil, errors.New("invalid allocations")
	}

	var participantsAddresses []common.Address
	for _, participant := range vApp.Participants {
		participantsAddresses = append(participantsAddresses, common.HexToAddress(participant))
	}

	// Generate a unique channel ID for the virtual app (TODO: rethink app ID generation)
	nitroliteChannel := nitrolite.Channel{
		Participants: participantsAddresses,
		Adjudicator:  common.HexToAddress("0x0000000000000000000000000000000000000000"),
		Challenge:    0, // Use placeholder values for virtual apps.
		Nonce:        rpc.Req.Timestamp,
	}
	vAppID := nitrolite.GetChannelID(nitroliteChannel)

	reqBytes, err := json.Marshal(rpc.Req)
	if err != nil {
		return nil, errors.New("error serializing auth message")
	}

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		for _, allocation := range vApp.InitialAllocations {
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

			toAccount := ledgerTx.Account(vAppID.Hex(), allocation.Participant)
			if err := account.Transfer(toAccount, allocation.TokenAddress, allocation.Amount.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds from participant A: %w", err)
			}
		}

		// Record the virtual app creation in state
		vAppDB := &VApp{
			AppID:        vAppID.Hex(),
			Participants: vApp.Participants,
			Status:       ChannelStatusOpen,
			Signers:      vApp.Signers,
			Challenge:    60, // TODO: specify in the request
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(vAppDB).Error; err != nil {
			return fmt.Errorf("failed to record virtual app: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create a response
	response := &VAppResponse{
		ChannelID: vAppID.Hex(),
		Status:    string(ChannelStatusOpen),
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// PublicMessageRequest represents a request to broadcast a message to all participants
type PublicMessageRequest struct {
	Message string `json:"message"`
}

// getVCRecipients handles sending a message through a virtual app
func getVCRecipients(address, vAppID string, ledger *Ledger) ([]string, error) {
	// Validate required fields.
	if vAppID == "" {
		return nil, errors.New("missing required field: channelId")
	}

	// TODO: use cache, do not go to database in each request.

	// Query the database for the virtual app
	var vApp VApp
	if err := ledger.db.Where("account_id = ?", vAppID).First(&vApp).Error; err != nil {
		return nil, fmt.Errorf("failed to find virtual app: %w", err)
	}

	// Exclude the sender address from the participants to send to
	var participants []string
	for _, participant := range vApp.Participants {
		if participant != address {
			participants = append(participants, participant)
		}
	}

	return participants, nil
}

// AvailabilityResponse represents a participant's availability for virtual apps
type AvailabilityResponse struct {
	Address string `json:"address"`
	Amount  int64  `json:"amount"`
}

// HandleListParticipants returns a list of direct channels where virtual apps can be created
func HandleListParticipants(rpc *RPCMessage, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
	var tokenAddress string
	if len(rpc.Req.Params) > 0 {
		paramsJSON, err := json.Marshal(rpc.Req.Params[0])
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				tokenAddress = params["token"]
			}
		}
	}

	if tokenAddress == "" {
		return nil, errors.New("missing token address")
	}

	// Find all open direct channels where the broker is participant B
	var channels []Channel
	if err := channelService.db.Where("participant_b = ? AND status = ?", BrokerAddress, ChannelStatusOpen).Find(&channels).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch channels: %w", err)
	}

	// Create a response list with participant addresses and available funds
	var availableChannels []AvailabilityResponse
	for _, channel := range channels {
		account := ledger.Account(channel.ChannelID, channel.ParticipantA)
		balance, err := account.Balance(tokenAddress)
		if err != nil {
			continue
		}

		availableChannels = append(availableChannels, AvailabilityResponse{
			Address: channel.ParticipantA,
			Amount:  balance,
		})
	}

	// Create the RPC response
	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{availableChannels}, time.Now())
	return rpcResponse, nil
}

// HandleCloseDirectChannel processes a request to close a direct payment channel
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
	balance, err := account.Balance(channel.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	if channel.Amount-balance < 0 {
		return nil, errors.New("temporary dev error: resize this channel first")
	}

	if balance < 0 {
		return nil, errors.New("insufficient funds for participant: " + channel.Token)
	}

	allocations := []nitrolite.Allocation{
		{
			Destination: common.HexToAddress(params.FundsDestination),
			Token:       common.HexToAddress(channel.Token),
			Amount:      big.NewInt(balance),
		},
		{
			Destination: common.HexToAddress(channel.ParticipantB),
			Token:       common.HexToAddress(channel.Token),
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

// HandleCloseVApp closes a virtual app and redistributes funds to participants
func HandleCloseVApp(req *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	// Extract parameters from the request
	if len(req.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var params CloseVAppParams
	paramsJSON, err := json.Marshal(req.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	if params.AppID == "" || len(params.FinalAllocations) == 0 {
		return nil, errors.New("missing required parameters: channelId or allocations")
	}

	reqBytes, err := json.Marshal(req.Req)
	if err != nil {
		return nil, errors.New("error serializing auth message")
	}

	// Perform atomic transaction
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// Fetch and validate the virtual app
		var vApp VApp
		if err := tx.Where("app_id = ? AND status = ?", params.AppID, ChannelStatusOpen).Order("nonce DESC").
			First(&vApp).Error; err != nil {
			return fmt.Errorf("virtual app not found or not open: %w", err)
		}

		// Validate payload was signed by the virtual app signers
		if len(req.Sig) != len(vApp.Signers) {
			return fmt.Errorf("unexpected number of signatures: %v instead of %v", len(req.Sig), len(vApp.Signers))
		}

		// Validate that RPC message is signed by the specified signers on channel creation.
		for _, signer := range vApp.Signers {
			if err := validateSignature(reqBytes, req.Sig, signer); err != nil {
				return err
			}
		}

		// Process allocations
		totalVirtualAppBalance, sumAllocations := int64(0), int64(0)
		for _, participant := range vApp.Participants {
			allocation := findAllocation(params.FinalAllocations, participant)
			if allocation == nil || allocation.Amount == nil || allocation.Amount.Sign() < 0 {
				return errors.New("invalid allocation")
			}

			// Adjust balances
			virtualBalance := ledgerTx.Account(vApp.AppID, participant)
			participantBalance, err := virtualBalance.Balance(allocation.TokenAddress)
			if err != nil {
				return fmt.Errorf("failed to check balance for %s: %w", participant, err)
			}
			totalVirtualAppBalance += participantBalance

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

		if sumAllocations != totalVirtualAppBalance {
			return errors.New("allocation mismatch with virtual app balance")
		}

		// Close the virtual app
		return tx.Model(&vApp).Updates(map[string]any{
			"status":     ChannelStatusClosed,
			"updated_at": time.Now(),
		}).Error
	})

	if err != nil {
		return nil, err
	}

	// Create response
	response := &VAppResponse{
		ChannelID: params.AppID,
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

// BrokerConfig represents the broker configuration information
type BrokerConfig struct {
	BrokerAddress string `json:"brokerAddress"`
}

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

// AuthResponse represents the server's challenge response
type AuthResponse struct {
	ChallengeMessage uuid.UUID `json:"challenge_message"` // The message to sign
	Token            string    `json:"token"`             // The challenge token
}

// AuthVerifyParams represents parameters for completing authentication
type AuthVerifyParams struct {
	Challenge uuid.UUID `json:"challenge"` // The challenge token
	Address   string    `json:"address"`   // The client's address
}

// HandleAuthenticate initializes the authentication process by generating a challenge
func HandleAuthenticate(signer *Signer, conn *websocket.Conn, rpc *RPCMessage, authManager *AuthManager) error {
	// Parse the parameters
	if len(rpc.Req.Params) < 1 {
		return errors.New("missing parameters")
	}

	addr, ok := rpc.Req.Params[0].(string)
	if !ok || addr == "" {
		return errors.New("invalid address")
	}

	// Generate a challenge for this address
	token, err := authManager.GenerateChallenge(addr)
	if err != nil {
		log.Printf("Failed to generate challenge: %v", err)
		return fmt.Errorf("failed to generate challenge: %w", err)
	}

	// Create challenge response
	challengeRes := AuthResponse{
		ChallengeMessage: token,
	}

	// Create RPC response with the challenge
	response := CreateResponse(rpc.Req.RequestID, "challenge", []any{challengeRes}, time.Now())

	// Sign the response with the server's key
	resBytes, _ := json.Marshal(response.Res)
	signature, _ := signer.Sign(resBytes)
	response.Sig = []string{hexutil.Encode(signature)}

	// Send the challenge response
	responseData, _ := json.Marshal(response)
	if err = conn.WriteMessage(websocket.TextMessage, responseData); err != nil {
		log.Printf("Error sending challenge: %v", err)
		return fmt.Errorf("error sending challenge: %w", err)
	}

	return nil
}

// HandleVerifyAuth verifies an authentication response to a challenge
func HandleVerifyAuth(conn *websocket.Conn, rpc *RPCMessage, authManager *AuthManager, signer *Signer) (string, error) {
	// Parse the authentication parameters
	if len(rpc.Req.Params) < 1 {
		return "", errors.New("missing parameters")
	}

	// Extract auth parameters
	var authParams AuthVerifyParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return "", fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &authParams); err != nil {
		return "", fmt.Errorf("invalid parameters format: %w", err)
	}

	// Ensure address has 0x prefix
	addr := authParams.Address
	if !strings.HasPrefix(addr, "0x") {
		addr = "0x" + addr
	}

	// Validate the request signature
	if len(rpc.Sig) == 0 {
		return "", errors.New("missing signature in request")
	}

	reqBytes, err := json.Marshal(rpc.Req)
	if err != nil {
		return "", errors.New("error serializing auth message")
	}

	isValid, err := ValidateSignature(reqBytes, rpc.Sig[0], addr)
	if err != nil || !isValid {
		return "", errors.New("invalid signature")
	}

	err = authManager.ValidateChallenge(authParams.Challenge, addr)
	if err != nil {
		log.Printf("Challenge verification failed: %v", err)
		return "", err
	}

	// Create success response following the RPC format
	response := CreateResponse(rpc.Req.RequestID, "verify", []any{map[string]any{
		"address": addr,
		"success": true,
	}}, time.Now())

	// Sign the response with the server's key
	resBytes, _ := json.Marshal(response.Res)
	signature, _ := signer.Sign(resBytes)
	response.Sig = []string{hexutil.Encode(signature)}

	responseData, _ := json.Marshal(response)
	if err = conn.WriteMessage(websocket.TextMessage, responseData); err != nil {
		log.Printf("Error sending auth success: %v", err)
		return "", err
	}

	return addr, nil
}
