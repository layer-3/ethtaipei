package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/gorilla/websocket"
)

// UnifiedWSHandler manages WebSocket connections with authentication
// and subsequent communication
type UnifiedWSHandler struct {
	node           *centrifuge.Node
	channelService *ChannelService
	rpcService     *RPCService
	ledger         *Ledger
	upgrader       websocket.Upgrader
	connections    map[string]*websocket.Conn
	connectionsMu  sync.RWMutex
}

// NewUnifiedWSHandler creates a new unified WebSocket handler
func NewUnifiedWSHandler(node *centrifuge.Node, channelService *ChannelService, rpcService *RPCService, ledger *Ledger) *UnifiedWSHandler {
	return &UnifiedWSHandler{
		node:           node,
		channelService: channelService,
		rpcService:     rpcService,
		ledger:         ledger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for testing; should be restricted in production
			},
		},
		connections: make(map[string]*websocket.Conn),
	}
}

// AuthMessage represents the first authentication message
type AuthMessage struct {
	Req []interface{} `json:"req"` // Format: [requestId, "auth", [public_key], timestamp]
	Sig string        `json:"sig"`
}

// RegularMessage represents any message after authentication
type RegularMessage struct {
	Req []interface{} `json:"req"` // Format: [requestId, "method", [args], timestamp]
	Sig string        `json:"sig"`
}

// RPCWSMessage represents an RPC message sent over websocket
type RPCWSMessage struct {
	Type string          `json:"type"` // "rpc_request" or "rpc_response"
	Data json.RawMessage `json:"data"` // RPCRequest or RPCResponse
}

