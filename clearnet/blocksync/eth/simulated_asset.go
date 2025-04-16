package eth

import "github.com/ethereum/go-ethereum/common"

type SimulatedAsset struct {
	Symbol   string
	ChainID  uint64
	Address  common.Address
	Decimals uint8
}

func NewSimulatedAsset(symbol string, chainID uint64, address common.Address, decimals uint8) SimulatedAsset {
	return SimulatedAsset{
		Symbol:   symbol,
		ChainID:  chainID,
		Address:  address,
		Decimals: decimals,
	}
}
