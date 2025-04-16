package main

import (
	"os"
	"strings"
)

// NetworkConfig represents configuration for a blockchain network
type NetworkConfig struct {
	Name            string
	ChainID         string
	InfuraURL       string
	CustodyAddress  string
}

// Config represents the overall application configuration
type Config struct {
	Networks map[string]*NetworkConfig
}

// LoadConfig builds configuration from environment variables
func LoadConfig() (Config, error) {
	config := Config{
		Networks: make(map[string]*NetworkConfig),
	}

	// Define known networks and their chain IDs
	knownNetworks := map[string]string{
		"POLYGON": "137",
		"CELO":    "42220",
		"BASE":    "8453",
	}

	// Get all environment variables
	envs := os.Environ()

	// Process each network
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
			config.Networks[networkLower] = &NetworkConfig{
				Name:           networkLower,
				ChainID:        chainID,
				InfuraURL:      infuraURL,
				CustodyAddress: custodyAddress,
			}
		}
	}

	return config, nil
}
