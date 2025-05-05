package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// UnifiedWSHandler manages WebSocket connections with authentication
// and subsequent communication.
type UnifiedWSHandler struct {
	node           *centrifuge.Node
	signer         *Signer
	channelService *ChannelService
	ledger         *Ledger
	upgrader       websocket.Upgrader
	connections    map[string]*websocket.Conn
	connectionsMu  sync.RWMutex
	authManager    *AuthManager
}

// NewUnifiedWSHandler creates a new unified WebSocket handler.
func NewUnifiedWSHandler(
	node *centrifuge.Node,
	signer *Signer,
	channelService *ChannelService,
	ledger *Ledger,
) *UnifiedWSHandler {
	return &UnifiedWSHandler{
		node:           node,
		signer:         signer,
		channelService: channelService,
		ledger:         ledger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for testing; should be restricted in production
			},
		},
		connections: make(map[string]*websocket.Conn),
		authManager: NewAuthManager(),
	}
}

// HandleConnection handles the WebSocket connection lifecycle.
func (h *UnifiedWSHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Wait for authentication to complete
	var address string
	var authenticated bool

	// Continue reading messages until authentication completes
	for !authenticated {
		// Read message
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			return
		}

		// Parse the message
		var rpcMsg RPCMessage
		if err := json.Unmarshal(message, &rpcMsg); err != nil {
			log.Printf("Invalid message format: %v", err)
			h.sendErrorResponse(0, "error", conn, "Invalid message format")
			return
		}

		// Handle message based on the method
		switch rpcMsg.Req.Method {
		case "auth_request":
			// Client is initiating authentication
			err := HandleAuthRequest(h.signer, conn, &rpcMsg, h.authManager)
			if err != nil {
				log.Printf("Auth initialization failed: %v", err)
				h.sendErrorResponse(rpcMsg.Req.RequestID, "error", conn, err.Error())
			}
			continue

		case "auth_verify":
			// Client is responding to a challenge
			authAddr, err := HandleAuthVerify(conn, &rpcMsg, h.authManager, h.signer)
			if err != nil {
				log.Printf("Authentication verification failed: %v", err)
				h.sendErrorResponse(rpcMsg.Req.RequestID, "error", conn, err.Error())
				continue
			}

			// Authentication successful
			address = authAddr
			authenticated = true

		default:
			// Reject any other messages before authentication
			log.Printf("Unexpected message method during authentication: %s", rpcMsg.Req.Method)
			h.sendErrorResponse(rpcMsg.Req.RequestID, "error", conn, "Authentication required. Please send auth_request first.")
		}
	}

	log.Printf("Authentication successful for: %s", address)

	// Store connection for authenticated user
	h.connectionsMu.Lock()
	h.connections[address] = conn
	h.connectionsMu.Unlock()

	defer func() {
		h.connectionsMu.Lock()
		delete(h.connections, address)
		h.connectionsMu.Unlock()
		log.Printf("Connection closed for participant: %s", address)
	}()

	log.Printf("Participant authenticated: %s", address)

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket unexpected close error: %v", err)
			} else {
				log.Printf("Error reading message: %v", err)
			}
			break
		}

		// Check if session is still valid
		if !h.authManager.ValidateSession(address) {
			log.Printf("Session expired for participant: %s", address)
			h.sendErrorResponse(0, "error", conn, "Session expired. Please re-authenticate.")
			break
		}

		// Update session activity timestamp
		h.authManager.UpdateSession(address)

		var rpcRequest RPCMessage
		if err := json.Unmarshal(message, &rpcRequest); err != nil {
			h.sendErrorResponse(0, "error", conn, "Invalid message format")
			continue
		}

		if rpcRequest.AccountID != "" {
			handlerErr := forwardMessage(&rpcRequest, address, h)
			if handlerErr != nil {
				log.Printf("Error forwarding message: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to send message: "+handlerErr.Error())
				continue
			}
			continue
		}

		var rpcResponse = &RPCResponse{}
		var handlerErr error

		switch rpcRequest.Req.Method {
		case "ping":
			rpcResponse, handlerErr = HandlePing(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling ping: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to process ping: "+handlerErr.Error())
				continue
			}

		case "get_config":
			rpcResponse, handlerErr = HandleGetConfig(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling get_config: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to get config: "+handlerErr.Error())
				continue
			}

		case "get_ledger_balances":
			rpcResponse, handlerErr = HandleGetLedgerBalances(&rpcRequest, h.channelService, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling get_ledger_balances: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to get ledger balances: "+handlerErr.Error())
				continue
			}

		case "get_app_definition":
			rpcResponse, handlerErr = HandleGetAppDefinition(&rpcRequest, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling get_app_definition: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to get app definition: "+handlerErr.Error())
				continue
			}

		case "create_app_session":
			rpcResponse, handlerErr = HandleCreateApplication(&rpcRequest, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling create_app_session: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to create application: "+handlerErr.Error())
				continue
			}

		case "close_app_session":
			rpcResponse, handlerErr = HandleCloseApplication(&rpcRequest, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling close_app_session: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to close application: "+handlerErr.Error())
				continue
			}

		case "resize_channel":
			rpcResponse, handlerErr = HandleResizeChannel(&rpcRequest, h.ledger, h.signer)
			if handlerErr != nil {
				log.Printf("Error handling resize_channel: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to resize channel: "+handlerErr.Error())
				continue
			}

		case "close_channel":
			rpcResponse, handlerErr = HandleCloseChannel(&rpcRequest, h.ledger, h.signer)
			if handlerErr != nil {
				log.Printf("Error handling close_channel: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to close channel: "+handlerErr.Error())
				continue
			}

		default:
			h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Unsupported method")
			continue
		}

		// For broker methods, send back a signed RPC response.
		byteData, _ := json.Marshal(rpcResponse.Res)
		signature, _ := h.signer.Sign(byteData)
		rpcResponse.Sig = []string{hexutil.Encode(signature)}
		wsResponseData, _ := json.Marshal(rpcResponse)

		// Use NextWriter for safer message delivery
		w, err := conn.NextWriter(websocket.TextMessage)
		if err != nil {
			log.Printf("Error getting writer for response: %v", err)
			continue
		}

		if _, err := w.Write(wsResponseData); err != nil {
			log.Printf("Error writing response: %v", err)
			w.Close()
			continue
		}

		if err := w.Close(); err != nil {
			log.Printf("Error closing writer for response: %v", err)
			continue
		}
	}
}

