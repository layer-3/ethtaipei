package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// AppDefinition represents the definition of an application on the ledger
type AppDefinition struct {
	Protocol     string   `json:"protocol"`
	Participants []string `json:"participants"` // Participants from direct channels with broker.
	Weights      []int64  `json:"weights"`      // Signature weight for each participant.
	Quorum       int      `json:"quorum"`
	Challenge    uint64   `json:"challenge"`
	Nonce        uint64   `json:"nonce,omitempty"`
}

// CreateApplicationParams represents parameters needed for virtual app creation
type CreateApplicationParams struct {
	Definition  AppDefinition `json:"definition"`
	Token       string        `json:"token"`
	Allocations []int64       `json:"allocations"`
}

type CreateAppSignData struct {
	RequestID uint64
	Method    string
	Params    []CreateApplicationParams
	Timestamp uint64
}

func (r CreateAppSignData) MarshalJSON() ([]byte, error) {
	arr := []interface{}{r.RequestID, r.Method, r.Params, r.Timestamp}
	return json.Marshal(arr)
}

// CloseApplicationParams represents parameters needed for virtual app closure
type CloseApplicationParams struct {
	AppID            string  `json:"app_id"`
	FinalAllocations []int64 `json:"allocations"`
}

type CloseAppSignData struct {
	RequestID uint64
	Method    string
	Params    []CloseApplicationParams
	Timestamp uint64
}

func (r CloseAppSignData) MarshalJSON() ([]byte, error) {
	arr := []interface{}{r.RequestID, r.Method, r.Params, r.Timestamp}
	return json.Marshal(arr)
}

// AppResponse represents response data for application operations
type AppResponse struct {
	AppID  string `json:"app_id"`
	Status string `json:"status"`
}

// ResizeChannelParams represents parameters needed for resizing a direct channel
type ResizeChannelParams struct {
	ChannelID         string   `json:"channel_id"`
	ParticipantChange *big.Int `json:"participant_change"` // how much user wants to deposit or withdraw.
	FundsDestination  string   `json:"funds_destination"`
}

// ResizeChannelResponse represents the response for resizing a direct channel
type ResizeChannelResponse struct {
	ChannelID   string       `json:"channel_id"`
	StateData   string       `json:"state_data"`
	Intent      uint8        `json:"intent"`
	Version     *big.Int     `json:"version"`
	Allocations []Allocation `json:"allocations"`
	StateHash   string       `json:"state_hash"`
	Signature   Signature    `json:"server_signature"`
}

type ResizeChannelSignData struct {
	RequestID uint64
	Method    string
	Params    []ResizeChannelParams
	Timestamp uint64
}

func (r ResizeChannelSignData) MarshalJSON() ([]byte, error) {
	arr := []interface{}{r.RequestID, r.Method, r.Params, r.Timestamp}
	return json.Marshal(arr)
}

// CloseChannelParams represents parameters needed for direct channel closure
type CloseChannelParams struct {
	ChannelID        string `json:"channel_id"`
	FundsDestination string `json:"funds_destination"`
}

// CloseChannelResponse represents the response for closing a direct channel
type CloseChannelResponse struct {
	ChannelID        string       `json:"channel_id"`
	Intent           uint8        `json:"intent"`
	Version          *big.Int     `json:"version"`
	StateData        string       `json:"state_data"`
	FinalAllocations []Allocation `json:"allocations"`
	StateHash        string       `json:"state_hash"`
	Signature        Signature    `json:"server_signature"`
}

type Signature struct {
	V uint8  `json:"v,string"`
	R string `json:"r,string"`
	S string `json:"s,string"`
}

// AvailableBalance represents a participant's availability for virtual apps
type AvailableBalance struct {
	Address string `json:"address"`
	Amount  int64  `json:"amount"`
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

	rpcResponse := CreateResponse(req.Req.RequestID, "get_config", []any{config}, time.Now())
	return rpcResponse, nil
}

