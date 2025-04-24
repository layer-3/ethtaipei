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

// WebSocketHandler defines the methods that must be implemented by a WebSocket handler
type WebSocketHandler interface {
	BroadcastMessage(message any)
}

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
	}
}

// --- Message Structures ---

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

	address, err := HandleAuthenticate(h.signer, conn, message)
	if err != nil {
		log.Printf("Authentication failed: %v", err)
		h.sendErrorResponse(0, "error", conn, err.Error())
		return
	}

	log.Printf("Authentication successful for: %s", address)

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

		var rpcRequest RPCMessage
		if err := json.Unmarshal(message, &rpcRequest); err != nil {
			h.sendErrorResponse(0, "error", conn, "Invalid message format")
			continue
		}

		if rpcRequest.ChannelID != "" {
			handlerErr := forwardMessage(&rpcRequest, address, h)
			if handlerErr != nil {
				log.Printf("Error forwarding message: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to send public message: "+handlerErr.Error())
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
				log.Printf("Error handling Ping: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to process ping: "+handlerErr.Error())
				continue
			}

		case "get_config":
			rpcResponse, handlerErr = HandleGetConfig(&rpcRequest)
			if handlerErr != nil {
				log.Printf("Error handling GetConfig: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to get config: "+handlerErr.Error())
				continue
			}

		case "list_participants":
			rpcResponse, handlerErr = HandleListParticipants(&rpcRequest, h.channelService, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling HandleListOpenParticipants: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to list available channels: "+handlerErr.Error())
				continue
			}

		case "create_virtual_channel":
			rpcResponse, handlerErr = HandleCreateVirtualChannel(&rpcRequest, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling CreateVirtualChannel: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to create virtual channel: "+handlerErr.Error())
				continue
			}

		case "close_virtual_channel":
			rpcResponse, handlerErr = HandleCloseVirtualChannel(&rpcRequest, h.ledger)
			if handlerErr != nil {
				log.Printf("Error handling CloseVirtualChannel: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to close virtual channel: "+handlerErr.Error())
				continue
			}

		case "close_channel":
			rpcResponse, handlerErr = HandleCloseDirectChannel(&rpcRequest, h.ledger, h.signer)
			if handlerErr != nil {
				log.Printf("Error handling CloseDirectChannel: %v", handlerErr)
				h.sendErrorResponse(rpcRequest.Req.RequestID, rpcRequest.Req.Method, conn, "Failed to close direct channel: "+handlerErr.Error())
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

	sendTo, handlerErr := getVCRecipients(fromAddress, rpcRequest.ChannelID, h.ledger)
	if handlerErr != nil {
		log.Printf("Error handling SendMessage: %v", handlerErr)
		return errors.New("Failed to send message: " + handlerErr.Error())
	}

	// No response sent back to sender - broker just acts as a proxy

	// Iterate over all recipients in a virtual channel and send the message
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

// Helper function to send error responses.
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

func (h *UnifiedWSHandler) CloseAllConnections() {
	h.connectionsMu.RLock()
	defer h.connectionsMu.RUnlock()

	for userID, conn := range h.connections {
		log.Printf("Closing connection for participant: %s", userID)
		conn.Close()
	}
}
