package main

import (
	"bytes"
	"crypto/ecdsa"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gorilla/websocket"
)

// RequestMessage represents a request sent to the server.
type RequestMessage struct {
	Req []interface{} `json:"req"`
	Sig []string      `json:"sig"`
}

// ResponseMessage represents a generic response from the server.
type ResponseMessage struct {
	Res json.RawMessage `json:"res"`
	Sig []string        `json:"sig"`
}

// AuthResponse is used to parse the authentication response.
type AuthResponse struct {
	Success bool            `json:"success"`
	Type    string          `json:"type"`
	Data    json.RawMessage `json:"data"`
}

// CreateChannelParams holds parameters for direct channel creation.
type CreateChannelParams struct {
	ChannelID    string   `json:"channelId"`
	TokenAddress string   `json:"token_address"`
	Amount       *big.Int `json:"amount,string,omitempty"`
	NetworkID    string   `json:"network_id,omitempty"`
}

// CreateVirtualChannelParams holds parameters for virtual channel creation.
type CreateVirtualChannelParams struct {
	ParticipantA string   `json:"participantA"`
	ParticipantB string   `json:"participantB"`
	TokenAddress string   `json:"token_address"`
	AmountA      *big.Int `json:"amountA,string"`
	AmountB      *big.Int `json:"amountB,string"`
	Adjudicator  string   `json:"adjudicator,omitempty"`
	Challenge    uint64   `json:"challenge,omitempty"`
	Nonce        uint64   `json:"nonce,omitempty"`
}

// ChannelAvailabilityResponse represents a participant's availability for virtual channels
type ChannelAvailabilityResponse struct {
	Address string `json:"address"`
	Amount  int64  `json:"amount"`
}

// mustMarshal is a helper that marshals data or logs a fatal error.
func mustMarshal(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}
	return data
}

// inlineJSON compacts a JSON byte slice into a single-line string.
func inlineJSON(data []byte) string {
	var buf bytes.Buffer
	if err := json.Compact(&buf, data); err != nil {
		return string(data)
	}
	return buf.String()
}

// signMessage signs a request message with the provided private key.
func signMessage(requestData []byte, privateKey *ecdsa.PrivateKey) (string, error) {
	// Use the nitrolite.Sign function to sign the data
	signature, err := nitrolite.Sign(requestData, privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign data: %w", err)
	}

	// Convert the signature back to bytes manually
	signatureBytes := make([]byte, 65)
	copy(signatureBytes[:32], signature.R[:])
	copy(signatureBytes[32:64], signature.S[:])
	signatureBytes[64] = signature.V

	// Convert the signature to a hex string
	signatureHex := hexutil.Encode(signatureBytes)

	return signatureHex, nil
}

// getPrivateKeyFromString creates an ECDSA private key from a hex string.
func getPrivateKeyFromString(hexKey string) (*ecdsa.PrivateKey, error) {
	if len(hexKey) < 2 {
		return nil, fmt.Errorf("invalid key length")
	}

	// Remove 0x prefix if present
	if hexKey[:2] == "0x" {
		hexKey = hexKey[2:]
	}

	// Parse the private key
	privateKey, err := crypto.HexToECDSA(hexKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return privateKey, nil
}

// getAddressFromPrivateKey derives the Ethereum address from a private key.
func getAddressFromPrivateKey(privateKey *ecdsa.PrivateKey) string {
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("Failed to get public key")
	}

	address := crypto.PubkeyToAddress(*publicKeyECDSA)
	return address.Hex()
}

