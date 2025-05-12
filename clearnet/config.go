package main

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// knownNetworks maps network name prefixes to their respective chain IDs.
// Each prefix is used to find corresponding environment variables:
// - {PREFIX}_INFURA_URL: The Infura endpoint URL for the network
// - {PREFIX}_CUSTODY_CONTRACT_ADDRESS: The custody contract address
var knownNetworks = map[string]string{
	"POLYGON": "137",
	"CELO":    "42220",
	"BASE":    "8453",
}

// NetworkConfig represents configuration for a blockchain network
type NetworkConfig struct {
	Name           string
	ChainID        string
	InfuraURL      string
	CustodyAddress string
}

// Config represents the overall application configuration
type Config struct {
	networks      map[string]*NetworkConfig
	dbURL         string
	privateKeyHex string
}

// LoadConfig builds configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
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

	// Retrieve the private key.
	privateKeyHex := os.Getenv("BROKER_PRIVATE_KEY")
	if privateKeyHex == "" {
		log.Println("BROKER_PRIVATE_KEY environment variable is required")
	}

	config := Config{
		networks:      make(map[string]*NetworkConfig),
		dbURL:         dbURL,
		privateKeyHex: privateKeyHex,
	}

	// Process each network
	envs := os.Environ()
	for network, chainID := range knownNetworks {
		infuraURL := ""
		custodyAddress := ""

		// Look for matching environment variables
		for _, env := range envs {
			parts := strings.SplitN(env, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := parts[0]
			value := parts[1]

			if strings.HasPrefix(key, network+"_INFURA_URL") {
				infuraURL = value
			} else if strings.HasPrefix(key, network+"_CUSTODY_CONTRACT_ADDRESS") {
				custodyAddress = value
			}
		}

		// Only add network if both required variables are present
		if infuraURL != "" && custodyAddress != "" {
			networkLower := strings.ToLower(network)
			config.networks[networkLower] = &NetworkConfig{
				Name:           networkLower,
				ChainID:        chainID,
				InfuraURL:      infuraURL,
				CustodyAddress: custodyAddress,
			}
		}
	}

	return &config, nil
}

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
	if err := db.AutoMigrate(&Entry{}, &Channel{}, &VApp{}); err != nil {
		return nil, err
	}
	log.Println("Database migrations completed successfully")
	return db, nil
}
