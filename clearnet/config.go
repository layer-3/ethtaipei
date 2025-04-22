package main

import (
	"os"
	"strings"
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
	Networks map[string]*NetworkConfig
}

// LoadConfig builds configuration from environment variables
func LoadConfig() (Config, error) {
	config := Config{
		Networks: make(map[string]*NetworkConfig),
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
