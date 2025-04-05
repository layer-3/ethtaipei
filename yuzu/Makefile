# Default values (can be overridden via command line)
TESTNET_SUPPLY_CHAIN_ID ?= 1301
MAINNET_SUPPLY_CHAIN_ID ?= 130
PRIVATE_KEY ?= YOUR_PRIVATE_KEY

.PHONY: deploy-testnet deploy build test

# Deploy to testnet (Unichain Sepolia)
deploy-testnet:
	INITIAL_SUPPLY_CHAIN_ID=$(TESTNET_SUPPLY_CHAIN_ID) forge script script/Token.s.sol \
		--rpc-url unichain_sepolia \
		--private-key $(PRIVATE_KEY) \
		--broadcast

# Deploy to mainnet (Unichain Mainnet)
deploy:
	INITIAL_SUPPLY_CHAIN_ID=$(MAINNET_SUPPLY_CHAIN_ID) forge script script/Token.s.sol \
		--rpc-url unichain_mainnet \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--verify

	INITIAL_SUPPLY_CHAIN_ID=$(MAINNET_SUPPLY_CHAIN_ID) forge script script/Token.s.sol \
		--rpc-url base_mainnet \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--verify

# Build the project
build:
	forge build

# Run tests
test:
	forge test
