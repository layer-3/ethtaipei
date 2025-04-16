package eth

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	ecrypto "github.com/ethereum/go-ethereum/crypto"
	"github.com/layer-3/clearsync/pkg/signer"
)

type SimulatedAccount struct {
	PrivateKey    *ecdsa.PrivateKey
	CommonAddress common.Address
	TransactOpts  *bind.TransactOpts

	Signer signer.LocalSigner
}

func NewSimulatedAccount(chainID *big.Int) (SimulatedAccount, error) {
	pvk, err := ecrypto.GenerateKey()
	if err != nil {
		return SimulatedAccount{}, fmt.Errorf("failed to generate deployer private key: %w", err)
	}

	opts, err := bind.NewKeyedTransactorWithChainID(pvk, chainID)
	if err != nil {
		return SimulatedAccount{}, err
	}

	a := SimulatedAccount{
		PrivateKey:    pvk,
		CommonAddress: ecrypto.PubkeyToAddress(pvk.PublicKey),
		TransactOpts:  opts,
		Signer:        signer.NewLocalSigner(pvk),
	}

	return a, nil
}

func NewSimulatedAccountWithPrivateKey(privateKey *ecdsa.PrivateKey, chainID *big.Int) (SimulatedAccount, error) {
	opts, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return SimulatedAccount{}, err
	}

	a := SimulatedAccount{
		PrivateKey:    privateKey,
		CommonAddress: ecrypto.PubkeyToAddress(privateKey.PublicKey),
		TransactOpts:  opts,
		Signer:        signer.NewLocalSigner(privateKey),
	}

	return a, nil
}

func generateSimulatedBackendAccounts(n int) ([]SimulatedAccount, error) {
	accounts := []SimulatedAccount{}
	for i := 0; i < n; i++ {
		a, err := NewSimulatedAccount(SimulatedChainID)
		if err != nil {
			return nil, err
		}

		accounts = append(accounts, a)
	}

	return accounts, nil
}
