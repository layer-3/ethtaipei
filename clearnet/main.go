package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/centrifugal/centrifuge"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// AuthRequest represents an authentication request
type AuthRequest struct {
	PublicKey string `json:"pub_key"`
	Signature string `json:"signature"`
	Message   string `json:"message"`
}

// AuthResponse represents an authentication response
type AuthResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	UserID  string `json:"user_id,omitempty"`
}

// Global services
var (
	channelService *ChannelService
	rpcService     *RPCService
	ledger         *Ledger
)

// setupDatabase initializes the database connection and performs migrations
func setupDatabase(dsn string) (*gorm.DB, error) {
	// Open database connection
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto migrate the models
	err = db.AutoMigrate(&Entry{}, &RPCState{}, &Channel{})
	if err != nil {
		return nil, err
	}

	return db, nil
}

func main() {
	dsn := "file:broker.db?mode=memory&cache=shared"
	db, err := setupDatabase(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize services
	channelService = NewChannelService(db)
	rpcService = NewRPCService(db)
	ledger = NewLedger(db)

	// Initialize Centrifuge node
	node, err := centrifuge.New(centrifuge.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// Set up event handlers
	node.OnConnect(func(client *centrifuge.Client) {
		transportName := client.Transport().Name()
		transportProto := client.Transport().Protocol()
		log.Printf("Client connected via %s (%s)", transportName, transportProto)

		// Allow all channel subscriptions
		client.OnSubscribe(func(e centrifuge.SubscribeEvent, cb centrifuge.SubscribeCallback) {
			log.Printf("Client subscribes to channel %s", e.Channel)
			cb(centrifuge.SubscribeReply{}, nil)
		})

		// Allow publishing to channels
		client.OnPublish(func(e centrifuge.PublishEvent, cb centrifuge.PublishCallback) {
			log.Printf("Client publishes to channel %s: %s", e.Channel, string(e.Data))
			cb(centrifuge.PublishReply{}, nil)
		})

		// Handle disconnects
		client.OnDisconnect(func(e centrifuge.DisconnectEvent) {
			log.Printf("Client disconnected")
		})
	})

	// Run node
	if err := node.Run(); err != nil {
		log.Fatal(err)
	}

	unifiedWSHandler := NewUnifiedWSHandler(node, channelService, rpcService, ledger)
	http.HandleFunc("/ws", unifiedWSHandler.HandleConnection)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start the server in a goroutine
	go func() {
		log.Printf("Starting server, visit http://localhost:8000")
		if err := http.ListenAndServe(":8000", nil); err != nil {
			log.Fatal(err)
		}
	}()

	// Wait for signal
	<-stop
	log.Println("Shutting down...")

	// Perform cleanup
	unifiedWSHandler.CloseAllConnections()
	node.Shutdown(context.Background())

	log.Println("Server stopped")
}
