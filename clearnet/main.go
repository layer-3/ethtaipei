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
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var BrokerAddress string

// AuthRequest represents an authentication request.
type AuthRequest struct {
	PublicKey string `json:"pub_key"`
	Signature string `json:"signature"`
	Message   string `json:"message"`
}

// AuthResponse represents an authentication response.
type AuthResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	UserID  string `json:"user_id,omitempty"`
}

// Global services.
var (
	channelService *ChannelService
	ledger         *Ledger
	centrifugeNode *centrifuge.Node
)

// setupDatabase initializes the database connection and performs migrations.
func setupDatabase(dsn string) (*gorm.DB, error) {
	var db *gorm.DB
	var err error

	// Determine which database driver to use based on DSN prefix
	if dsn == "" {
		dsn = "file:clearnet.db?cache=shared"
		log.Println("Using SQLite database with default connection string")
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	} else if len(dsn) >= 4 && dsn[:4] == "file" || len(dsn) >= 6 && dsn[:6] == "sqlite" {
		log.Println("Using SQLite database")
		db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	} else {
		log.Println("Using PostgreSQL database")
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}

	if err != nil {
		return nil, err
	}

	// Auto-migrate the models.
	log.Println("Running database migrations...")
	if err := db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{}); err != nil {
		return nil, err
	}
	log.Println("Database migrations completed successfully")
	return db, nil
}

// setupBlockchainClient initializes the Ethereum client and custody contract wrapper.
func setupBlockchainClient(privateKeyHex, infuraURL, custodyAddressStr, networkID string) (*CustodyClientWrapper, error) {
	// Remove '0x' prefix if present.
	if len(privateKeyHex) >= 2 && privateKeyHex[:2] == "0x" {
		privateKeyHex = privateKeyHex[2:]
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	custodyAddress := common.HexToAddress(custodyAddressStr)
	client, err := ethclient.Dial(infuraURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum node: %w", err)
	}

	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to get chain ID: %w", err)
	}

	// Create auth options for transactions.
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction signer: %w", err)
	}
	auth.GasPrice = big.NewInt(30000000000) // 20 gwei.
	auth.GasLimit = uint64(3000000)

	// Derive broker's Ethereum address.
	publicKeyECDSA, ok := privateKey.Public().(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("error casting public key to ECDSA")
	}
	BrokerAddress = crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	custodyClient, err := NewCustodyClientWrapper(client, custodyAddress, auth, networkID, privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create custody client: %w", err)
	}

	log.Printf("Blockchain client initialized with address: %s", BrokerAddress)

	return custodyClient, nil
}

// startHTTPServer starts the HTTP server in a separate goroutine.
func startHTTPServer() {
	go func() {
		log.Printf("Starting server, visit http://localhost:8000")
		if err := http.ListenAndServe(":8000", nil); err != nil {
			log.Fatal(err)
		}
	}()
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	// Get database URL and driver from environment variables
	dbURL := os.Getenv("DATABASE_URL")
	dbDriver := os.Getenv("DATABASE_DRIVER")

	// Set default connection string based on driver
	if dbURL == "" {
		switch dbDriver {
		case "postgres":
			dbURL = "postgres://postgres:postgres@localhost:5432/clearnet?sslmode=disable"
		case "sqlite", "":
			dbURL = "file:clearnet.db?cache=shared"
		}
	}

	// Setup database
	db, err := setupDatabase(dbURL)
	if err != nil {
		log.Fatalf("Failed to setup database: %v", err)
	}

	// Initialize Centrifuge node.
	centrifugeNode, err = centrifuge.New(centrifuge.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// Initialize global services.
	channelService = NewChannelService(db)
	ledger = NewLedger(db)

	// Retrieve the private key.
	privateKeyHex := os.Getenv("BROKER_PRIVATE_KEY")
	if privateKeyHex == "" {
		log.Println("BROKER_PRIVATE_KEY environment variable is required")
	}
	log.Printf("Using broker address derived from private key: %s", BrokerAddress)

	// Initialize blockchain clients
	clients, err := initBlockchainClients(privateKeyHex)
	if err != nil {
		log.Fatalf("Failed to initialize blockchain clients: %v", err)
	}

	// Create multi-network custody wrapper with Polygon as default
	multiNetworkCustody := NewMultiNetworkCustodyWrapper(clients, "137")
	if multiNetworkCustody.GetDefaultClient() == nil {
		log.Fatal("Polygon client (chain ID 137) is required but not initialized")
	}

	// Start listeners for all networks
	multiNetworkCustody.ListenAllEvents(context.Background())

	// Start the Centrifuge node.
	if err := centrifugeNode.Run(); err != nil {
		log.Fatal(err)
	}

	unifiedWSHandler := NewUnifiedWSHandler(centrifugeNode, channelService, ledger, multiNetworkCustody.GetDefaultClient())
	http.HandleFunc("/ws", unifiedWSHandler.HandleConnection)

	// Start the HTTP server.
	startHTTPServer()

	// Wait for shutdown signal.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down...")
	unifiedWSHandler.CloseAllConnections()
	centrifugeNode.Shutdown(context.Background())
	log.Println("Server stopped")
}

// initBlockchainClients initializes blockchain clients based on environment variables
func initBlockchainClients(privateKeyHex string) (map[string]*CustodyClientWrapper, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	clients := make(map[string]*CustodyClientWrapper)

	for name, network := range config.Networks {
		client, err := setupBlockchainClient(privateKeyHex, network.InfuraURL, network.CustodyAddress, network.ChainID)
		if err != nil {
			log.Printf("Warning: Failed to initialize %s blockchain client: %v", name, err)
			continue
		}

		clients[network.ChainID] = client
	}

	return clients, nil
}
