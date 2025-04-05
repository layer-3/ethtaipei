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
	router         *Router
	messageRouter  RouterInterface
	centrifugeNode *centrifuge.Node
)

// setupDatabase initializes the database connection and performs migrations.
func setupDatabase(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	// Auto-migrate the models.
	if err := db.AutoMigrate(&Entry{}, &DBChannel{}, &DBVirtualChannel{}); err != nil {
		return nil, err
	}
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
	auth.GasPrice = big.NewInt(20000000000) // 20 gwei.
	auth.GasLimit = uint64(3000000)

	// Derive broker's Ethereum address.
	publicKeyECDSA, ok := privateKey.Public().(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("error casting public key to ECDSA")
	}
	BrokerAddress = crypto.PubkeyToAddress(*publicKeyECDSA).Hex()

	custodyClient, err := NewCustodyClientWrapper(client, custodyAddress, auth, networkID)
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
	// Initialize the database.
	dsn := "file:broker.db?mode=memory&cache=shared"
	db, err := setupDatabase(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Centrifuge node.
	centrifugeNode, err = centrifuge.New(centrifuge.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// Initialize global services.
	channelService = NewChannelService(db)
	ledger = NewLedger(db)
	router = NewRouter(centrifugeNode)
	messageRouter = NewRouter(centrifugeNode)

	// Retrieve the private key.
	privateKeyHex := os.Getenv("BROKER_PRIVATE_KEY")
	if privateKeyHex == "" {
		log.Println("BROKER_PRIVATE_KEY environment variable is required")
	}
	log.Printf("Using broker address derived from private key: %s", BrokerAddress)

	// Initialize blockchain clients.
	custodyPOLYGON, custodyCELO, custodyBASE := initBlockchainClients(privateKeyHex)

	// Start the Centrifuge node.
	if err := centrifugeNode.Run(); err != nil {
		log.Fatal(err)
	}

	webhookHandler := NewEventHandler(ledger, channelService, BrokerAddress, custodyPOLYGON, custodyCELO, custodyBASE)
	http.Handle("/webhook", webhookHandler)

	unifiedWSHandler := NewUnifiedWSHandler(centrifugeNode, channelService, ledger, messageRouter)
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

// TODO: define config in a proper flexible way, do not hardcode networks as envs.
// initBlockchainClients initializes blockchain clients for Polygon and Celo.
func initBlockchainClients(privateKeyHex string) (custodyPOLYGON, custodyCELO, custodyBASE *CustodyClientWrapper) {
	polInfuraURL := os.Getenv("POLYGON_INFURA_URL")
	if polInfuraURL == "" {
		log.Println("POLYGON_INFURA_URL environment variable is required")
	}

	polCustodyAddress := os.Getenv("POLYGON_CUSTODY_CONTRACT_ADDRESS")
	if polCustodyAddress == "" {
		log.Println("POLYGON_CUSTODY_CONTRACT_ADDRESS environment variable is required")
	}

	custodyPOLYGON, err := setupBlockchainClient(privateKeyHex, polInfuraURL, polCustodyAddress, "80002")
	if err != nil {
		log.Println("Warning: Failed to initialize Polygon blockchain client: %v", err)
	}

	celoInfuraURL := os.Getenv("CELO_INFURA_URL")
	if celoInfuraURL == "" {
		log.Println("CELO_INFURA_URL environment variable is required")
	}

	celoCustodyAddress := os.Getenv("CELO_CUSTODY_CONTRACT_ADDRESS")
	if celoCustodyAddress == "" {
		log.Println("CELO_CUSTODY_CONTRACT_ADDRESS environment variable is required")
	}

	custodyCELO, err = setupBlockchainClient(privateKeyHex, celoInfuraURL, celoCustodyAddress, "42220")
	if err != nil {
		log.Println("Warning: Failed to initialize Celo blockchain client: %v", err)
	}

	baseInfuraURL := os.Getenv("BASE_INFURA_URL")
	if celoInfuraURL == "" {
		log.Println("BASE_INFURA_URL environment variable is required")
	}

	baseCustodyAddress := os.Getenv("BASE_CUSTODY_CONTRACT_ADDRESS")
	if celoCustodyAddress == "" {
		log.Println("BASE_CUSTODY_CONTRACT_ADDRESS environment variable is required")
	}

	custodyBASE, err = setupBlockchainClient(privateKeyHex, baseInfuraURL, baseCustodyAddress, "8453")
	if err != nil {
		log.Println("Warning: Failed to initialize Celo blockchain client: %v", err)
	}
	return
}
