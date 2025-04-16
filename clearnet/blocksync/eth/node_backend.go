package eth

import (
	"context"
	"errors"
	"net/url"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type NodeBackend struct {
	*ethclient.Client
}

func NewNodeBackend(rpcUrl url.URL) (*NodeBackend, error) {
	// Make sure that rpcUrl is WS url,
	// otherwise event subscription won't work.
	if rpcUrl.Scheme != "ws" {
		return nil, errors.New("invalid rpc url scheme " + rpcUrl.Scheme)
	}

	client, err := ethclient.Dial(rpcUrl.String())
	if err != nil {
		return nil, err
	}

	return &NodeBackend{
		Client: client,
	}, nil
}

func (n *NodeBackend) WaitMinedPeriod() time.Duration {
	return time.Second
}

// WaitMined waits for tx to be mined on the blockchain.
// It stops waiting when the context is canceled.
func (b *NodeBackend) WaitMined(ctx context.Context, tx *types.Transaction) (*types.Receipt, error) {
	queryTicker := time.NewTicker(b.WaitMinedPeriod())
	defer queryTicker.Stop()

	for {
		receipt, err := b.TransactionReceipt(ctx, tx.Hash())
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
