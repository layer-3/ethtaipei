package solmock

import (
	"context"
	"errors"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/layer-3/ethtaipei/clearnet/blocksync/eth"
)

type TestEvent common.Hash

var (
	EventA TestEvent = TestEvent(common.HexToHash("0x2c0002f4c21939aa5cdc8b48ec9fcf8de5503d963e62c967ac9fe6b55d547d82"))
	EventB TestEvent = TestEvent(common.HexToHash("0x2ac336d316802d0304655a180985d4209070c7f956d5b633300f0ab28cc89e12"))
	EventC TestEvent = TestEvent(common.HexToHash("0x5145a195e6ffe20888500a7eb3f0467b75a1ae8770c0d7e6b124cbc83c15b18b"))
	EventD TestEvent = TestEvent(common.HexToHash("0xb09b4cce9a6aa343be3615d1e9c454692069c380bccb0eec7f977975369337fb"))
)

// Creates a TriggerEvent transaction, corresponding to the event hash provided,
// and sends it to the mempool.
func SendTriggerEventTx(ctx context.Context, eventEmitter *TestEventEmitter, deployer *eth.SimulatedAccount, event TestEvent) (common.Hash, error) {
	var tx *types.Transaction
	var err error
	switch event {
	case EventA:
		tx, err = eventEmitter.TriggerEventA(deployer.TransactOpts)

	case EventB:
		tx, err = eventEmitter.TriggerEventB(deployer.TransactOpts)

	case EventC:
		tx, err = eventEmitter.TriggerEventC(deployer.TransactOpts)

	case EventD:
		tx, err = eventEmitter.TriggerEventD(deployer.TransactOpts)

	default:
		return common.Hash{}, errors.New("unknown event")
	}

	if err != nil {
		return common.Hash{}, err
	}

	return tx.Hash(), nil
}