// WSResponse represents a response sent back to the client
type WSResponse struct {
	Success bool            `json:"success"`
	Error   string          `json:"error,omitempty"`
	Type    string          `json:"type,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// HandleConnection handles the WebSocket connection lifecycle
func (h *UnifiedWSHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}

	// Set up connection close handling
	defer func() {
		conn.Close()
		// Connection cleanup will happen when authentication is successful
	}()

	// Read the first message, which must be authentication
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Error reading initial message: %v", err)
		sendErrorResponse(conn, "Failed to read initial message")
		return
	}

	// Parse the authentication message
	var authMsg AuthMessage
	if err := json.Unmarshal(message, &authMsg); err != nil {
		log.Printf("Error parsing auth message: %v", err)
		sendErrorResponse(conn, "Invalid authentication message format")
		return
	}

	// Validate authentication message format
	if len(authMsg.Req) < 4 || authMsg.Sig == "" {
		log.Printf("Invalid auth message format")
		sendErrorResponse(conn, "Invalid authentication message format")
		return
	}

	// Extract method and ensure it's auth
	method, ok := authMsg.Req[1].(string)
	if !ok || method != "auth" {
		log.Printf("First message must be an authentication message")
		sendErrorResponse(conn, "First message must be an authentication message")
		return
	}

	// Extract public key from req[2]
	pubKeyArr, ok := authMsg.Req[2].([]interface{})
	if !ok || len(pubKeyArr) == 0 {
		log.Printf("Missing public key in authentication message")
		sendErrorResponse(conn, "Missing public key in authentication message")
		return
	}

	pubKey, ok := pubKeyArr[0].(string)
	if !ok || pubKey == "" {
		log.Printf("Invalid public key format")
		sendErrorResponse(conn, "Invalid public key format")
		return
	}

	// Make sure pubKey is in the full format with 0x prefix
	if !strings.HasPrefix(pubKey, "0x") {
		pubKey = "0x" + pubKey
	}

	// Authenticate using nitrolite.Verify
	address := common.HexToAddress(pubKey)

	// Decode the signature
	sigBytes, err := hexutil.Decode(authMsg.Sig)
	if err != nil || len(sigBytes) != 65 {
		log.Printf("Invalid signature format: %v", err)
		sendErrorResponse(conn, "Invalid signature format")
		return
	}
	fmt.Printf("AuthMessage Request: %+v\n", authMsg.Req)
	// Serialize the auth message request to JSON
	reqBytes, err := json.Marshal(authMsg.Req)
	if err != nil {
		log.Printf("Error serializing auth message request: %v", err)
		sendErrorResponse(conn, "Internal server error")
		return
	}
	fmt.Println("bytes:", string(reqBytes))
	fmt.Println("sig:", authMsg.Sig)
	// Convert the serialized JSON to a hex string prefixed with "0x"
	// hexString := hexutil.Encode(reqBytes)

	// Compute the Keccak256 hash of the hex string
	//	messageHash := crypto.Keccak256Hash([]byte(reqBytes))

	//fmt.Printf("\nMessage: %s\nHash: %s\n\n", string(reqBytes), messageHash.Hex())

	// Create a nitrolite.Signature from r, s, v components
	var sig nitrolite.Signature
	copy(sig.R[:], sigBytes[0:32])
	copy(sig.S[:], sigBytes[32:64])
	sig.V = sigBytes[64]

	// Use nitrolite.Verify for signature verification
	isValid, err := nitrolite.Verify(reqBytes, sig, address)
	if err != nil || !isValid {
		log.Printf("Authentication failed: %v", err)
		sendErrorResponse(conn, "Invalid signature")
		return
	}

	log.Printf("Authentication successful for: %s", pubKey)

	// Store the public key for this connection
	// Optionally strip 0x prefix
	pubKey = strings.TrimPrefix(pubKey, "0x")

	// Authentication successful, send confirmation
	response := WSResponse{
		Success: true,
		Type:    "auth_success",
		Data:    json.RawMessage(`{"pub_key":"` + pubKey + `"}`),
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		sendErrorResponse(conn, "Internal server error")
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, responseData)
	if err != nil {
		log.Printf("Error sending auth success: %v", err)
		return
	}

	// Store the connection
	h.connectionsMu.Lock()
	h.connections[pubKey] = conn
	h.connectionsMu.Unlock()

	// Clean up the connection when done
	defer func() {
		h.connectionsMu.Lock()
		delete(h.connections, pubKey)
		h.connectionsMu.Unlock()
		log.Printf("Connection closed for participant: %s", pubKey)
	}()

	log.Printf("Participant authenticated: %s", pubKey)

	// Now handle regular messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		var regularMsg RegularMessage
		if err := json.Unmarshal(message, &regularMsg); err != nil {
			sendErrorResponse(conn, "Invalid message format")
			continue
		}

		// Validate message format
		if len(regularMsg.Req) < 4 || regularMsg.Sig == "" {
			sendErrorResponse(conn, "Invalid message format")
			continue
		}

		// Extract method, timestamp and data
		method, ok := regularMsg.Req[1].(string)
		if !ok || method == "" {
			sendErrorResponse(conn, "Missing method in message")
			continue
		}

		timestamp, _ := regularMsg.Req[3].(float64)

		// Decode the signature
		sigBytes, err := hexutil.Decode(regularMsg.Sig)
		if err != nil || len(sigBytes) != 65 {
			log.Printf("Invalid signature format: %v", err)
			sendErrorResponse(conn, "Invalid signature format")
			continue
		}

		reqBytes, err := json.Marshal(regularMsg.Req)
		if err != nil {
			log.Printf("Error serializing regular message request: %v", err)
			sendErrorResponse(conn, "Internal server error")
			continue
		}

		// Create a nitrolite.Signature from r, s, v components
		var sig nitrolite.Signature
		copy(sig.R[:], sigBytes[0:32])
		copy(sig.S[:], sigBytes[32:64])
		sig.V = sigBytes[64]

		// Use nitrolite.Verify
		address := common.HexToAddress(pubKey)
		isValid, err := nitrolite.Verify(reqBytes, sig, address)
		if err != nil || !isValid {
			log.Printf("Message verification failed: %v", err)
			sendErrorResponse(conn, "Invalid signature")
			continue
		}

		// Process the message based on method
		switch method {
		case "subscribe":
			// Handle channel subscription
			// Extract channel from args
			args, ok := regularMsg.Req[2].([]interface{})
			if !ok || len(args) == 0 {
				sendErrorResponse(conn, "Missing channel in subscribe request")
				continue
			}

			channel, ok := args[0].(string)
			if !ok || channel == "" {
				sendErrorResponse(conn, "Invalid channel format")
				continue
			}

			// Process subscription request
			response := WSResponse{
				Success: true,
				Type:    "subscribe_success",
				Data:    json.RawMessage(`{"channel":"` + channel + `"}`),
			}

			responseData, _ := json.Marshal(response)
			conn.WriteMessage(websocket.TextMessage, responseData)

		case "publish":
			// Handle message publishing
			// Extract channel and payload from args
			args, ok := regularMsg.Req[2].([]interface{})
			if !ok || len(args) < 2 {
				sendErrorResponse(conn, "Missing channel or payload in publish request")
				continue
			}

			channel, ok := args[0].(string)
			if !ok || channel == "" {
				sendErrorResponse(conn, "Invalid channel format")
				continue
			}

			// Get payload as JSON
			payloadBytes, err := json.Marshal(args[1])
			if err != nil {
				sendErrorResponse(conn, "Invalid payload format")
				continue
			}

			// In a real implementation, you would broadcast to all subscribers
			// For now, just acknowledge the publish
			response := WSResponse{
				Success: true,
				Type:    "publish_success",
				Data:    json.RawMessage(`{"channel":"` + channel + `"}`),
			}

			responseData, _ := json.Marshal(response)
			conn.WriteMessage(websocket.TextMessage, responseData)

			// Example of broadcasting to other connected clients subscribed to the channel
			// This is simplified - in a real system you'd track subscriptions
			h.broadcastMessage(channel, payloadBytes, pubKey)

		case "ping":
			// Simple ping/pong to keep the connection alive
			response := WSResponse{
				Success: true,
				Type:    "pong",
				Data:    json.RawMessage(`{"timestamp":"` + time.Now().Format(time.RFC3339) + `"}`),
			}

			responseData, _ := json.Marshal(response)
			conn.WriteMessage(websocket.TextMessage, responseData)

		case "rpc_request":
			// Handle RPC request from client
			// Extract RPC parameters from args
			args, ok := regularMsg.Req[2].([]interface{})
			if !ok || len(args) < 2 {
				sendErrorResponse(conn, "Missing RPC parameters")
				continue
			}

			// Create RPC request
			var rpcMethod string
			var requestID int
			var params interface{}

			if method, ok := args[0].(string); ok {
				rpcMethod = method
			} else {
				sendErrorResponse(conn, "Invalid RPC method")
				continue
			}

			if id, ok := args[1].(float64); ok {
				requestID = int(id)
			} else {
				sendErrorResponse(conn, "Invalid request ID")
				continue
			}

			if len(args) > 2 {
				params = args[2]
			}

			// Create RPC request object
			rpcRequest := RPCRequest{
				Req: RPCMessage{
					Method:    rpcMethod,
					RequestID: uint64(requestID),
					Params:    []any{params},
					Timestamp: uint64(timestamp),
				},
				Sig: regularMsg.Sig,
			}

			// Store RPC request in database
			_, err := h.rpcService.StoreRequest(&rpcRequest)
			if err != nil {
				sendErrorResponse(conn, "Failed to process RPC request")
				continue
			}

			// Process the RPC method
			// Here we'd typically have a map of available methods and handlers
			// For now we'll just echo back with the current timestamp

			// Create an RPC response
			newTimestamp := uint64(time.Now().UnixMilli())
			rpcResponse := CreateResponse(&rpcRequest, rpcRequest.Req.Params, newTimestamp)

			// In a real implementation, this would be signed by the server
			// For now we'll use a dummy signature
			rpcResponse.Sig = "dummy-server-signature"

			// Store the response
			_, err = h.rpcService.UpdateResponse(rpcResponse)
			if err != nil {
				sendErrorResponse(conn, "Failed to store RPC response")
				continue
			}

			// Return the response to the client
			responseJSON, _ := json.Marshal(rpcResponse)
			wsResponse := WSResponse{
				Success: true,
				Type:    "rpc_response",
				Data:    responseJSON,
			}

			wsResponseData, _ := json.Marshal(wsResponse)
			conn.WriteMessage(websocket.TextMessage, wsResponseData)

		default:
			// Unknown message type
			sendErrorResponse(conn, "Unknown message type: "+method)
		}
	}
}

// broadcastMessage sends a message to all connected clients except the sender
func (h *UnifiedWSHandler) broadcastMessage(channel string, data json.RawMessage, senderID string) {
	message := WSResponse{
		Success: true,
		Type:    "message",
		Data:    data,
	}

	messageData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}

	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	// In a real implementation, you would only send to connections subscribed to the channel
	for userID, conn := range h.connections {
		// Don't send back to the sender
		if userID == senderID {
			continue
		}

		// Send the message
		err := conn.WriteMessage(websocket.TextMessage, messageData)
		if err != nil {
			log.Printf("Error broadcasting to %s: %v", userID, err)
		}
	}
}

// Helper function to send error responses
func sendErrorResponse(conn *websocket.Conn, errMsg string) {
	response := WSResponse{
		Success: false,
		Error:   errMsg,
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling error response: %v", err)
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, responseData)
	if err != nil {
		log.Printf("Error sending error response: %v", err)
	}
}

// CloseAllConnections closes all active connections (useful for graceful shutdown)
func (h *UnifiedWSHandler) CloseAllConnections() {
	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	for userID, conn := range h.connections {
		log.Printf("Closing connection for participant: %s", userID)
		conn.Close()
	}
}
