package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"os/signal"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// RequestMessage represents a request sent to the server.
type RequestMessage struct {
	Req []interface{} `json:"req"`
	Sig string        `json:"sig"`
}

// ResponseMessage represents a generic response from the server.
type ResponseMessage struct {
	Res json.RawMessage `json:"res"`
	Sig string          `json:"sig"`
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
	Participant  string   `json:"participant"`
	TokenAddress string   `json:"tokenAddress"`
	InitialFunds *big.Int `json:"initialFunds,string,omitempty"`
}

// CreateVirtualChannelParams holds parameters for virtual channel creation.
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

// readLoop continuously reads messages from the WebSocket connection and prints them.
func readLoop(participant string, conn *websocket.Conn) {
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[%s] Error reading message: %v", participant, err)
			break
		}
		log.Printf("[%s] Received: %s", participant, inlineJSON(msg))
	}
}

// sendAndReceive sends a request and waits synchronously for a response.
func sendAndReceive(conn *websocket.Conn, reqMsg RequestMessage) (json.RawMessage, error) {
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
func sendMessage(conn *websocket.Conn, requestID int, virtualChannelID, sender, recipient, msgType string) error {
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
	reqMsg := RequestMessage{
		Req: []interface{}{requestID, "SendMessage", []interface{}{sendMsgParams}, uint64(time.Now().Unix())},
		Sig: "dummy-signature-for-testing",
	}
	data, err := json.Marshal(reqMsg)
	if err != nil {
		return err
	}
	log.Printf("[%s] Sending %s message: %s", sender, msgType, inlineJSON(data))
	return conn.WriteMessage(websocket.TextMessage, data)
}

// connectAndAuth connects to the WebSocket server and sends an authentication message.
func connectAndAuth(serverAddr, publicKey string) (*websocket.Conn, error) {
	wsURL := fmt.Sprintf("ws://%s/ws", serverAddr)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error connecting to WebSocket: %v", err)
	}
	timestamp := uint64(time.Now().Unix())
	authMsg := RequestMessage{
		Req: []interface{}{1, "auth", []interface{}{publicKey}, timestamp},
		Sig: "dummy-signature-for-testing",
	}
	authMsgJSON, err := json.Marshal(authMsg)
	if err != nil {
		return nil, fmt.Errorf("error marshaling auth message: %v", err)
	}
	if err = conn.WriteMessage(websocket.TextMessage, authMsgJSON); err != nil {
		return nil, fmt.Errorf("error sending auth message: %v", err)
	}
	_, resp, err := conn.ReadMessage()
	if err != nil {
		return nil, fmt.Errorf("error reading auth response: %v", err)
	}
	var authResp AuthResponse
	if err = json.Unmarshal(resp, &authResp); err != nil {
		return nil, fmt.Errorf("error unmarshaling auth response: %v", err)
	}
	if !authResp.Success {
		return nil, fmt.Errorf("authentication failed: %s", resp)
	}
	log.Printf("[%s] Authentication successful: %s", publicKey, inlineJSON(resp))
	return conn, nil
}