// forwardMessage forwards an RPC message to all recipients in a virtual app
func forwardMessage(rpcRequest *RPCMessage, fromAddress string, h *UnifiedWSHandler) error {
	// Validate the signature for the message
	reqBytes, err := json.Marshal(rpcRequest.Req)
	if err != nil {
		log.Printf("Error serializing request for validation: %v", err)
		return errors.New("Error validating signature")
	}

	recoveredAddresses := map[string]bool{}
	for _, sig := range rpcRequest.Sig {
		addr, err := RecoverAddress(reqBytes, sig)
		if err != nil {
			return errors.New("invalid signature")
		}
		recoveredAddresses[addr] = true
	}

	if !recoveredAddresses[fromAddress] {
		log.Printf("Signature validation failed: %v", err)
		return errors.New("Invalid signature")
	}

	// TODO: use cache, do not go to database on each request.
	var vApp VApp
	if err := h.ledger.db.Where("app_id = ?", rpcRequest.AccountID).First(&vApp).Error; err != nil {
		return errors.New("failed to find virtual app: " + err.Error())
	}

	// Iterate over all recipients in a virtual app and send the message
	for _, recipient := range vApp.Participants {
		if recipient == fromAddress {
			continue
		}

		h.connectionsMu.RLock()
		recipientConn, exists := h.connections[recipient]
		h.connectionsMu.RUnlock()
		if exists {
			msg, _ := json.Marshal(rpcRequest)

			// Use NextWriter for safer message delivery
			w, err := recipientConn.NextWriter(websocket.TextMessage)
			if err != nil {
				log.Printf("Error getting writer for forwarded message to %s: %v", recipient, err)
				continue
			}

			if _, err := w.Write(msg); err != nil {
				log.Printf("Error writing forwarded message to %s: %v", recipient, err)
				w.Close()
				continue
			}

			if err := w.Close(); err != nil {
				log.Printf("Error closing writer for forwarded message to %s: %v", recipient, err)
				continue
			}

			log.Printf("Successfully forwarded message to %s", recipient)
		} else {
			log.Printf("Recipient %s not connected", recipient)
			continue
		}
	}
	return nil
}

