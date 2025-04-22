package eth

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

type SimulatedEnvironment struct {
	ctx      context.Context
	accounts []SimulatedAccount
	Backend  LocalBackend
}

type SimulatedEnvironmentConfig struct {
	BackendConfig any
	Users         uint8
}

func NewSimulatedEnvironment(ctx context.Context, config SimulatedEnvironmentConfig) (sim SimulatedEnvironment, err error) {
	// Kickstart simulated backend
	var backend LocalBackend
	switch config.BackendConfig.(type) {
	case SimulatedBackendConfig:
		config := config.BackendConfig.(SimulatedBackendConfig)
		if backend, err = NewSimulatedBackend(config); err != nil {
			return SimulatedEnvironment{}, fmt.Errorf("failed to deploy simulated backend: %s", err)
		}
	default:
		return SimulatedEnvironment{}, fmt.Errorf("unsupported simulated backend: %T", config.BackendConfig)
	}
	sim.ctx = ctx
	sim.Backend = backend

	// Set up accounts
	chainID, err := backend.ChainID(ctx)
	if err != nil {
		return SimulatedEnvironment{}, fmt.Errorf("failed to get chain ID: %s", err)
	}

	accounts := make([]SimulatedAccount, 0, config.Users)
	addresses := make([]common.Address, 0, config.Users)
	for i := uint8(0); i < config.Users; i++ {
		user, err := NewSimulatedAccount(chainID)
		if err != nil {
			return SimulatedEnvironment{}, fmt.Errorf("failed to deploy account: %s", err)
		}
		accounts = append(accounts, user)
		addresses = append(addresses, user.CommonAddress)
	}
	sim.accounts = accounts

	return sim, nil
}

func (env *SimulatedEnvironment) Accounts() []SimulatedAccount {
	accounts := make([]SimulatedAccount, len(env.accounts))
	copy(accounts, env.accounts)
	return accounts
}

type AssetConfig struct {
	Name     string
	Symbol   string
	Decimals uint8
	Supply   *big.Int
	Funding  *big.Int
}

func (env *SimulatedEnvironment) DeployToken(ctx context.Context, asset AssetConfig) (SimulatedAsset, error) {
	chainID, err := env.Backend.ChainID(ctx)
	if err != nil {
		return SimulatedAsset{}, fmt.Errorf("failed to get chain ID: %s", err)
	}

	fundingPerUser := make(map[common.Address]*big.Int, len(env.accounts))
	for _, account := range env.accounts {
		fundingPerUser[account.CommonAddress] = asset.Funding
	}

	tokenAddress, _, err := DeployAndFundERC20(ctx, env.Backend, asset.Name, asset.Symbol, asset.Decimals, fundingPerUser, asset.Supply)
	if err != nil {
		return SimulatedAsset{}, fmt.Errorf("failed to deploy simulated asset (%s) %s: %s", asset.Name, asset.Symbol, err)
	}

	return NewSimulatedAsset(asset.Symbol, chainID.Uint64(), tokenAddress, asset.Decimals), nil
}

// Deployer is a shortcut for deploying new contracts.
// The contract is assumed to be configured by the implementor.
type Deployer interface {
	Deploy(ctx context.Context, backend LocalBackend) (common.Address, *types.Transaction, error)
}

type DeploymentResult struct {
	Address     common.Address
	Transaction *types.Transaction
}

func (env *SimulatedEnvironment) DeployContract(deployer Deployer) (DeploymentResult, error) {
	address, tx, err := deployer.Deploy(env.ctx, env.Backend)
	if err != nil {
		return DeploymentResult{}, fmt.Errorf("failed to deploy contract: %s", err)
	}
	if _, err = bind.WaitMined(env.ctx, env.Backend, tx); err != nil {
		return DeploymentResult{}, fmt.Errorf("failed to wait for contract deployment: %s", err)
	}
	return DeploymentResult{Address: address, Transaction: tx}, nil
}