// readLoop continuously reads messages from the WebSocket connection and prints them.
func readLoop(participant string, conn *websocket.Conn) {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[%s] Error reading message: %v", participant, err)
			break
		}

		// Parse the message to identify the message type
		var parsed map[string]interface{}
		if err := json.Unmarshal(msg, &parsed); err != nil {
			log.Printf("[%s] Received (unparseable): %s", participant, inlineJSON(msg))
			continue
		}

		// Check if this is a public message
		if res, ok := parsed["res"].([]interface{}); ok && len(res) > 1 {
			method, isString := res[1].(string)
			if isString && method == "IncomingMessage" {
				if params, ok := res[2].([]interface{}); ok && len(params) > 0 {
					if msgData, ok := params[0].(map[string]interface{}); ok {
						if innerData, ok := msgData["data"].(map[string]interface{}); ok {
							if msgType, ok := innerData["type"].(string); ok && msgType == "public_message" {
								// This is a public message
								sender := "unknown"
								if s, ok := innerData["senderAddress"].(string); ok {
									sender = s
								}

								content := ""
								if c, ok := innerData["content"].(string); ok {
									content = c
								}

								var balance int64 = 0
								if b, ok := innerData["senderBalance"].(float64); ok {
									balance = int64(b)
								}

								log.Printf("[%s] *** PUBLIC MESSAGE from %s (balance: %d) ***: %s",
									participant, sender, balance, content)
							}
						}
					}
				}
			}
		}

		log.Printf("[%s] Received: %s", participant, inlineJSON(msg))
	}
}

// sendAndReceive sends a request and waits synchronously for a response.
func sendAndReceive(conn *websocket.Conn, reqData []interface{}, privateKey *ecdsa.PrivateKey) (json.RawMessage, error) {
	// Marshal request data for signing
	reqDataJSON, err := json.Marshal(reqData)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request data: %v", err)
	}

	// Sign the request data
	signature, err := signMessage(reqDataJSON, privateKey)
	if err != nil {
		return nil, fmt.Errorf("error signing request message: %v", err)
	}

	// Create the full message with signature
	reqMsg := RequestMessage{
		Req: reqData,
		Sig: []string{signature},
	}

	// Marshal the full message
	data, err := json.Marshal(reqMsg)
	if err != nil {
		return nil, err
	}

	log.Printf("Sending request: %s", inlineJSON(data))
	if err = conn.WriteMessage(websocket.TextMessage, data); err != nil {
		return nil, err
	}

	_, resp, err := conn.ReadMessage()
	if err != nil {
		return nil, err
	}

	log.Printf("Received response: %s", inlineJSON(resp))
	return resp, nil
}

// sendMessage sends a ping or pong message over a virtual channel.
func sendMessage(conn *websocket.Conn, requestID int, virtualChannelID, sender, recipient, msgType string, privateKey *ecdsa.PrivateKey) error {
	var content string
	if msgType == "ping" {
		content = fmt.Sprintf("ping from %s to %s", sender, recipient)
	} else {
		content = fmt.Sprintf("pong from %s to %s", sender, recipient)
	}

	messageContent := map[string]interface{}{
		"type":      msgType,
		"content":   content,
		"timestamp": time.Now().UnixNano(),
	}

	sendMsgParams := map[string]interface{}{
		"channelId": virtualChannelID,
		"recipient": recipient,
		"data":      messageContent,
	}

	// Create the request data
	reqData := []interface{}{requestID, "SendMessage", []interface{}{sendMsgParams}, uint64(time.Now().Unix())}

	// Marshal request data for signing
	reqDataJSON, err := json.Marshal(reqData)
	if err != nil {
		return fmt.Errorf("error marshaling request data: %v", err)
	}

	// Sign the request data
	signature, err := signMessage(reqDataJSON, privateKey)
	if err != nil {
		return fmt.Errorf("error signing message: %v", err)
	}

	// Create the full message with signature
	reqMsg := RequestMessage{
		Req: reqData,
		Sig: []string{signature},
	}

	// Marshal the full message
	data, err := json.Marshal(reqMsg)
	if err != nil {
		return err
	}

	log.Printf("[%s] Sending %s message: %s", sender, msgType, inlineJSON(data))
	return conn.WriteMessage(websocket.TextMessage, data)
}

