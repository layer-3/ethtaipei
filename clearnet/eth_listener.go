package main

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
	"github.com/ipfs/go-log/v2"
)

var logger = log.Logger("base-event-listener")

const (
	maxBackOffCount = 5
)

func init() {
	log.SetAllLoggers(log.LevelDebug)
	log.SetLogLevel("base-event-listener", "debug")

	var err error
	custodyAbi, err = nitrolite.CustodyMetaData.GetAbi()
	if err != nil {
		panic(err)
	}
}

type LogHandler func(l types.Log)

func ListenEvents(
	client bind.ContractBackend,
	subID string,
	contractAddress common.Address,
	networkID string,
	lastBlock uint64,
	handler LogHandler,
) {
	var backOffCount atomic.Uint64
	var currentCh chan types.Log
	var eventSubscription event.Subscription

	logger.Infow("starting listening events", "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String())
	for {
		if eventSubscription == nil {
			waitForBackOffTimeout(int(backOffCount.Load()))

			currentCh = make(chan types.Log, 100)

			watchFQ := ethereum.FilterQuery{
				Addresses: []common.Address{contractAddress},
			}
			eventSub, err := client.SubscribeFilterLogs(context.Background(), watchFQ, currentCh)
			if err != nil {
				logger.Errorw("failed to subscribe on events", "error", err, "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String())
				backOffCount.Add(1)
				continue
			}

			eventSubscription = eventSub
			logger.Infow("watching events", "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String())
			backOffCount.Store(0)
		}

		select {
		case eventLog := <-currentCh:
			lastBlock = eventLog.BlockNumber
			logger.Debugw("received new event", "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String(), "blockNumber", lastBlock, "logIndex", eventLog.Index)
			handler(eventLog)
		case err := <-eventSubscription.Err():
			if err != nil {
				logger.Errorw("event subscription error", "error", err, "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String())
				eventSubscription.Unsubscribe()
			} else {
				logger.Debugw("subscription closed, resubscribing", "subID", subID, "networkID", networkID, "contractAddress", contractAddress.String())
			}

			eventSubscription = nil
		}
	}
}

func waitForBackOffTimeout(backOffCount int) {
	if backOffCount > maxBackOffCount {
		logger.Fatalw("back off limit reached, exiting", "backOffCollisionCount", backOffCount)
		return
	}

	if backOffCount > 0 {
		logger.Infow("backing off before subscribing on contract events", "backOffCollisionCount", backOffCount)
		<-time.After(time.Duration(2^backOffCount-1) * time.Second)
	}
}
