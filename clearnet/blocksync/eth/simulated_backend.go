package eth

// Package eth provides a simulated Ethereum environment for testing.

import (
	"context"
	"errors"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
)

var (
	DEFAULT_INTERVAL        = 10 * time.Millisecond
	DEFAULT_START_BLOCK     = uint64(1)
	DEFAULT_EXISTING_BLOCKS = DEFAULT_START_BLOCK + 1
)

// SimulatedChainID is the chain ID used by the simulated environment, default is 1337.
var SimulatedChainID = big.NewInt(1337)

// DEFAULT_FUNDING_AMOUNT is the default amount of Ether assigned to each test account (1 ETH).
var DEFAULT_FUNDING_AMOUNT = big.NewInt(0).SetUint64(1000000000000000000) // 1 ETH

// SimulatedBackend wraps the simulated backend, client, accounts, and deployer.
type SimulatedBackend struct {
	*simulated.Backend
	simulated.Client

	accounts []SimulatedAccount
	deployer SimulatedAccount
}

type SimulatedBackendConfig struct {
	Interval *time.Duration
}

// NewSimulatedBackend creates a new SimulatedBackend instance with 10 accounts funded by
// the default allocation.
// If supplied interval is not `nil`, then starts a goroutine that commits new blocks with the interval.
func NewSimulatedBackend(config SimulatedBackendConfig) (*SimulatedBackend, error) {
	// Generate 10 accounts with 10 eth each
	// NOTE: pls do not reduce the amount of accounts since it will break the tests
	accounts, err := generateSimulatedBackendAccounts(10)
	if err != nil {
		return nil, err
	}

	alloc := map[common.Address]types.Account{}

	for _, a := range accounts {
		alloc[a.CommonAddress] = types.Account{
			Balance: big.NewInt(0).Mul(DEFAULT_FUNDING_AMOUNT, big.NewInt(2)),
		}
	}

	backend := simulated.NewBackend(alloc)

	if config.Interval != nil {
		// Simulates mining of blocks within some interval
		go func() {
			ticker := time.NewTicker(*config.Interval)
			defer ticker.Stop()
			for range ticker.C {
				backend.Commit()
			}
		}()
	}

	chb := &SimulatedBackend{
		Backend:  backend,
		Client:   backend.Client(),
		accounts: accounts,
		deployer: accounts[0],
	}

	return chb, nil
}

// Deployer returns a pointer to the deployer account used by the SimulatedBackend.
func (sb *SimulatedBackend) Deployer() *SimulatedAccount {
	return &sb.deployer
}

// ChainID returns the chain ID used by the SimulatedBackend.
func (sb *SimulatedBackend) ChainID(ctx context.Context) (*big.Int, error) {
	return SimulatedChainID, nil
}

// WaitMinedPeriod is the time interval to wait between block commits when simulating transactions.
func (sb *SimulatedBackend) WaitMinedPeriod() time.Duration {
	return 10 * time.Millisecond
}

// WaitMined waits for the specified transaction to be mined or until the context is canceled.
func (sb *SimulatedBackend) WaitMined(ctx context.Context, tx *types.Transaction) (*types.Receipt, error) {
	queryTicker := time.NewTicker(sb.WaitMinedPeriod())
	defer queryTicker.Stop()

	for {
		receipt, err := sb.TransactionReceipt(ctx, tx.Hash())
		if err == nil {
			return receipt, nil
		}

		// Wait for the next round.
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-queryTicker.C:
		}
	}
}

// Account returns a pointer to the SimulatedAccount at the given id or an error if the id is out of range.
func (sb *SimulatedBackend) Account(id int) (*SimulatedAccount, error) {
	if id > len(sb.accounts) {
		return nil, errors.New("Account doesn't exists")
	}
	return &sb.accounts[id], nil
}

// PrepareTx prepares a transaction using a provided testing object, call message, and the given SimulatedAccount.
func (sb *SimulatedBackend) PrepareTx(t *testing.T, callTx *ethereum.CallMsg, account *SimulatedAccount) (*types.Transaction, error) {
	chainID, err := sb.ChainID(context.Background())
	require.NoError(t, err)

	signingMethod := types.LatestSignerForChainID(chainID)

	ctx := context.Background()
	nonce, err := sb.PendingNonceAt(ctx, account.CommonAddress)
	require.NoError(t, err)

	gas, err := sb.EstimateGas(ctx, *callTx)
	require.NoError(t, err)

	gas = decimal.New(11, -1).Mul(decimal.NewFromInt(int64(gas))).BigInt().Uint64()

	gasTipCap, err := sb.SuggestGasTipCap(ctx)
	require.NoError(t, err)

	if gasTipCap == nil {
		// 1 gwei by default
		gasTipCap = big.NewInt(1_000_000)
	}

	block, err := sb.BlockByNumber(ctx, nil)
	require.NoError(t, err)

	maxPriorityFeePerGas := decimal.New(15, -1).Mul(decimal.NewFromBigInt(gasTipCap, 0)).BigInt()
	maxFeePerGas := big.NewInt(0).Add(block.BaseFee(), maxPriorityFeePerGas)

	dynamicFeeTx := &types.DynamicFeeTx{
		Nonce:     nonce,
		GasTipCap: maxPriorityFeePerGas,
		GasFeeCap: maxFeePerGas,
		Gas:       gas,
		To:        callTx.To,
		Value:     callTx.Value,
		Data:      callTx.Data,
	}

	tx := types.NewTx(dynamicFeeTx)

	hash := signingMethod.Hash(tx).Bytes()
	sig, err := account.Signer.Sign(hash)
	require.NoError(t, err)

	t.Logf("Tx to send: %+v\nsig: %v\nsigner: %v", dynamicFeeTx, sig, account.Signer.CommonAddress())

	return tx.WithSignature(signingMethod, sig.Raw())
}
