package eth

import (
	"context"
	"log"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/layer-3/clearsync/pkg/artifacts/adjudicator"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type Adjudicator struct {
	address  common.Address
	contract *adjudicator.YellowAdjudicator
}

func (a *Adjudicator) Deploy(ctx context.Context, backend LocalBackend) (address common.Address, tx *types.Transaction, err error) {
	address, tx, a.contract, err = adjudicator.DeployYellowAdjudicator(backend.Deployer().TransactOpts, backend)
	return address, tx, err
}

func TestSimulatedEnvironment(t *testing.T) {
	ctx := context.Background()
	interval := time.Second
	config := SimulatedEnvironmentConfig{
		BackendConfig: SimulatedBackendConfig{Interval: &interval},
		Users:         10,
	}

	env, err := NewSimulatedEnvironment(ctx, config)
	require.NoError(t, err)
	log.Println("simulated environment created")

	chainID, err := env.Backend.ChainID(ctx)
	require.NoError(t, err)

	USDT := AssetConfig{
		Name:     "Tether",
		Symbol:   "USDT",
		Decimals: 18,
		Supply:   big.NewInt(100_000_000),
		Funding:  big.NewInt(100_000),
	}
	asset, err := env.DeployToken(ctx, USDT)
	require.NoError(t, err)
	log.Println("token deployed")

	assert.Equal(t, USDT.Symbol, asset.Symbol)
	assert.Equal(t, chainID, big.NewInt(int64(asset.ChainID)))
	assert.Equal(t, USDT.Decimals, asset.Decimals)

	adj := &Adjudicator{}
	_, err = env.DeployContract(adj)
	require.NoError(t, err)
	log.Println("app deployed")

	alice := env.Accounts()[0]
	bob := env.Accounts()[1]
	assert.NotEqual(t, alice.CommonAddress, bob.CommonAddress)
}
