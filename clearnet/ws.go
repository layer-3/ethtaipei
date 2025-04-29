package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/gorilla/websocket"
)

// UnifiedWSHandler manages WebSocket connections with authentication
// and subsequent communication.
type UnifiedWSHandler struct {
	node              *centrifuge.Node
	signer            *Signer
	channelService    *ChannelService
	ledger            *Ledger
	rpcMessageService *RPCMessageService
	upgrader          websocket.Upgrader
	connections       map[string]*websocket.Conn
	connectionsMu     sync.RWMutex
	authManager       *AuthManager
}

// NewUnifiedWSHandler creates a new unified WebSocket handler.
func NewUnifiedWSHandler(
	node *centrifuge.Node,
	signer *Signer,
	channelService *ChannelService,
	ledger *Ledger,
	rpc *RPCMessageService,
) *UnifiedWSHandler {
	return &UnifiedWSHandler{
		node:              node,
		signer:            signer,
		channelService:    channelService,
		ledger:            ledger,
		rpcMessageService: rpc,
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

		// Store the incoming RPC message
		if err := h.rpcMessageService.StoreMessage(&rpcRequest); err != nil {
			log.Printf("Failed to store RPC message: %v", err)
			// continue processing even if storage fails
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

		// Store the response RPC message
		if err := h.rpcMessageService.StoreResponseMessage(&rpcRequest, rpcResponse); err != nil {
			log.Printf("Failed to store RPC response: %v", err)
			// continue processing even if storage fails
		}

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

	// Validate the signature
	err = validateSignature(reqBytes, rpcRequest.Sig, fromAddress)
	if err != nil {
		log.Printf("Signature validation failed: %v", err)
		return errors.New("Invalid signature")
	}

	sendTo, handlerErr := getApplicationRecipients(fromAddress, rpcRequest.AccountID, h.ledger)
	if handlerErr != nil {
		log.Printf("Error handling message: %v", handlerErr)
		return errors.New("Failed to send message: " + handlerErr.Error())
	}

	// No response sent back to sender - broker just acts as a proxy

	// Iterate over all recipients in a virtual app and send the message
	for _, recipient := range sendTo {
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

	// Store the error response
	request := &RPCMessage{
		Req: RPCData{
			RequestID: requestID,
			Method:    method,
			Params:    []any{},
			Timestamp: uint64(time.Now().Unix()),
		},
		Sig: []string{},
	}
	if err := h.rpcMessageService.StoreResponseMessage(request, response); err != nil {
		log.Printf("Failed to store error response: %v", err)
		// continue processing even if storage fails
	}

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
