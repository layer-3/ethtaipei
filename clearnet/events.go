package main

import (
	"math/big"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
	"github.com/shopspring/decimal"
)

type ChanState uint8

type CreatedEvent struct {
	ChannelId common.Hash
	Channel   nitrolite.Channel
	Initial   State
}

type JoinedEvent struct {
	ChannelId common.Hash
	Index     decimal.Decimal
}

type OpenedEvent struct {
	ChannelId common.Hash
}

type ChallengedEvent struct {
	ChannelId  common.Hash
	Expiration *big.Int
}

type CheckpointedEvent struct {
	ChannelId common.Hash
}

type ChannelClosedEvent struct {
	ChannelId common.Hash
}