// HandlePing responds to a ping request with a pong response in RPC format
func HandlePing(req *RPCMessage) (*RPCResponse, error) {
	rpcResponse := CreateResponse(req.Req.RequestID, "pong", []any{}, time.Now())
	return rpcResponse, nil
}

// HandleGetLedgerBalances returns a list of participants and their balances for a ledger account
func HandleGetLedgerBalances(rpc *RPCMessage, channelService *ChannelService, ledger *Ledger) (*RPCResponse, error) {
	var accountID string

	if len(rpc.Req.Params) > 0 {
		paramsJSON, err := json.Marshal(rpc.Req.Params[0])
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				accountID = params["acc"]
			}
		}
	}

	balances, err := GetAccountBalances(ledger.db, accountID)
	if err != nil {
		return nil, fmt.Errorf("failed to find account: %w", err)
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{balances}, time.Now())
	return rpcResponse, nil
}

// HandleCreateApplication creates a virtual application between participants
func HandleCreateApplication(rpc *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var createApp CreateApplicationParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &createApp); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	if len(createApp.Definition.Participants) < 2 {
		return nil, errors.New("invalid number of participants")
	}

	// Allocation should be specified for each participant even if it is zero.
	if len(createApp.Allocations) != len(createApp.Definition.Participants) {
		return nil, errors.New("number of allocations must be equal to participants")
	}

	if len(createApp.Definition.Weights) != len(createApp.Definition.Participants) {
		return nil, errors.New("number of weights must be equal to participants")
	}

	var participantsAddresses []common.Address
	for _, participant := range createApp.Definition.Participants {
		participantsAddresses = append(participantsAddresses, common.HexToAddress(participant))
	}

	if createApp.Definition.Nonce == 0 {
		createApp.Definition.Nonce = rpc.Req.Timestamp
	}

	// Generate a unique ID for the virtual application (TODO: rethink app ID generation)
	nitroliteChannel := nitrolite.Channel{
		Participants: participantsAddresses,
		Adjudicator:  common.HexToAddress("0x0000000000000000000000000000000000000000"),
		Challenge:    createApp.Definition.Challenge,
		Nonce:        createApp.Definition.Nonce,
	}
	vAppID := nitrolite.GetChannelID(nitroliteChannel)

	req := CreateAppSignData{
		RequestID: rpc.Req.RequestID,
		Method:    rpc.Req.Method,
		Params:    []CreateApplicationParams{{Definition: createApp.Definition, Token: createApp.Token, Allocations: createApp.Allocations}},
		Timestamp: rpc.Req.Timestamp,
	}

	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, errors.New("error serializing message")
	}

	// Initial allocations from intent
	allocations := make([]Allocation, len(createApp.Definition.Participants))
	for i, participant := range createApp.Definition.Participants {
		allocations[i] = Allocation{
			Participant:  participant,
			TokenAddress: createApp.Token,
			Amount:       big.NewInt(createApp.Allocations[i]),
		}
	}

	recoveredAddresses := map[string]bool{}
	for _, sig := range rpc.Sig {
		addr, err := RecoverAddress(reqBytes, sig)
		if err != nil {
			return nil, errors.New("invalid signature")
		}
		recoveredAddresses[addr] = true
	}

	// Use a transaction to ensure atomicity for the entire operation
	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		for _, allocation := range allocations {
			participantChannel, err := getDirectChannelForParticipant(tx, allocation.Participant)
			if err != nil {
				return err
			}

			if allocation.Amount.Sign() < 0 {
				return errors.New("invalid allocation")
			}

			if allocation.Amount.Sign() > 0 {
				if !recoveredAddresses[allocation.Participant] {
					return fmt.Errorf("missing signature for participant %s", allocation.Participant)
				}
			}

			account := ledgerTx.SelectBeneficiaryAccount(participantChannel.ChannelID, allocation.Participant)
			balance, err := account.Balance()
			if err != nil {
				return fmt.Errorf("failed to check participant balance: %w", err)
			}
			if balance < allocation.Amount.Int64() {
				return errors.New("insufficient funds")
			}

			toAccount := ledgerTx.SelectBeneficiaryAccount(vAppID.Hex(), allocation.Participant)
			if err := account.Transfer(toAccount, allocation.Amount.Int64()); err != nil {
				return fmt.Errorf("failed to transfer funds from participant: %w", err)
			}
		}

		weights := pq.Int64Array{}
		for _, v := range createApp.Definition.Weights {
			weights = append(weights, v)
		}

		// Record the virtual app creation in state
		vAppDB := &VApp{
			Protocol:     createApp.Definition.Protocol,
			AppID:        vAppID.Hex(),
			Participants: createApp.Definition.Participants,
			Status:       ChannelStatusOpen,
			Challenge:    createApp.Definition.Challenge,
			Weights:      weights,
			Token:        createApp.Token,
			Quorum:       createApp.Definition.Quorum,
			Nonce:        createApp.Definition.Nonce,
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

	response := &AppResponse{
		AppID:  vAppID.Hex(),
		Status: string(ChannelStatusOpen),
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// HandleCloseApplication closes a virtual app and redistributes funds to participants
func HandleCloseApplication(rpc *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var params CloseApplicationParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	if params.AppID == "" || len(params.FinalAllocations) == 0 {
		return nil, errors.New("missing required parameters: app_id or allocations")
	}

	req := CloseAppSignData{
		RequestID: rpc.Req.RequestID,
		Method:    rpc.Req.Method,
		Params:    []CloseApplicationParams{{AppID: params.AppID, FinalAllocations: params.FinalAllocations}},
		Timestamp: rpc.Req.Timestamp,
	}

	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, errors.New("error serializing message")
	}

	err = ledger.db.Transaction(func(tx *gorm.DB) error {
		ledgerTx := &Ledger{db: tx}

		// Fetch and validate the virtual app
		var vApp VApp
		if err := tx.Where("app_id = ? AND status = ?", params.AppID, ChannelStatusOpen).Order("nonce DESC").
			First(&vApp).Error; err != nil {
			return fmt.Errorf("virtual app not found or not open: %w", err)
		}

		participantWeights := make(map[string]int64, len(vApp.Participants))
		for i, addr := range vApp.Participants {
			if i < len(vApp.Weights) {
				participantWeights[strings.ToLower(addr)] = vApp.Weights[i]
			}
		}

		var totalWeight int64
		for _, sigHex := range rpc.Sig {
			recovered, err := RecoverAddress(reqBytes, sigHex)
			if err != nil {
				return err
			}
			if w, ok := participantWeights[strings.ToLower(recovered)]; ok && w > 0 {
				totalWeight += w
			}
		}

		if totalWeight < int64(vApp.Quorum) {
			return fmt.Errorf("quorum not met: %d/%d", totalWeight, vApp.Quorum)
		}

		fmt.Println("Quorum met:", totalWeight, "of", vApp.Quorum)

		if len(params.FinalAllocations) != len(vApp.Participants) {
			return errors.New("number of allocations must match number of participants")
		}

		// Process allocations
		totalVirtualAppBalance, sumAllocations := int64(0), int64(0)
		for i, participant := range vApp.Participants {
			allocation := params.FinalAllocations[i]
			if allocation < 0 {
				return errors.New("invalid allocation")
			}

			// Adjust balances
			virtualBalance := ledgerTx.SelectBeneficiaryAccount(vApp.AppID, participant)
			participantBalance, err := virtualBalance.Balance()
			if err != nil {
				return fmt.Errorf("failed to check balance for %s: %w", participant, err)
			}
			totalVirtualAppBalance += participantBalance

			if err := virtualBalance.Record(-participantBalance); err != nil {
				return fmt.Errorf("failed to adjust virtual balance for %s: %w", participant, err)
			}

			directChannel, err := getDirectChannelForParticipant(tx, participant)
			if err != nil {
				return fmt.Errorf("failed to find direct channel for %s: %w", participant, err)
			}

			toAccount := ledgerTx.SelectBeneficiaryAccount(directChannel.ChannelID, participant)
			if err := toAccount.Record(allocation); err != nil {
				return fmt.Errorf("failed to adjust direct balance for %s: %w", participant, err)
			}
			sumAllocations += allocation
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

	response := &AppResponse{
		AppID:  params.AppID,
		Status: string(ChannelStatusClosed),
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// HandleGetAppDefinition returns the application definition for a ledger account
func HandleGetAppDefinition(rpc *RPCMessage, ledger *Ledger) (*RPCResponse, error) {
	var accountID string

	if len(rpc.Req.Params) > 0 {
		paramsJSON, err := json.Marshal(rpc.Req.Params[0])
		if err == nil {
			var params map[string]string
			if err := json.Unmarshal(paramsJSON, &params); err == nil {
				accountID = params["acc"]
			}
		}
	}

	if accountID == "" {
		return nil, errors.New("missing account ID")
	}

	var vApp VApp
	if err := ledger.db.Where("app_id = ?", accountID).First(&vApp).Error; err != nil {
		return nil, fmt.Errorf("failed to find application: %w", err)
	}

	appDef := AppDefinition{
		Protocol:     vApp.Protocol,
		Participants: vApp.Participants,
		Weights:      make([]int64, len(vApp.Participants)), // Default weights to 0 for now
		Quorum:       vApp.Quorum,                           // Default quorum to 100 for now
		Challenge:    vApp.Challenge,
		Nonce:        vApp.Nonce,
	}

	for i := range vApp.Weights {
		appDef.Weights[i] = vApp.Weights[i]
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{appDef}, time.Now())
	return rpcResponse, nil
}

// HandleResizeChannel processes a request to resize a direct payment channel
func HandleResizeChannel(rpc *RPCMessage, ledger *Ledger, signer *Signer) (*RPCResponse, error) {
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var params ResizeChannelParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	if params.ParticipantChange == nil {
		return nil, errors.New("missing participant change amount")
	}

	channel, err := channelService.GetChannelByID(params.ChannelID)
	if err != nil {
		return nil, fmt.Errorf("failed to find channel: %w", err)
	}

	req := ResizeChannelSignData{
		RequestID: rpc.Req.RequestID,
		Method:    rpc.Req.Method,
		Params:    []ResizeChannelParams{{ChannelID: params.ChannelID, ParticipantChange: params.ParticipantChange, FundsDestination: params.FundsDestination}},
		Timestamp: rpc.Req.Timestamp,
	}

	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, errors.New("error serializing message")
	}

	isValid, err := ValidateSignature(reqBytes, rpc.Sig[0], channel.ParticipantA)
	if err != nil || !isValid {
		return nil, errors.New("invalid signature")
	}

	// Get current account balance
	account := ledger.SelectBeneficiaryAccount(channel.ChannelID, channel.ParticipantA)
	balance, err := account.Balance()
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	brokerPart := channel.Amount - balance
	brokerAllocation := int64(0)
	if brokerPart < 0 {
		brokerPart = 0
	}

	// Calculate the new channel amount
	newAmount := new(big.Int).Add(big.NewInt(balance), params.ParticipantChange)
	if newAmount.Sign() < 0 {
		return nil, errors.New("invalid resize amount")
	}

	allocations := []nitrolite.Allocation{
		{
			Destination: common.HexToAddress(params.FundsDestination),
			Token:       common.HexToAddress(channel.Token),
			Amount:      newAmount,
		},
		{
			Destination: common.HexToAddress(channel.ParticipantB),
			Token:       common.HexToAddress(channel.Token),
			Amount:      big.NewInt(0),
		},
	}

	resizeAmounts := []*big.Int{params.ParticipantChange, big.NewInt(-brokerAllocation)} // Always release broker funds if there is a surplus.

	intentionType, err := abi.NewType("int256[]", "", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create ABI type for intentions: %w", err)
	}

	intentionsArgs := abi.Arguments{
		{Type: intentionType},
	}

	encodedIntentions, err := intentionsArgs.Pack(resizeAmounts)
	if err != nil {
		return nil, fmt.Errorf("failed to pack intentions: %w", err)
	}

	// Encode the channel ID and state for signing
	channelID := common.HexToHash(channel.ChannelID)
	encodedState, err := nitrolite.EncodeState(channelID, nitrolite.IntentRESIZE, big.NewInt(int64(channel.Version)+1), encodedIntentions, allocations)
	if err != nil {
		return nil, fmt.Errorf("failed to encode state hash: %w", err)
	}

	// Generate state hash and sign it
	stateHash := crypto.Keccak256Hash(encodedState).Hex()
	sig, err := signer.NitroSign(encodedState)
	if err != nil {
		return nil, fmt.Errorf("failed to sign state: %w", err)
	}

	// TODO: Before that block balance operations until Resized event confirmation.

	response := ResizeChannelResponse{
		ChannelID: channel.ChannelID,
		Intent:    uint8(nitrolite.IntentRESIZE),
		Version:   big.NewInt(int64(channel.Version) + 1),
		StateData: hexutil.Encode(encodedIntentions),
		StateHash: stateHash,
		Signature: Signature{
			V: sig.V,
			R: hexutil.Encode(sig.R[:]),
			S: hexutil.Encode(sig.S[:]),
		},
	}

	for _, alloc := range allocations {
		response.Allocations = append(response.Allocations, Allocation{
			Participant:  alloc.Destination.Hex(),
			TokenAddress: alloc.Token.Hex(),
			Amount:       alloc.Amount,
		})
	}

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}

// HandleCloseChannel processes a request to close a direct payment channel
func HandleCloseChannel(rpc *RPCMessage, ledger *Ledger, signer *Signer) (*RPCResponse, error) {
	if len(rpc.Req.Params) < 1 {
		return nil, errors.New("missing parameters")
	}

	var params CloseChannelParams
	paramsJSON, err := json.Marshal(rpc.Req.Params[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse parameters: %w", err)
	}

	if err := json.Unmarshal(paramsJSON, &params); err != nil {
		return nil, fmt.Errorf("invalid parameters format: %w", err)
	}

	channel, err := channelService.GetChannelByID(params.ChannelID)
	if err != nil {
		return nil, fmt.Errorf("failed to find channel: %w", err)
	}

	reqBytes, err := json.Marshal(rpc.Req)
	if err != nil {
		return nil, errors.New("error serializing message")
	}

	isValid, err := ValidateSignature(reqBytes, rpc.Sig[0], channel.ParticipantA)
	if err != nil || !isValid {
		return nil, errors.New("invalid signature")
	}

	account := ledger.SelectBeneficiaryAccount(channel.ChannelID, channel.ParticipantA)
	balance, err := account.Balance()
	if err != nil {
		return nil, fmt.Errorf("failed to check participant A balance: %w", err)
	}

	if channel.Amount-balance < 0 {
		return nil, errors.New("resize this channel first")
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

	stateDataStr := "0x"
	stateData, err := hexutil.Decode(stateDataStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode state data: %w", err)
	}

	channelID := common.HexToHash(channel.ChannelID)
	encodedState, err := nitrolite.EncodeState(channelID, nitrolite.IntentFINALIZE, big.NewInt(int64(channel.Version)+1), stateData, allocations)
	if err != nil {
		return nil, fmt.Errorf("failed to encode state hash: %w", err)
	}

	stateHash := crypto.Keccak256Hash(encodedState).Hex()
	sig, err := signer.NitroSign(encodedState)
	if err != nil {
		return nil, fmt.Errorf("failed to sign state: %w", err)
	}

	response := CloseChannelResponse{
		ChannelID: channel.ChannelID,
		Intent:    uint8(nitrolite.IntentFINALIZE),
		Version:   big.NewInt(int64(channel.Version) + 1),
		StateData: stateDataStr,
		StateHash: stateHash,
		Signature: Signature{
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

	rpcResponse := CreateResponse(rpc.Req.RequestID, rpc.Req.Method, []any{response}, time.Now())
	return rpcResponse, nil
}