// connectAndAuth connects to the WebSocket server and sends an authentication message.
func connectAndAuth(serverAddr, publicKey string, privateKey *ecdsa.PrivateKey) (*websocket.Conn, error) {
	wsURL := fmt.Sprintf("ws://%s/ws", serverAddr)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error connecting to WebSocket: %v", err)
	}

	// Create authentication request
	timestamp := uint64(time.Now().Unix())
	reqData := []interface{}{1, "auth", []interface{}{publicKey}, timestamp}

	// Marshal request data for signing
	reqDataJSON, err := json.Marshal(reqData)
	if err != nil {
		return nil, fmt.Errorf("error marshaling auth request data: %v", err)
	}

	// Sign the request data
	signature, err := signMessage(reqDataJSON, privateKey)
	if err != nil {
		return nil, fmt.Errorf("error signing auth message: %v", err)
	}

	// Create the full authentication message
	authMsg := RequestMessage{
		Req: reqData,
		Sig: []string{signature},
	}

	// Marshal the full message
	authMsgJSON, err := json.Marshal(authMsg)
	if err != nil {
		return nil, fmt.Errorf("error marshaling auth message: %v", err)
	}

	// Send the authentication message
	if err = conn.WriteMessage(websocket.TextMessage, authMsgJSON); err != nil {
		return nil, fmt.Errorf("error sending auth message: %v", err)
	}

	// Read the response
	_, resp, err := conn.ReadMessage()
	if err != nil {
		return nil, fmt.Errorf("error reading auth response: %v", err)
	}

	// Parse the response
	var authResp AuthResponse
	if err = json.Unmarshal(resp, &authResp); err != nil {
		return nil, fmt.Errorf("error unmarshaling auth response: %v", err)
	}

	// Check if authentication was successful
	if !authResp.Success {
		return nil, fmt.Errorf("authentication failed: %s", resp)
	}

	log.Printf("[%s] Authentication successful: %s", publicKey, inlineJSON(resp))
	return conn, nil
}