func main() {
	// Parse server address flag.
	serverAddr := flag.String("server", "localhost:8000", "Server address")
	flag.Parse()

	// Define public keys for Participant A and Participant B.
	pubKeyA := "0x1111111111111111111111111111111111111111"
	pubKeyB := "0x2222222222222222222222222222222222222222"
	tokenAddress := "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" // Same token address for both

	// Connect and authenticate both participants.
	connA, err := connectAndAuth(*serverAddr, pubKeyA)
	if err != nil {
		log.Fatalf("Participant A connection error: %v", err)
	}
	defer connA.Close()

	connB, err := connectAndAuth(*serverAddr, pubKeyB)
	if err != nil {
		log.Fatalf("Participant B connection error: %v", err)
	}
	defer connB.Close()

	// Synchronously create direct channel for Participant A.
	channelA := "0xDirectChannelA"
	createChannelAParams := CreateChannelParams{
		ChannelID:    channelA,
		Participant:  pubKeyA,
		TokenAddress: tokenAddress,
		InitialFunds: big.NewInt(1000),
	}
	createChannelAParamsJSON, _ := json.Marshal(createChannelAParams)
	createChannelAMsg := RequestMessage{
		Req: []interface{}{2, "CreateChannel", []interface{}{json.RawMessage(createChannelAParamsJSON)}, uint64(time.Now().Unix())},
		Sig: "dummy-signature-for-testing",
	}
	respA, err := sendAndReceive(connA, createChannelAMsg)
	if err != nil {
		log.Fatalf("Error creating channel A: %v", err)
	}
	log.Printf("[A] CreateChannel response: %s", inlineJSON(respA))

	// Synchronously create direct channel for Participant B.
	channelB := "0xDirectChannelB"
	createChannelBParams := CreateChannelParams{
		ChannelID:    channelB,
		Participant:  pubKeyB,
		TokenAddress: tokenAddress,
		InitialFunds: big.NewInt(500),
	}
	createChannelBParamsJSON, _ := json.Marshal(createChannelBParams)
	createChannelBMsg := RequestMessage{
		Req: []interface{}{3, "CreateChannel", []interface{}{json.RawMessage(createChannelBParamsJSON)}, uint64(time.Now().Unix())},
		Sig: "dummy-signature-for-testing",
	}
	respB, err := sendAndReceive(connB, createChannelBMsg)
	if err != nil {
		log.Fatalf("Error creating channel B: %v", err)
	}
	log.Printf("[B] CreateChannel response: %s", inlineJSON(respB))

	// Synchronously create a virtual channel between the two participants using Participant A.
	createVCParams := CreateVirtualChannelParams{
		ParticipantA: pubKeyA,
		ParticipantB: pubKeyB,
		TokenAddress: tokenAddress,
		AmountA:      big.NewInt(200),
		AmountB:      big.NewInt(300),
		Adjudicator:  "0x0000000000000000000000000000000000000000",
		Challenge:    86400,
		Nonce:        uint64(time.Now().UnixNano()),
	}
	createVCParamsJSON, _ := json.Marshal(createVCParams)
	createVCMsg := RequestMessage{
		Req: []interface{}{4, "CreateVirtualChannel", []interface{}{json.RawMessage(createVCParamsJSON)}, uint64(time.Now().Unix())},
		Sig: "dummy-signature-for-testing",
	}
	respVC, err := sendAndReceive(connA, createVCMsg)
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

	// Launch asynchronous read loops so that each participant prints every message it receives.
	go readLoop("Participant A", connA)
	go readLoop("Participant B", connB)

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
				if err := sendMessage(connA, reqID, virtualChannelID, pubKeyA, pubKeyB, "ping"); err != nil {
					log.Printf("Error sending ping from A: %v", err)
				}
				time.Sleep(500 * time.Millisecond)
				reqID = int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connB, reqID, virtualChannelID, pubKeyB, pubKeyA, "pong"); err != nil {
					log.Printf("Error sending pong from B: %v", err)
				}
			} else {
				// Even round: Participant A sends a pong; Participant B sends a ping.
				reqID := int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connA, reqID, virtualChannelID, pubKeyA, pubKeyB, "pong"); err != nil {
					log.Printf("Error sending pong from A: %v", err)
				}
				time.Sleep(500 * time.Millisecond)
				reqID = int(atomic.AddInt32(&requestID, 1))
				if err := sendMessage(connB, reqID, virtualChannelID, pubKeyB, pubKeyA, "ping"); err != nil {
					log.Printf("Error sending ping from B: %v", err)
				}
			}
			time.Sleep(1 * time.Second)
		}
		close(simDone)
	}()

	// Wait for either the simulation to finish or a 5-second timeout.
	select {
	case <-simDone:
		log.Println("Ping–pong simulation completed successfully!")
		os.Exit(0) // exit immediately on success
	case <-time.After(5 * time.Second):
		log.Println("Test timed out after 5 seconds")
		os.Exit(1) // exit immediately on timeout
	}

	// Wait for an interrupt signal to exit.
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)
	<-interrupt
	log.Println("Exiting...")
}
