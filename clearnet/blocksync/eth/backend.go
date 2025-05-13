package eth

import (
	"context"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
)

type Backend interface {
	ethereum.ChainReader
	ethereum.ChainStateReader
	ethereum.TransactionReader
	ethereum.TransactionSender
	ethereum.ContractCaller
	ethereum.BlockNumberReader

	ChainID(ctx context.Context) (*big.Int, error)
	WaitMinedPeriod() time.Duration
	bind.ContractBackend
}

type LocalBackend interface {
	Backend

	Deployer() *SimulatedAccount
}
