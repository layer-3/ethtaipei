package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/centrifugal/centrifuge"
	"github.com/gorilla/websocket"
)

// UnifiedWSHandler manages WebSocket connections with authentication
// and subsequent communication.
type UnifiedWSHandler struct {
	node           *centrifuge.Node
	channelService *ChannelService
	ledger         *Ledger
	messageRouter  RouterInterface
	upgrader       websocket.Upgrader
	connections    map[string]*websocket.Conn
	connectionsMu  sync.RWMutex
}

// NewUnifiedWSHandler creates a new unified WebSocket handler.
func NewUnifiedWSHandler(node *centrifuge.Node, channelService *ChannelService, ledger *Ledger, messageRouter RouterInterface) *UnifiedWSHandler {
	return &UnifiedWSHandler{
		node:           node,
		channelService: channelService,
		ledger:         ledger,
		messageRouter:  messageRouter,
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

// --- Message Structures ---

// AuthMessage represents the first authentication message.
type AuthMessage struct {
	Req []interface{} `json:"req"` // Format: [requestId, "auth", [public_key], timestamp]
	Sig string        `json:"sig"`
}

// RegularMessage represents any message after authentication.
type RegularMessage struct {
	Req []interface{} `json:"req"` // Format: [requestId, "method", [args], timestamp]
	Sig string        `json:"sig"`
}

// RPCWSMessage represents an RPC message sent over websocket.
type RPCWSMessage struct {
	Type string          `json:"type"` // "rpc_request" or "rpc_response"
	Data json.RawMessage `json:"data"` // RPCRequest or RPCResponse
}

// WSResponse represents a response sent back to the client.
type WSResponse struct {
	Success bool            `json:"success"`
	Error   string          `json:"error,omitempty"`
	Type    string          `json:"type,omitempty"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// --- Connection Handling ---

// HandleConnection handles the WebSocket connection lifecycle.
func (h *UnifiedWSHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	// Read first message for authentication.
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Error reading initial message: %v", err)
		return
	}

	address, err := HandleAuthenticate(conn, message)
	if err != nil {
		log.Printf("Authentication failed: %v", err)
		sendErrorResponse(0, "error", conn, err.Error())
		return
	}

	log.Printf("Authentication successful for: %s", address)

	// Send auth success confirmation.
	response := WSResponse{
		Success: true,
		Type:    "auth_success",
		Data:    json.RawMessage(`{"address":"` + address + `"}`),
	}
	responseData, _ := json.Marshal(response)
	if err = conn.WriteMessage(websocket.TextMessage, responseData); err != nil {
		log.Printf("Error sending auth success: %v", err)
		return
	}

	// Store connection.
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

	// Main loop for handling messages.
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		var regularMsg RegularMessage
		if err := json.Unmarshal(message, &regularMsg); err != nil {
			sendErrorResponse(0, "error", conn, "Invalid message format")
			continue
		}

		if len(regularMsg.Req) < 4 || regularMsg.Sig == "" {
			sendErrorResponse(0, "error", conn, "Invalid message format")
			continue
		}

		method, ok := regularMsg.Req[1].(string)
		if !ok || method == "" {
			sendErrorResponse(0, "error", conn, "Missing method in message")
			continue
		}

		requestID, _ := regularMsg.Req[0].(float64)

		// Build RPC request object.
		rpcRequest := RPCRequest{
			Req: RPCMessage{
				Method:    method,
				RequestID: uint64(requestID),
				Params:    regularMsg.Req[2].([]interface{}),
				Timestamp: uint64(time.Now().Unix()),
			},
			Sig: regularMsg.Sig,
		}

		var rpcResponse *RPCResponse
		var handlerErr error

		switch method {
		case "ping":
			rpcResponse, handlerErr = HandlePing(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling Ping: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to process ping: "+handlerErr.Error())
				continue
			}

		// TODO: this will be triggered automatically when we receive an event from Blockchain.
		case "CreateChannel":
			rpcResponse, handlerErr = HandleCreateChannel(&rpcRequest, h.channelService, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling CreateChannel: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to create direct channel: "+handlerErr.Error())
				continue
			}

		case "CreateVirtualChannel":
			rpcResponse, handlerErr = HandleCreateVirtualChannel(nil, &rpcRequest, h.ledger, h.messageRouter)
			if handlerErr != nil {
				log.Printf("Error handling CreateVirtualChannel: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to create virtual channel: "+handlerErr.Error())
				continue
			}

		case "SendMessage":
			// --- NEW: Parse the SendMessageRequest to extract recipient.
			var sendReq SendMessageRequest
			if args, ok := regularMsg.Req[2].([]interface{}); ok && len(args) > 0 {
				argBytes, err := json.Marshal(args[0])
				if err != nil {
					sendErrorResponse(uint64(requestID), method, conn, "Invalid send message parameter format")
					continue
				}
				if err := json.Unmarshal(argBytes, &sendReq); err != nil {
					sendErrorResponse(uint64(requestID), method, conn, "Invalid send message parameter content")
					continue
				}
			} else {
				sendErrorResponse(uint64(requestID), method, conn, "Missing send message parameters")
				continue
			}

			sendTo, handlerErr := HandleSendMessage(address, h.node, &rpcRequest, h.messageRouter, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling SendMessage: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to send message: "+handlerErr.Error())
				continue
			}

			// No response sent back to sender - broker just acts as a proxy

			// --- NEW: Look up the recipient connection and forward the message.
			h.connectionsMu.RLock()
			recipientConn, exists := h.connections[sendTo]
			h.connectionsMu.RUnlock()
			if exists {
				// Package the forwarded message in standard RPC format
				incomingRPC := RPCResponse{
					Res: RPCMessage{
						RequestID: uint64(time.Now().UnixNano()), // Generate a unique request ID
						Method:    "IncomingMessage",
						Params: []any{map[string]interface{}{
							"channelId": sendReq.ChannelID,
							"sender":    address,
							"data":      sendReq.Data,
						}},
						Timestamp: uint64(time.Now().Unix()),
					},
					Sig: "broker-signature", // Standard signature placeholder
				}
				msg, _ := json.Marshal(incomingRPC)
				recipientConn.WriteMessage(websocket.TextMessage, msg)
			} else {
				log.Printf("Recipient %s not connected, cannot forward message", sendTo)
			}
			continue

		default:
			sendErrorResponse(uint64(requestID), method, conn, "Unsupported method: "+method)
			continue
		}

		// For methods other than SendMessage, send back the RPC response.
		rpcResponse.Sig = "server-signature"
		wsResponseData, _ := json.Marshal(rpcResponse)
		conn.WriteMessage(websocket.TextMessage, wsResponseData)
	}
}

// Helper function to send error responses.
func sendErrorResponse(requestID uint64, method string, conn *websocket.Conn, errMsg string) {
	response := CreateResponse(requestID, method, []any{map[string]interface{}{
		"error": errMsg,
	}}, time.Now())
	responseData, err := json.Marshal(response)
	if err != nil {
		log.Printf("Error marshaling error response: %v", err)
		return
	}
	if err = conn.WriteMessage(websocket.TextMessage, responseData); err != nil {
		log.Printf("Error sending error response: %v", err)
	}
}

func (h *UnifiedWSHandler) CloseAllConnections() {
	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	for userID, conn := range h.connections {
		log.Printf("Closing connection for participant: %s", userID)
		conn.Close()
	}
}