// sendErrorResponse creates and sends an error response to the client
func (h *UnifiedWSHandler) sendErrorResponse(requestID uint64, method string, conn *websocket.Conn, errMsg string) {
	response := CreateResponse(requestID, method, []any{map[string]any{
		"error": errMsg,
	}}, time.Now())

	byteData, _ := json.Marshal(response.Res)
	signature, _ := h.signer.Sign(byteData)
	response.Sig = []string{hexutil.Encode(signature)}

	responseData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling error response: %v", err)
		return
	}

	// Set a short write deadline to prevent blocking on unresponsive clients
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))

	// Use NextWriter for safer message delivery
	w, err := conn.NextWriter(websocket.TextMessage)
	if err != nil {
		log.Printf("Error getting writer for error response: %v", err)
		return
	}

	if _, err := w.Write(responseData); err != nil {
		log.Printf("Error writing error response: %v", err)
		w.Close()
		return
	}

	if err := w.Close(); err != nil {
		log.Printf("Error closing writer for error response: %v", err)
	}

	// Reset the write deadline
	conn.SetWriteDeadline(time.Time{})
}

// CloseAllConnections closes all open WebSocket connections during shutdown
func (h *UnifiedWSHandler) CloseAllConnections() {
	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	for userID, conn := range h.connections {
		log.Printf("Closing connection for participant: %s", userID)
		conn.Close()
	}
}

// AuthResponse represents the server's challenge response
type AuthResponse struct {
	ChallengeMessage uuid.UUID `json:"challenge_message"` // The message to sign
}

// AuthVerifyParams represents parameters for completing authentication
type AuthVerifyParams struct {
	Challenge uuid.UUID `json:"challenge"` // The challenge token
	Address   string    `json:"address"`   // The client's address
}

// HandleAuthRequest initializes the authentication process by generating a challenge
func HandleAuthRequest(signer *Signer, conn *websocket.Conn, rpc *RPCMessage, authManager *AuthManager) error {
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
		return fmt.Errorf("failed to generate challenge: %w", err)
	}

	// Create challenge response
	challengeRes := AuthResponse{
		ChallengeMessage: token,
	}

	// Create RPC response with the challenge
	response := CreateResponse(rpc.Req.RequestID, "auth_challenge", []any{challengeRes}, time.Now())

	// Sign the response with the server's key
	resBytes, _ := json.Marshal(response.Res)
	signature, _ := signer.Sign(resBytes)
	response.Sig = []string{hexutil.Encode(signature)}

	// Send the challenge response
	responseData, _ := json.Marshal(response)
	return conn.WriteMessage(websocket.TextMessage, responseData)
}

// HandleAuthVerify verifies an authentication response to a challenge
func HandleAuthVerify(conn *websocket.Conn, rpc *RPCMessage, authManager *AuthManager, signer *Signer) (string, error) {
	if len(rpc.Req.Params) < 1 {
		return "", errors.New("missing parameters")
	}

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

	response := CreateResponse(rpc.Req.RequestID, "auth_verify", []any{map[string]any{
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
