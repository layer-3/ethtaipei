package eth

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/layer-3/clearsync/pkg/artifacts/test_erc20"
)

func DeployERC20(
	ctx context.Context,
	be LocalBackend,
	name, symbol string,
	decimals uint8,
	supply *big.Int,
) (common.Address, *test_erc20.TestERC20, error) {
	transactOpts := *be.Deployer().TransactOpts
	transactOpts.Context = ctx
	tokenAddress, tx, tokenContract, err := test_erc20.DeployTestERC20(
		&transactOpts,
		be,
		name,
		symbol,
		decimals,
		supply,
	)
	if err != nil {
		return common.Address{}, nil, err
	}

	_, err = bind.WaitMined(ctx, be, tx)
	if err != nil {
		return common.Address{}, nil, err
	}

	return tokenAddress, tokenContract, nil
}

func FundERC20(
	ctx context.Context,
	be LocalBackend,
	tokenContract *test_erc20.TestERC20,
	funding map[common.Address]*big.Int,
) error {
	opts := be.Deployer().TransactOpts
	for address, amount := range funding {
		tx, err := tokenContract.Mint(opts, address, amount)
		if err != nil {
			return err
		}

		_, err = bind.WaitMined(ctx, be, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

func DeployAndFundERC20(
	ctx context.Context,
	be LocalBackend,
	name, symbol string,
	decimal uint8,
	funding map[common.Address]*big.Int,
	supply *big.Int,
) (common.Address, *test_erc20.TestERC20, error) {
	tokenAddress, tokenContract, err := DeployERC20(ctx, be, name, symbol, decimal, supply)
	if err != nil {
		return common.Address{}, nil, err
	}

	err = FundERC20(ctx, be, tokenContract, funding)
	if err != nil {
		return common.Address{}, nil, err
	}

	return tokenAddress, tokenContract, nil
}
