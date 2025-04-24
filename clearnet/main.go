package main

import (
	"context"
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
func setupBlockchainClient(signer *Signer, infuraURL, custodyAddressStr, networkID string) (*CustodyClientWrapper, error) {
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
	auth, err := bind.NewKeyedTransactorWithChainID(signer.GetPrivateKey(), chainID)
	if err != nil {
		return nil, fmt.Errorf("failed to create transaction signer: %w", err)
	}
	auth.GasPrice = big.NewInt(30000000000) // 20 gwei.
	auth.GasLimit = uint64(3000000)

	publicKey := signer.GetPublicKey()

	// Derive broker's Ethereum address.
	BrokerAddress := crypto.PubkeyToAddress(*publicKey).Hex()

	custodyClient, err := NewCustodyClientWrapper(client, custodyAddress, auth, networkID, signer)
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

	// Retrieve the private key.
	privateKeyHex := os.Getenv("BROKER_PRIVATE_KEY")
	if privateKeyHex == "" {
		log.Println("BROKER_PRIVATE_KEY environment variable is required")
	}
	log.Printf("Using broker address derived from private key: %s", BrokerAddress)

	// Initialize global services.
	channelService = NewChannelService(db)
	ledger = NewLedger(db)
	signer, err := NewSigner(privateKeyHex)
	if err != nil {
		log.Fatalf("failed to initialise signer: %v", err)
	}
	// Initialize blockchain clients
	clients, err := initBlockchainClients(signer)
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

	unifiedWSHandler := NewUnifiedWSHandler(centrifugeNode, signer, channelService, ledger)
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
func initBlockchainClients(signer *Signer) (map[string]*CustodyClientWrapper, error) {
	config, err := LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %w", err)
	}

	clients := make(map[string]*CustodyClientWrapper)

	for name, network := range config.Networks {
		client, err := setupBlockchainClient(signer, network.InfuraURL, network.CustodyAddress, network.ChainID)
		if err != nil {
			log.Printf("Warning: Failed to initialize %s blockchain client: %v", name, err)
			continue
		}

		clients[network.ChainID] = client
	}

	return clients, nil
}
