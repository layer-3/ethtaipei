package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/centrifugal/centrifuge"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var BrokerAddress string

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
	channelService   *ChannelService
	ledger           *Ledger
	router           *Router
	messageRouter    RouterInterface // For handling message routing between participants
	centrifugeNode   *centrifuge.Node
	blockchainClient *CustodyClientWrapper
)

// getEnv gets an environment variable with a fallback value
// If required is true and the variable is not set, it returns an error
func getEnv(key string, fallback string, required bool) (string, error) {
	value := os.Getenv(key)
	if value == "" {
		if required {
			return "", fmt.Errorf("required environment variable %s is not set", key)
		}
		return fallback, nil
	}
	return value, nil
}

// setupDatabase initializes the database connection and performs migrations
func setupDatabase(dsn string) (*gorm.DB, error) {
	// Open database connection
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Auto migrate the models
	err = db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{})
	if err != nil {
		return nil, err
	}

	return db, nil
}

// setupBlockchainClient initializes the Ethereum client and custody contract wrapper
func setupBlockchainClient() (*ecdsa.PrivateKey, error) {
	privateKeyHex, err := getEnv("BROKER_PRIVATE_KEY", "", true)
	if err != nil {
		return nil, err
	}

	// Remove '0x' prefix if present
	if len(privateKeyHex) >= 2 && privateKeyHex[0:2] == "0x" {
		privateKeyHex = privateKeyHex[2:]
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	infuraURL, err := getEnv("INFURA_URL", "", true)
	if err != nil {
		return nil, err
	}

	client, err := ethclient.Dial(infuraURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum node: %w", err)
	}

	// Get the chain ID
	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Create auth options for transactions
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction signer: %w", err)
	}

	// Set gas price and limit for transactions
	auth.GasPrice = big.NewInt(20000000000) // 20 gwei
	auth.GasLimit = uint64(3000000)

	custodyAddressStr, err := getEnv("CUSTODY_CONTRACT_ADDRESS", "", true)
	if err != nil {
		return nil, err
	}
	custodyAddress := common.HexToAddress(custodyAddressStr)

	// Derive the broker's Ethereum address from the private key
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("error casting public key to ECDSA")
	}

	// Set the global broker address
	BrokerAddress = crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	// Create the custody client wrapper
	custodyClient, err := NewCustodyClientWrapper(client, custodyAddress, auth)
	if err != nil {
		return nil, fmt.Errorf("failed to create custody client: %w", err)
	}

	// Set as the global blockchain client
	blockchainClient = custodyClient

	log.Printf("Blockchain client initialized with address: %s", BrokerAddress)

	return privateKey, nil
}

func main() {
	dsn := "file:broker.db?mode=memory&cache=shared"
	db, err := setupDatabase(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	centrifugeNode, err = centrifuge.New(centrifuge.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// Initialize services
	channelService = NewChannelService(db)
	ledger = NewLedger(db)
	router = NewRouter(centrifugeNode)
	messageRouter = NewRouter(centrifugeNode)

	_, err = setupBlockchainClient()
	if err != nil {
		// Just log a warning and continue, but blockchain interactions will be disabled
		log.Printf("Warning: Failed to initialize blockchain client: %v", err)
		log.Printf("Blockchain operations will be disabled")

	} else {
		log.Printf("Blockchain client successfully initialized and ready")
		log.Printf("Using broker address derived from private key: %s", BrokerAddress)
	}

	centrifugeNode.OnConnect(func(client *centrifuge.Client) {
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
	if err := centrifugeNode.Run(); err != nil {
		log.Fatal(err)
	}

	webhookSecret, err := getEnv("WEBHOOK_SECRET", "", false)
	if err != nil {
		log.Printf("Error getting webhook secret: %v", err)
	}
	if webhookSecret == "" {
		log.Println("WARNING: WEBHOOK_SECRET environment variable not set, using insecure empty secret")
		log.Println("In production environments, you should always set a secure WEBHOOK_SECRET")
	} else {
		log.Println("Webhook secret configured successfully")
	}

	log.Printf("Initializing webhook handler with broker address: %s", BrokerAddress)
	webhookHandler := NewEventHandler(webhookSecret, ledger, channelService, BrokerAddress, blockchainClient)
	http.Handle("/webhook", webhookHandler)
	log.Printf("Webhook handler registered at /webhook endpoint")

	unifiedWSHandler := NewUnifiedWSHandler(centrifugeNode, channelService, ledger, messageRouter)
	http.HandleFunc("/ws", unifiedWSHandler.HandleConnection)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting server, visit http://localhost:8000")
		if err := http.ListenAndServe(":8000", nil); err != nil {
			log.Fatal(err)
		}
	}()

	<-stop
	log.Println("Shutting down...")

	unifiedWSHandler.CloseAllConnections()
	centrifugeNode.Shutdown(context.Background())

	log.Println("Server stopped")
}
