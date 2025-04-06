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

// WebSocketHandler defines the methods that must be implemented by a WebSocket handler
type WebSocketHandler interface {
	BroadcastMessage(message interface{})
}

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

// RegularMessage represents any message after authentication.
type RegularMessage struct {
	Req []interface{} `json:"req"` // Format: [requestId, "method", [args], timestamp]
	Sig []string      `json:"sig"`
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
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket unexpected close error: %v", err)
			} else {
				log.Printf("Error reading message: %v", err)
			}
			break
		}

		var regularMsg RegularMessage
		if err := json.Unmarshal(message, &regularMsg); err != nil {
			sendErrorResponse(0, "error", conn, "Invalid message format")
			continue
		}

		if len(regularMsg.Req) < 4 || len(regularMsg.Sig) == 0 {
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

		// Validate the signature for the message
		reqBytes, err := json.Marshal(regularMsg.Req)
		if err != nil {
			log.Printf("Error serializing request for validation: %v", err)
			sendErrorResponse(uint64(requestID), method, conn, "Error validating signature")
			continue
		}

		var rpcResponse = &RPCResponse{}
		var handlerErr error

		switch method {
		case "ping":
			rpcResponse, handlerErr = HandlePing(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling Ping: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to process ping: "+handlerErr.Error())
				continue
			}

		case "GetConfig":
			rpcResponse, handlerErr = HandleGetConfig(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling GetConfig: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to get config: "+handlerErr.Error())
				continue
			}

		case "CreateChannel":
			rpcResponse, handlerErr = HandleCreateChannel(address, &rpcRequest, h.channelService, h.ledger)
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

		case "ListOpenParticipants":
			rpcResponse, handlerErr = HandleListOpenParticipants(&rpcRequest, h.channelService, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling HandleListOpenParticipants: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to list available channels: "+handlerErr.Error())
				continue
			}

		case "CloseVirtualChannel":
			rpcResponse, handlerErr = HandleCloseVirtualChannel(&rpcRequest, h.ledger, h.messageRouter)
			if handlerErr != nil {
				log.Printf("Error handling CloseVirtualChannel: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to close virtual channel: "+handlerErr.Error())
				continue
			}

		case "SendPublicMessage":
			rpcResponse, handlerErr = HandleSendPublicMessage(address, &rpcRequest, h.ledger, h)
			if handlerErr != nil {
				log.Printf("Error handling SendPublicMessage: %v", handlerErr)
				sendErrorResponse(uint64(requestID), method, conn, "Failed to send public message: "+handlerErr.Error())
				continue
			}

		case "SendMessage":
			// Validate the signature
			isValid, err := ValidateSignature(reqBytes, regularMsg.Sig[0], address)
			if err != nil || !isValid {
				log.Printf("Signature validation failed: %v, valid: %v", err, isValid)
				sendErrorResponse(uint64(requestID), method, conn, "Invalid signature")
				continue
			}

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
					Sig: []string{"broker-signature"}, // Standard signature placeholder
				}
				msg, _ := json.Marshal(incomingRPC)

				// Use NextWriter for safer message delivery
				w, err := recipientConn.NextWriter(websocket.TextMessage)
				if err != nil {
					log.Printf("Error getting writer for forwarded message: %v", err)
				} else {
					if _, err := w.Write(msg); err != nil {
						log.Printf("Error writing forwarded message: %v", err)
					}
					w.Close()
				}
			} else {
				log.Printf("Recipient %s not connected, cannot forward message", sendTo)
			}
			continue

		default:
			sendErrorResponse(uint64(requestID), method, conn, "Unsupported method: "+method)
			continue
		}

		// For methods other than SendMessage, send back the RPC response.
		rpcResponse.Sig = []string{"server-signature"}
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

// BroadcastMessage sends a message to all connected clients
// This is done in a non-blocking way to avoid hanging the handler
func (h *UnifiedWSHandler) BroadcastMessage(message interface{}) {
	log.Printf("Broadcasting message: %+v", message)

	// Create a copy of the connections to avoid holding the lock for too long
	h.connectionsMu.RLock()
	connections := make(map[string]*websocket.Conn, len(h.connections))
	for id, conn := range h.connections {
		connections[id] = conn
	}
	numConnections := len(connections)
	h.connectionsMu.RUnlock()

	log.Printf("Number of connected clients: %d", numConnections)

	// Broadcast in a separate goroutine to avoid blocking the handler
	go func() {
		timestamp := uint64(time.Now().Unix())
		requestID := uint64(time.Now().UnixNano())

		// Send the message to each connected client
		for userID, conn := range connections {
			// Launch a separate goroutine for each connection to avoid blocking if one client is slow
			go func(userID string, conn *websocket.Conn) {
				log.Printf("Broadcasting to user: %s", userID)

				// Format the message with the expected wrapper structure
				msgWrapper := map[string]interface{}{
					"channelId": "broadcast",
					"sender":    "broker",
					"data":      message,
				}

				// Create a broadcast message in the format expected by the client
				broadcastResp := RPCResponse{
					Res: RPCMessage{
						RequestID: requestID,
						Method:    "IncomingMessage", // Use the same format as direct messages for consistency
						Params:    []any{msgWrapper},
						Timestamp: timestamp,
					},
					Sig: []string{"broker-signature"}, // Standard signature placeholder
				}

				// Serialize the message
				msgBytes, err := json.Marshal(broadcastResp)
				if err != nil {
					log.Printf("Error marshaling broadcast message for %s: %v", userID, err)
					return
				}

				// Set a very short deadline to avoid blocking
				conn.SetWriteDeadline(time.Now().Add(500 * time.Millisecond))
				defer conn.SetWriteDeadline(time.Time{})

				// Use NextWriter to ensure proper message framing
				w, err := conn.NextWriter(websocket.TextMessage)
				if err != nil {
					log.Printf("Error getting writer for %s: %v", userID, err)
					return
				}

				if _, err := w.Write(msgBytes); err != nil {
					log.Printf("Error writing broadcast to %s: %v", userID, err)
					w.Close()
					return
				}

				if err := w.Close(); err != nil {
					log.Printf("Error closing writer for %s: %v", userID, err)
					return
				}

				log.Printf("Successfully sent broadcast to %s", userID)
			}(userID, conn)
		}

		log.Printf("Broadcast message sent to %d participants", numConnections)
	}()
}

func (h *UnifiedWSHandler) CloseAllConnections() {
	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	for userID, conn := range h.connections {
		log.Printf("Closing connection for participant: %s", userID)
		conn.Close()
	}
}
