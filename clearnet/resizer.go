package main

import (
	"math/big"
	"sort"
	"time"

	"log"

	"github.com/erc7824/go-nitrolite"
	"github.com/ethereum/go-ethereum/common"
)

type Resizer struct {
	ledger  *Ledger
	custody map[string]*Custody
	signer  *Signer
}

func NewResizeWorker(ledger *Ledger, signer *Signer) *Resizer {
	return &Resizer{
		ledger:  ledger,
		custody: map[string]*Custody{},
		signer:  signer,
	}
}

func (r *Resizer) AddCustody(custody *Custody) {
	r.custody[custody.networkID] = custody
}

func (r *Resizer) Run(period time.Duration) {
	ticker := time.NewTicker(period)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			channels, err := GetOpenChannelsWithBroker(r.ledger.db)
			if err != nil {
				log.Printf("failed to get open channels: %v", err)
				continue
			}

			// TODO: this sorting can be simplified with SQL.
			type sortedChannel struct {
				channel    Channel
				balance    int64
				brokerPart int64
			}

			var channelsSorted []sortedChannel
			for _, channel := range channels {
				balance, err := r.ledger.SelectBeneficiaryAccount(channel.ChannelID, channel.ParticipantA).Balance()
				if err != nil {
					log.Printf("failed to get balance for channel %s: %v", channel.ChannelID, err)
					continue
				}
				brokerPart := channel.Amount - balance
				if brokerPart > 0 {
					channelsSorted = append(channelsSorted, sortedChannel{
						channel:    channel,
						balance:    balance,
						brokerPart: brokerPart,
					})
				}
			}

			// Sort channels by brokerPart in descending order
			sort.Slice(channelsSorted, func(i, j int) bool {
				return channelsSorted[i].brokerPart > channelsSorted[j].brokerPart
			})

			// Process only the first 5 channels with the largest brokerPart
			limit := 1
			if len(channelsSorted) < limit {
				limit = len(channelsSorted)
			}
			for i := 0; i < limit; i++ {
				ch := channelsSorted[i].channel
				balance := channelsSorted[i].balance
				brokerPart := channelsSorted[i].brokerPart

				// Resize the channel
				allocations := []nitrolite.Allocation{
					{
						Destination: common.HexToAddress(ch.ParticipantA),
						Token:       common.HexToAddress(ch.Token),
						Amount:      big.NewInt(balance),
					},
					{
						Destination: common.HexToAddress(ch.ParticipantB),
						Token:       common.HexToAddress(ch.Token),
						Amount:      big.NewInt(0),
					},
				}

				resizeAmounts := []*big.Int{big.NewInt(0), big.NewInt(-brokerPart)}

				custody, ok := r.custody[ch.NetworkID]
				if !ok {
					log.Printf("no custody found for network %s", ch.NetworkID)
					continue
				}

				err := custody.Resize(ch.ChannelID, int64(ch.Version), resizeAmounts, allocations)
				if err != nil {
					log.Printf("failed to resize channel %s: %v", ch.ChannelID, err)
				}
			}
		}
	}
}