func main() {
	// Parse server address flag and private keys
	serverAddr := flag.String("server", "localhost:8000", "Server address")
	privKeyAHex := flag.String("privKeyA", "", "Private key for participant A (hex)")
	privKeyBHex := flag.String("privKeyB", "", "Private key for participant B (hex)")
	networkID := flag.String("network", "mainnet", "Network ID to use (mainnet, testnet, etc.)")
	flag.Parse()
	
	// Use fixed private keys for consistent testing if not specified
	if *privKeyAHex == "" {
		*privKeyAHex = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
		log.Printf("Using default private key for A: %s", *privKeyAHex)
	}

	if *privKeyBHex == "" {
		*privKeyBHex = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
		log.Printf("Using default private key for B: %s", *privKeyBHex)
	}
	
	log.Printf("Using network: %s", *networkID)

	// Parse the private keys
	privateKeyA, err := getPrivateKeyFromString(*privKeyAHex)
	if err != nil {
		log.Fatalf("Failed to parse private key A: %v", err)
	}

	privateKeyB, err := getPrivateKeyFromString(*privKeyBHex)
	if err != nil {
		log.Fatalf("Failed to parse private key B: %v", err)
	}

	// Derive public addresses from private keys
	addressA := getAddressFromPrivateKey(privateKeyA)
	addressB := getAddressFromPrivateKey(privateKeyB)

	log.Printf("Participant A address: %s", addressA)
	log.Printf("Participant B address: %s", addressB)

	tokenAddress := "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" // Same token address for both

	// Connect and authenticate both participants.
	connA, err := connectAndAuth(*serverAddr, addressA, privateKeyA)
	if err != nil {
		log.Fatalf("Participant A connection error: %v", err)
	}
	defer connA.Close()

	connB, err := connectAndAuth(*serverAddr, addressB, privateKeyB)
	if err != nil {
		log.Fatalf("Participant B connection error: %v", err)
	}
	defer connB.Close()

	// Synchronously create direct channel for Participant A with deterministic ID based on address
	channelA := "0xDirectChannel_" + addressA
	createChannelAParams := CreateChannelParams{
		ChannelID:    channelA,
		TokenAddress: tokenAddress,
		Amount:       big.NewInt(1000),
		NetworkID:    *networkID,
	}
	createChannelAParamsJSON, _ := json.Marshal(createChannelAParams)
	createChannelAReqData := []interface{}{2, "CreateChannel", []interface{}{json.RawMessage(createChannelAParamsJSON)}, uint64(time.Now().Unix())}

	respA, err := sendAndReceive(connA, createChannelAReqData, privateKeyA)
	if err != nil {
		log.Fatalf("Error creating channel A: %v", err)
	}
	log.Printf("[A] CreateChannel response: %s", inlineJSON(respA))

	// Synchronously create direct channel for Participant B with deterministic ID based on address
	channelB := "0xDirectChannel_" + addressB
	createChannelBParams := CreateChannelParams{
		ChannelID:    channelB,
		TokenAddress: tokenAddress,
		Amount:       big.NewInt(500),
		NetworkID:    *networkID,
	}
	createChannelBParamsJSON, _ := json.Marshal(createChannelBParams)
	createChannelBReqData := []interface{}{3, "CreateChannel", []interface{}{json.RawMessage(createChannelBParamsJSON)}, uint64(time.Now().Unix())}

	respB, err := sendAndReceive(connB, createChannelBReqData, privateKeyB)
	if err != nil {
		log.Fatalf("Error creating channel B: %v", err)
	}
	log.Printf("[B] CreateChannel response: %s", inlineJSON(respB))

	log.Printf("Participant A address: %s", addressA)
	log.Printf("Participant B address: %s", addressB)

	// First call ListOpenParticipants before virtual channel creation
	log.Printf("Requesting list of available channels BEFORE virtual channel creation...")
	listChannelsParamsBeforeVC := map[string]string{
		"token_address": tokenAddress,
	}
	listChannelsParamsJSONBeforeVC, _ := json.Marshal(listChannelsParamsBeforeVC)
	listChannelsMsgBeforeVCReqData := []interface{}{10, "ListOpenParticipants", []interface{}{json.RawMessage(listChannelsParamsJSONBeforeVC)}, uint64(time.Now().Unix())}

	respListBeforeVC, err := sendAndReceive(connA, listChannelsMsgBeforeVCReqData, privateKeyA)
	if err != nil {
		log.Fatalf("Error listing available channels before VC: %v", err)
	}
	log.Printf("Available channels BEFORE virtual channel: %s", inlineJSON(respListBeforeVC))

	// Serialize the virtual channel data for signing by both parties
	// virtualChannelJSON, _ := json.Marshal(virtualChannel)

	// // Sign the virtual channel data with both private keys
	// signatureA, err := signMessage(virtualChannelJSON, privateKeyA)
	// if err != nil {
	// 	log.Fatalf("Error signing virtual channel by A: %v", err)
	// }

	// signatureB, err := signMessage(virtualChannelJSON, privateKeyB)
	// if err != nil {
	// 	log.Fatalf("Error signing virtual channel by B: %v", err)
	// }

	// Create the complete request with both signatures
	createVCParams := CreateVirtualChannelParams{
		ParticipantA: addressA,
		ParticipantB: addressB,
		TokenAddress: tokenAddress,
		AmountA:      big.NewInt(200),
		AmountB:      big.NewInt(300),
		Adjudicator:  "0x0000000000000000000000000000000000000000",
		Challenge:    86400,
		Nonce:        uint64(time.Now().UnixNano()),
	}
	createVCParamsJSON, _ := json.Marshal(createVCParams)
	createVCReqData := []interface{}{4, "CreateVirtualChannel", []interface{}{json.RawMessage(createVCParamsJSON)}, uint64(time.Now().Unix())}

	respVC, err := sendAndReceive(connA, createVCReqData, privateKeyA)
	if err != nil {
		log.Fatalf("Error creating virtual channel: %v", err)
	}
	log.Printf("[A] CreateVirtualChannel response: %s", inlineJSON(respVC))

	// Extract the virtual channel ID from the response.
	var rpcResp []interface{}
	var respMsg ResponseMessage
	if err := json.Unmarshal(respVC, &respMsg); err != nil {
		log.Fatalf("Error unmarshaling virtual channel response: %v", err)
	}
	if err := json.Unmarshal(respMsg.Res, &rpcResp); err != nil {
		log.Fatalf("Error unmarshaling rpc response: %v", err)
	}
	if len(rpcResp) < 3 {
		log.Fatalf("Unexpected virtual channel response format")
	}
	dataArray, ok := rpcResp[2].([]interface{})
	if !ok || len(dataArray) < 1 {
		log.Fatalf("Unexpected virtual channel data format")
	}
	channelData, ok := dataArray[0].(map[string]interface{})
	if !ok {
		log.Fatalf("Unexpected channel data format")
	}
	virtualChannelID, ok := channelData["channelId"].(string)
	if !ok {
		log.Fatalf("Virtual channel ID not found in response")
	}
	log.Printf("Extracted virtual channel ID: %s", virtualChannelID)

	// Call HandleListOpenParticipants after virtual channel creation
	log.Printf("Requesting list of available channels AFTER virtual channel creation...")
	listChannelsParams := map[string]string{
		"token_address": tokenAddress,
	}
	listChannelsParamsJSON, _ := json.Marshal(listChannelsParams)
	listChannelsReqData := []interface{}{11, "ListOpenParticipants", []interface{}{json.RawMessage(listChannelsParamsJSON)}, uint64(time.Now().Unix())}

	respList, err := sendAndReceive(connA, listChannelsReqData, privateKeyA)
	if err != nil {
		log.Fatalf("Error listing available channels: %v", err)
	}
	log.Printf("Available channels AFTER virtual channel: %s", inlineJSON(respList))

	// Parse and print the list of available channels
	var listRespMsg ResponseMessage
	if err := json.Unmarshal(respList, &listRespMsg); err != nil {
		log.Fatalf("Error unmarshaling list channels response: %v", err)
	}

	var listRpcResp []interface{}
	if err := json.Unmarshal(listRespMsg.Res, &listRpcResp); err != nil {
		log.Fatalf("Error unmarshaling list channels RPC response: %v", err)
	}

	if len(listRpcResp) < 3 {
		log.Fatalf("Unexpected list channels response format")
	}

	channelsArray, ok := listRpcResp[2].([]interface{})
	if !ok || len(channelsArray) < 1 {
		log.Printf("No available channels found or unexpected format")
	} else {
		log.Printf("=== Available Channels for Virtual Channels ===")
		for _, ch := range channelsArray {
			if channelData, ok := ch.(map[string]interface{}); ok {
				address, _ := channelData["address"].(string)
				amount, _ := channelData["amount"].(float64)
				log.Printf("Address: %s, Available Amount: %.0f", address, amount)
			}
		}
		log.Printf("=============================================")
	}

	// Launch asynchronous read loops so that each participant prints every message it receives.
	// Use two separate WaitGroups for the read loops
	readLoopWG := sync.WaitGroup{}
	readLoopWG.Add(2)

	//readLoopDone := make(chan struct{})

	go func() {
		defer readLoopWG.Done()
		readLoop("Participant A", connA)
		log.Printf("[Participant A] Read loop exited")
	}()

	go func() {
		defer readLoopWG.Done()
		readLoop("Participant B", connB)
		log.Printf("[Participant B] Read loop exited")
	}()

	// Wait a moment for the read loops to start.
	time.Sleep(1 * time.Second)

	// Start the ping–pong simulation in a goroutine.
	simDone := make(chan struct{})
	go func() {
		numRounds := 3
		var requestID int32 = 5
		for round := 1; round <= numRounds; round++ {
			log.Printf("=== Round %d ===", round)
			if round%2 == 1 {
				// Odd round: Participant A sends a ping; Participant B replies with a pong.
				reqID := int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connA, reqID, virtualChannelID, addressA, addressB, "ping", privateKeyA); err != nil {
					log.Printf("Error sending ping from A: %v", err)
				}
				time.Sleep(500 * time.Millisecond)
				reqID = int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connB, reqID, virtualChannelID, addressB, addressA, "pong", privateKeyB); err != nil {
					log.Printf("Error sending pong from B: %v", err)
				}
			} else {
				// Even round: Participant A sends a pong; Participant B sends a ping.
				reqID := int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connA, reqID, virtualChannelID, addressA, addressB, "pong", privateKeyA); err != nil {
					log.Printf("Error sending pong from A: %v", err)
				}
				time.Sleep(500 * time.Millisecond)
				reqID = int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connB, reqID, virtualChannelID, addressB, addressA, "ping", privateKeyB); err != nil {
					log.Printf("Error sending ping from B: %v", err)
				}
			}
			time.Sleep(1 * time.Second)
		}
		// After ping-pong is done, close the virtual channel
		log.Println("Ping-pong completed. Now closing the virtual channel...")

		// // Test public messaging functionality
		// log.Println("Testing public message broadcasting...")

		// // Send only one public message to keep things simple
		// publicMsgParams := map[string]string{
		// 	"message": "Hello everyone! This is a public broadcast test message.",
		// }
		// publicMsgParamsJSON, _ := json.Marshal(publicMsgParams)
		// publicMsgReqData := []interface{}{14, "SendPublicMessage", []interface{}{json.RawMessage(publicMsgParamsJSON)}, uint64(time.Now().Unix())}

		// log.Printf("Sending public message...")
		// respPublicMsg, err := sendAndReceive(connA, publicMsgReqData, privateKeyA)
		// if err != nil {
		// 	log.Printf("Error sending public message: %v", err)
		// } else {
		// 	log.Printf("SendPublicMessage response: %s", inlineJSON(respPublicMsg))
		// }

		// // Wait a moment to allow broadcasts to complete
		// log.Printf("Waiting for broadcast to complete...")
		// time.Sleep(2 * time.Second) // Extended wait time to ensure broadcasts complete

		// Create allocation parameters for closing the channel
		// In a real scenario, these values would be negotiated off-chain between participants
		// Create a simple map structure for the request
		closeChannelParams := map[string]interface{}{
			"channelId":     virtualChannelID,
			"token_address": tokenAddress,
			"allocations": []map[string]interface{}{
				{
					"participant": addressA,
					"amount":      "250", // Participant A gets more than initial 200
				},
				{
					"participant": addressB,
					"amount":      "250", // Participant B gets less than initial 300
				},
			},
		}

		closeChannelParamsJSON, _ := json.Marshal(closeChannelParams)
		closeChannelReqData := []interface{}{12, "CloseVirtualChannel", []interface{}{json.RawMessage(closeChannelParamsJSON)}, uint64(time.Now().Unix())}

		respClose, err := sendAndReceive(connA, closeChannelReqData, privateKeyA)
		if err != nil {
			log.Fatalf("Error closing virtual channel: %v", err)
		}

		log.Printf("CloseVirtualChannel response: %s", inlineJSON(respClose))

		// After closing, check balances in the direct channels
		log.Printf("Checking available channels after closing...")
		listChannelsParamsAfterClose := map[string]string{
			"token_address": tokenAddress,
		}
		listChannelsParamsJSONAfterClose, _ := json.Marshal(listChannelsParamsAfterClose)
		listChannelsMsgAfterCloseReqData := []interface{}{13, "ListOpenParticipants", []interface{}{json.RawMessage(listChannelsParamsJSONAfterClose)}, uint64(time.Now().Unix())}

		respListAfterClose, err := sendAndReceive(connA, listChannelsMsgAfterCloseReqData, privateKeyA)
		if err != nil {
			log.Fatalf("Error listing channels after close: %v", err)
		}

		log.Printf("Available channels AFTER closing: %s", inlineJSON(respListAfterClose))

		log.Println("Test sequence completed successfully!")
		close(simDone)
	}()

	// Start a background goroutine to keep connections alive
	keepaliveStop := make(chan struct{})
	keepaliveWG := sync.WaitGroup{}
	keepaliveWG.Add(1)
	go func() {
		defer keepaliveWG.Done()
		ticker := time.NewTicker(5 * time.Second) // Shorter interval for more reliable keepalive
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// Send a ping to both connections to keep them alive
				pingAReqData := []interface{}{999, "ping", []interface{}{}, uint64(time.Now().Unix())}
				pingBReqData := []interface{}{998, "ping", []interface{}{}, uint64(time.Now().Unix())}

				// Sign the pings
				pingADataJSON, _ := json.Marshal(pingAReqData)
				pingBDataJSON, _ := json.Marshal(pingBReqData)

				signatureA, err := signMessage(pingADataJSON, privateKeyA)
				if err != nil {
					log.Printf("Error signing keepalive ping A: %v", err)
					continue
				}

				signatureB, err := signMessage(pingBDataJSON, privateKeyB)
				if err != nil {
					log.Printf("Error signing keepalive ping B: %v", err)
					continue
				}

				pingA := RequestMessage{
					Req: pingAReqData,
					Sig: []string{signatureA},
				}
				pingB := RequestMessage{
					Req: pingBReqData,
					Sig: []string{signatureB},
				}

				pingDataA, _ := json.Marshal(pingA)
				pingDataB, _ := json.Marshal(pingB)

				// Ignore errors, just try to keep the connection alive
				if err := connA.WriteMessage(websocket.TextMessage, pingDataA); err != nil {
					log.Printf("Error sending keepalive to A: %v", err)
				}
				if err := connB.WriteMessage(websocket.TextMessage, pingDataB); err != nil {
					log.Printf("Error sending keepalive to B: %v", err)
				} else {
					log.Println("Sent keepalive pings")
				}
			case <-keepaliveStop:
				return
			}
		}
	}()

	// Clean up function
	cleanup := func() {
		log.Println("Cleaning up resources...")

		// Stop the keepalive goroutine
		close(keepaliveStop)
		keepaliveWG.Wait()

		// Send a proper close frame to both WebSockets
		wsCloseMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Test complete")
		if err := connA.WriteControl(websocket.CloseMessage, wsCloseMsg, time.Now().Add(time.Second)); err != nil {
			log.Printf("Error sending close message to A: %v", err)
		}
		if err := connB.WriteControl(websocket.CloseMessage, wsCloseMsg, time.Now().Add(time.Second)); err != nil {
			log.Printf("Error sending close message to B: %v", err)
		}

		// Give a moment for close frames to be sent
		time.Sleep(100 * time.Millisecond)

		// Close the connections
		connA.Close()
		connB.Close()
		log.Println("Connections closed gracefully")
	}

	// Wait for either the simulation to finish or a timeout.
	select {
	case <-simDone:
		log.Println("Test sequence completed successfully!")

		// Wait a bit more to ensure all public messages are received and displayed
		log.Println("Waiting for a moment to allow all messages to be processed...")
		time.Sleep(2 * time.Second)

		// Clean up resources
		cleanup()

		// Exit successfully
		log.Println("Exiting with success")
		os.Exit(0)

	case <-time.After(15 * time.Second): // Shorter timeout for faster feedback
		log.Println("Test timed out - this may be expected if broadcasts took longer than anticipated")

		// Clean up resources even on timeout
		cleanup()

		// Exit with error code
		log.Println("Exiting with timeout")
		os.Exit(1)
	}

	// Set up signal handling for graceful shutdown
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)
	<-interrupt

	// Clean up resources on interrupt
	cleanup()
	log.Println("Exiting on interrupt signal")
}
