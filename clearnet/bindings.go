// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package main

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
)

// Allocation is an auto generated low-level Go binding around an user-defined struct.
type Allocation struct {
	Destination common.Address
	Token       common.Address
	Amount      *big.Int
}

// Channel is an auto generated low-level Go binding around an user-defined struct.
type Channel struct {
	Participants []common.Address
	Adjudicator  common.Address
	Challenge    uint64
	Nonce        uint64
}

// Signature is an auto generated low-level Go binding around an user-defined struct.
type Signature struct {
	V uint8
	R [32]byte
	S [32]byte
}

// State is an auto generated low-level Go binding around an user-defined struct.
type State struct {
	Data        []byte
	Allocations []Allocation
	Sigs        []Signature
}

// CustodyMetaData contains all meta data concerning the Custody contract.
var CustodyMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"challenge\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"candidate\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]},{\"name\":\"proofs\",\"type\":\"tuple[]\",\"internalType\":\"structState[]\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"checkpoint\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"candidate\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]},{\"name\":\"proofs\",\"type\":\"tuple[]\",\"internalType\":\"structState[]\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"close\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"candidate\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]},{\"name\":\"proofs\",\"type\":\"tuple[]\",\"internalType\":\"structState[]\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"create\",\"inputs\":[{\"name\":\"ch\",\"type\":\"tuple\",\"internalType\":\"structChannel\",\"components\":[{\"name\":\"participants\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"adjudicator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"challenge\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nonce\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]},{\"name\":\"initial\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"outputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"deposit\",\"inputs\":[{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"getAccountChannels\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAccountInfo\",\"inputs\":[{\"name\":\"user\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"available\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"locked\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"channelCount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"join\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"index\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"sig\",\"type\":\"tuple\",\"internalType\":\"structSignature\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"reset\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"candidate\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]},{\"name\":\"proofs\",\"type\":\"tuple[]\",\"internalType\":\"structState[]\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]},{\"name\":\"newChannel\",\"type\":\"tuple\",\"internalType\":\"structChannel\",\"components\":[{\"name\":\"participants\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"adjudicator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"challenge\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nonce\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]},{\"name\":\"newDeposit\",\"type\":\"tuple\",\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"withdraw\",\"inputs\":[{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Challenged\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"expiration\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelClosed\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Checkpointed\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Created\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"channel\",\"type\":\"tuple\",\"indexed\":false,\"internalType\":\"structChannel\",\"components\":[{\"name\":\"participants\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"adjudicator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"challenge\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nonce\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]},{\"name\":\"initial\",\"type\":\"tuple\",\"indexed\":false,\"internalType\":\"structState\",\"components\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"allocations\",\"type\":\"tuple[]\",\"internalType\":\"structAllocation[]\",\"components\":[{\"name\":\"destination\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"name\":\"sigs\",\"type\":\"tuple[]\",\"internalType\":\"structSignature[]\",\"components\":[{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]}]}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Joined\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"index\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Opened\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ChallengeNotExpired\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelNotFinal\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelNotFound\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureLength\",\"inputs\":[{\"name\":\"length\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureS\",\"inputs\":[{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"InsufficientBalance\",\"inputs\":[{\"name\":\"available\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"required\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"InvalidAdjudicator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAmount\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidChallengePeriod\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidParticipant\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidStateSignatures\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidStatus\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFailed\",\"inputs\":[{\"name\":\"token\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// CustodyABI is the input ABI used to generate the binding from.
// Deprecated: Use CustodyMetaData.ABI instead.
var CustodyABI = CustodyMetaData.ABI

// Custody is an auto generated Go binding around an Ethereum contract.
type Custody struct {
	CustodyCaller     // Read-only binding to the contract
	CustodyTransactor // Write-only binding to the contract
	CustodyFilterer   // Log filterer for contract events
}

// CustodyCaller is an auto generated read-only Go binding around an Ethereum contract.
type CustodyCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CustodyTransactor is an auto generated write-only Go binding around an Ethereum contract.
type CustodyTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CustodyFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type CustodyFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// CustodySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type CustodySession struct {
	Contract     *Custody          // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// CustodyCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type CustodyCallerSession struct {
	Contract *CustodyCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts  // Call options to use throughout this session
}

// CustodyTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type CustodyTransactorSession struct {
	Contract     *CustodyTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts  // Transaction auth options to use throughout this session
}

// CustodyRaw is an auto generated low-level Go binding around an Ethereum contract.
type CustodyRaw struct {
	Contract *Custody // Generic contract binding to access the raw methods on
}

// CustodyCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type CustodyCallerRaw struct {
	Contract *CustodyCaller // Generic read-only contract binding to access the raw methods on
}

// CustodyTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type CustodyTransactorRaw struct {
	Contract *CustodyTransactor // Generic write-only contract binding to access the raw methods on
}

// NewCustody creates a new instance of Custody, bound to a specific deployed contract.
func NewCustody(address common.Address, backend bind.ContractBackend) (*Custody, error) {
	contract, err := bindCustody(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Custody{CustodyCaller: CustodyCaller{contract: contract}, CustodyTransactor: CustodyTransactor{contract: contract}, CustodyFilterer: CustodyFilterer{contract: contract}}, nil
}

// NewCustodyCaller creates a new read-only instance of Custody, bound to a specific deployed contract.
func NewCustodyCaller(address common.Address, caller bind.ContractCaller) (*CustodyCaller, error) {
	contract, err := bindCustody(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &CustodyCaller{contract: contract}, nil
}

// NewCustodyTransactor creates a new write-only instance of Custody, bound to a specific deployed contract.
func NewCustodyTransactor(address common.Address, transactor bind.ContractTransactor) (*CustodyTransactor, error) {
	contract, err := bindCustody(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &CustodyTransactor{contract: contract}, nil
}

// NewCustodyFilterer creates a new log filterer instance of Custody, bound to a specific deployed contract.
func NewCustodyFilterer(address common.Address, filterer bind.ContractFilterer) (*CustodyFilterer, error) {
	contract, err := bindCustody(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &CustodyFilterer{contract: contract}, nil
}

// bindCustody binds a generic wrapper to an already deployed contract.
func bindCustody(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(CustodyABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Custody *CustodyRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Custody.Contract.CustodyCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Custody *CustodyRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Custody.Contract.CustodyTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Custody *CustodyRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Custody.Contract.CustodyTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Custody *CustodyCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Custody.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Custody *CustodyTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Custody.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Custody *CustodyTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Custody.Contract.contract.Transact(opts, method, params...)
}

// GetAccountChannels is a free data retrieval call binding the contract method 0x7e2d8d72.
//
// Solidity: function getAccountChannels(address account) view returns(bytes32[])
func (_Custody *CustodyCaller) GetAccountChannels(opts *bind.CallOpts, account common.Address) ([][32]byte, error) {
	var out []interface{}
	err := _Custody.contract.Call(opts, &out, "getAccountChannels", account)

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetAccountChannels is a free data retrieval call binding the contract method 0x7e2d8d72.
//
// Solidity: function getAccountChannels(address account) view returns(bytes32[])
func (_Custody *CustodySession) GetAccountChannels(account common.Address) ([][32]byte, error) {
	return _Custody.Contract.GetAccountChannels(&_Custody.CallOpts, account)
}

// GetAccountChannels is a free data retrieval call binding the contract method 0x7e2d8d72.
//
// Solidity: function getAccountChannels(address account) view returns(bytes32[])
func (_Custody *CustodyCallerSession) GetAccountChannels(account common.Address) ([][32]byte, error) {
	return _Custody.Contract.GetAccountChannels(&_Custody.CallOpts, account)
}

// GetAccountInfo is a free data retrieval call binding the contract method 0x6332fef6.
//
// Solidity: function getAccountInfo(address user, address token) view returns(uint256 available, uint256 locked, uint256 channelCount)
func (_Custody *CustodyCaller) GetAccountInfo(opts *bind.CallOpts, user common.Address, token common.Address) (struct {
	Available    *big.Int
	Locked       *big.Int
	ChannelCount *big.Int
}, error) {
	var out []interface{}
	err := _Custody.contract.Call(opts, &out, "getAccountInfo", user, token)

	outstruct := new(struct {
		Available    *big.Int
		Locked       *big.Int
		ChannelCount *big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Available = *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)
	outstruct.Locked = *abi.ConvertType(out[1], new(*big.Int)).(**big.Int)
	outstruct.ChannelCount = *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)

	return *outstruct, err

}

// GetAccountInfo is a free data retrieval call binding the contract method 0x6332fef6.
//
// Solidity: function getAccountInfo(address user, address token) view returns(uint256 available, uint256 locked, uint256 channelCount)
func (_Custody *CustodySession) GetAccountInfo(user common.Address, token common.Address) (struct {
	Available    *big.Int
	Locked       *big.Int
	ChannelCount *big.Int
}, error) {
	return _Custody.Contract.GetAccountInfo(&_Custody.CallOpts, user, token)
}

// GetAccountInfo is a free data retrieval call binding the contract method 0x6332fef6.
//
// Solidity: function getAccountInfo(address user, address token) view returns(uint256 available, uint256 locked, uint256 channelCount)
func (_Custody *CustodyCallerSession) GetAccountInfo(user common.Address, token common.Address) (struct {
	Available    *big.Int
	Locked       *big.Int
	ChannelCount *big.Int
}, error) {
	return _Custody.Contract.GetAccountInfo(&_Custody.CallOpts, user, token)
}

// Challenge is a paid mutator transaction binding the contract method 0x234e3bad.
//
// Solidity: function challenge(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactor) Challenge(opts *bind.TransactOpts, channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "challenge", channelId, candidate, proofs)
}

// Challenge is a paid mutator transaction binding the contract method 0x234e3bad.
//
// Solidity: function challenge(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodySession) Challenge(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Challenge(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Challenge is a paid mutator transaction binding the contract method 0x234e3bad.
//
// Solidity: function challenge(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactorSession) Challenge(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Challenge(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Checkpoint is a paid mutator transaction binding the contract method 0x957105f2.
//
// Solidity: function checkpoint(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactor) Checkpoint(opts *bind.TransactOpts, channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "checkpoint", channelId, candidate, proofs)
}

// Checkpoint is a paid mutator transaction binding the contract method 0x957105f2.
//
// Solidity: function checkpoint(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodySession) Checkpoint(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Checkpoint(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Checkpoint is a paid mutator transaction binding the contract method 0x957105f2.
//
// Solidity: function checkpoint(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactorSession) Checkpoint(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Checkpoint(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Close is a paid mutator transaction binding the contract method 0x9958e3df.
//
// Solidity: function close(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactor) Close(opts *bind.TransactOpts, channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "close", channelId, candidate, proofs)
}

// Close is a paid mutator transaction binding the contract method 0x9958e3df.
//
// Solidity: function close(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodySession) Close(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Close(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Close is a paid mutator transaction binding the contract method 0x9958e3df.
//
// Solidity: function close(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs) returns()
func (_Custody *CustodyTransactorSession) Close(channelId [32]byte, candidate State, proofs []State) (*types.Transaction, error) {
	return _Custody.Contract.Close(&_Custody.TransactOpts, channelId, candidate, proofs)
}

// Create is a paid mutator transaction binding the contract method 0xd374bc76.
//
// Solidity: function create((address[],address,uint64,uint64) ch, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial) returns(bytes32 channelId)
func (_Custody *CustodyTransactor) Create(opts *bind.TransactOpts, ch Channel, initial State) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "create", ch, initial)
}

// Create is a paid mutator transaction binding the contract method 0xd374bc76.
//
// Solidity: function create((address[],address,uint64,uint64) ch, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial) returns(bytes32 channelId)
func (_Custody *CustodySession) Create(ch Channel, initial State) (*types.Transaction, error) {
	return _Custody.Contract.Create(&_Custody.TransactOpts, ch, initial)
}

// Create is a paid mutator transaction binding the contract method 0xd374bc76.
//
// Solidity: function create((address[],address,uint64,uint64) ch, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial) returns(bytes32 channelId)
func (_Custody *CustodyTransactorSession) Create(ch Channel, initial State) (*types.Transaction, error) {
	return _Custody.Contract.Create(&_Custody.TransactOpts, ch, initial)
}

// Deposit is a paid mutator transaction binding the contract method 0x47e7ef24.
//
// Solidity: function deposit(address token, uint256 amount) payable returns()
func (_Custody *CustodyTransactor) Deposit(opts *bind.TransactOpts, token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "deposit", token, amount)
}

// Deposit is a paid mutator transaction binding the contract method 0x47e7ef24.
//
// Solidity: function deposit(address token, uint256 amount) payable returns()
func (_Custody *CustodySession) Deposit(token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.Contract.Deposit(&_Custody.TransactOpts, token, amount)
}

// Deposit is a paid mutator transaction binding the contract method 0x47e7ef24.
//
// Solidity: function deposit(address token, uint256 amount) payable returns()
func (_Custody *CustodyTransactorSession) Deposit(token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.Contract.Deposit(&_Custody.TransactOpts, token, amount)
}

// Join is a paid mutator transaction binding the contract method 0xa22b823d.
//
// Solidity: function join(bytes32 channelId, uint256 index, (uint8,bytes32,bytes32) sig) returns(bytes32)
func (_Custody *CustodyTransactor) Join(opts *bind.TransactOpts, channelId [32]byte, index *big.Int, sig Signature) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "join", channelId, index, sig)
}

// Join is a paid mutator transaction binding the contract method 0xa22b823d.
//
// Solidity: function join(bytes32 channelId, uint256 index, (uint8,bytes32,bytes32) sig) returns(bytes32)
func (_Custody *CustodySession) Join(channelId [32]byte, index *big.Int, sig Signature) (*types.Transaction, error) {
	return _Custody.Contract.Join(&_Custody.TransactOpts, channelId, index, sig)
}

// Join is a paid mutator transaction binding the contract method 0xa22b823d.
//
// Solidity: function join(bytes32 channelId, uint256 index, (uint8,bytes32,bytes32) sig) returns(bytes32)
func (_Custody *CustodyTransactorSession) Join(channelId [32]byte, index *big.Int, sig Signature) (*types.Transaction, error) {
	return _Custody.Contract.Join(&_Custody.TransactOpts, channelId, index, sig)
}

// Reset is a paid mutator transaction binding the contract method 0xf478513b.
//
// Solidity: function reset(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs, (address[],address,uint64,uint64) newChannel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) newDeposit) returns()
func (_Custody *CustodyTransactor) Reset(opts *bind.TransactOpts, channelId [32]byte, candidate State, proofs []State, newChannel Channel, newDeposit State) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "reset", channelId, candidate, proofs, newChannel, newDeposit)
}

// Reset is a paid mutator transaction binding the contract method 0xf478513b.
//
// Solidity: function reset(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs, (address[],address,uint64,uint64) newChannel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) newDeposit) returns()
func (_Custody *CustodySession) Reset(channelId [32]byte, candidate State, proofs []State, newChannel Channel, newDeposit State) (*types.Transaction, error) {
	return _Custody.Contract.Reset(&_Custody.TransactOpts, channelId, candidate, proofs, newChannel, newDeposit)
}

// Reset is a paid mutator transaction binding the contract method 0xf478513b.
//
// Solidity: function reset(bytes32 channelId, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) candidate, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[])[] proofs, (address[],address,uint64,uint64) newChannel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) newDeposit) returns()
func (_Custody *CustodyTransactorSession) Reset(channelId [32]byte, candidate State, proofs []State, newChannel Channel, newDeposit State) (*types.Transaction, error) {
	return _Custody.Contract.Reset(&_Custody.TransactOpts, channelId, candidate, proofs, newChannel, newDeposit)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address token, uint256 amount) returns()
func (_Custody *CustodyTransactor) Withdraw(opts *bind.TransactOpts, token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.contract.Transact(opts, "withdraw", token, amount)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address token, uint256 amount) returns()
func (_Custody *CustodySession) Withdraw(token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.Contract.Withdraw(&_Custody.TransactOpts, token, amount)
}

// Withdraw is a paid mutator transaction binding the contract method 0xf3fef3a3.
//
// Solidity: function withdraw(address token, uint256 amount) returns()
func (_Custody *CustodyTransactorSession) Withdraw(token common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Custody.Contract.Withdraw(&_Custody.TransactOpts, token, amount)
}

// CustodyChallengedIterator is returned from FilterChallenged and is used to iterate over the raw logs and unpacked data for Challenged events raised by the Custody contract.
type CustodyChallengedIterator struct {
	Event *CustodyChallenged // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyChallengedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyChallenged)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyChallenged)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyChallengedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyChallengedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyChallenged represents a Challenged event raised by the Custody contract.
type CustodyChallenged struct {
	ChannelId  [32]byte
	Expiration *big.Int
	Raw        types.Log // Blockchain specific contextual infos
}

// FilterChallenged is a free log retrieval operation binding the contract event 0x08818bbbf6e59017d5461143d9f1c4e3fb74703f7fb792c207cbeed4b344cefc.
//
// Solidity: event Challenged(bytes32 indexed channelId, uint256 expiration)
func (_Custody *CustodyFilterer) FilterChallenged(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyChallengedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "Challenged", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyChallengedIterator{contract: _Custody.contract, event: "Challenged", logs: logs, sub: sub}, nil
}

// WatchChallenged is a free log subscription operation binding the contract event 0x08818bbbf6e59017d5461143d9f1c4e3fb74703f7fb792c207cbeed4b344cefc.
//
// Solidity: event Challenged(bytes32 indexed channelId, uint256 expiration)
func (_Custody *CustodyFilterer) WatchChallenged(opts *bind.WatchOpts, sink chan<- *CustodyChallenged, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "Challenged", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyChallenged)
				if err := _Custody.contract.UnpackLog(event, "Challenged", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChallenged is a log parse operation binding the contract event 0x08818bbbf6e59017d5461143d9f1c4e3fb74703f7fb792c207cbeed4b344cefc.
//
// Solidity: event Challenged(bytes32 indexed channelId, uint256 expiration)
func (_Custody *CustodyFilterer) ParseChallenged(log types.Log) (*CustodyChallenged, error) {
	event := new(CustodyChallenged)
	if err := _Custody.contract.UnpackLog(event, "Challenged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CustodyChannelClosedIterator is returned from FilterChannelClosed and is used to iterate over the raw logs and unpacked data for ChannelClosed events raised by the Custody contract.
type CustodyChannelClosedIterator struct {
	Event *CustodyChannelClosed // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyChannelClosedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyChannelClosed)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyChannelClosed)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyChannelClosedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyChannelClosedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyChannelClosed represents a ChannelClosed event raised by the Custody contract.
type CustodyChannelClosed struct {
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelClosed is a free log retrieval operation binding the contract event 0xceeab2eef998c17fe96f30f83fbf3c55fc5047f6e40c55a0cf72d236e9d2ba72.
//
// Solidity: event ChannelClosed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) FilterChannelClosed(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyChannelClosedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "ChannelClosed", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyChannelClosedIterator{contract: _Custody.contract, event: "ChannelClosed", logs: logs, sub: sub}, nil
}

// WatchChannelClosed is a free log subscription operation binding the contract event 0xceeab2eef998c17fe96f30f83fbf3c55fc5047f6e40c55a0cf72d236e9d2ba72.
//
// Solidity: event ChannelClosed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) WatchChannelClosed(opts *bind.WatchOpts, sink chan<- *CustodyChannelClosed, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "ChannelClosed", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyChannelClosed)
				if err := _Custody.contract.UnpackLog(event, "ChannelClosed", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelClosed is a log parse operation binding the contract event 0xceeab2eef998c17fe96f30f83fbf3c55fc5047f6e40c55a0cf72d236e9d2ba72.
//
// Solidity: event ChannelClosed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) ParseChannelClosed(log types.Log) (*CustodyChannelClosed, error) {
	event := new(CustodyChannelClosed)
	if err := _Custody.contract.UnpackLog(event, "ChannelClosed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CustodyCheckpointedIterator is returned from FilterCheckpointed and is used to iterate over the raw logs and unpacked data for Checkpointed events raised by the Custody contract.
type CustodyCheckpointedIterator struct {
	Event *CustodyCheckpointed // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyCheckpointedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyCheckpointed)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyCheckpointed)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyCheckpointedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyCheckpointedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyCheckpointed represents a Checkpointed event raised by the Custody contract.
type CustodyCheckpointed struct {
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterCheckpointed is a free log retrieval operation binding the contract event 0x1f681d6befe6e92b986338164917aaa3f065b8d2de29bb520aa373114e5ec034.
//
// Solidity: event Checkpointed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) FilterCheckpointed(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyCheckpointedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "Checkpointed", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyCheckpointedIterator{contract: _Custody.contract, event: "Checkpointed", logs: logs, sub: sub}, nil
}

// WatchCheckpointed is a free log subscription operation binding the contract event 0x1f681d6befe6e92b986338164917aaa3f065b8d2de29bb520aa373114e5ec034.
//
// Solidity: event Checkpointed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) WatchCheckpointed(opts *bind.WatchOpts, sink chan<- *CustodyCheckpointed, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "Checkpointed", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyCheckpointed)
				if err := _Custody.contract.UnpackLog(event, "Checkpointed", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseCheckpointed is a log parse operation binding the contract event 0x1f681d6befe6e92b986338164917aaa3f065b8d2de29bb520aa373114e5ec034.
//
// Solidity: event Checkpointed(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) ParseCheckpointed(log types.Log) (*CustodyCheckpointed, error) {
	event := new(CustodyCheckpointed)
	if err := _Custody.contract.UnpackLog(event, "Checkpointed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CustodyCreatedIterator is returned from FilterCreated and is used to iterate over the raw logs and unpacked data for Created events raised by the Custody contract.
type CustodyCreatedIterator struct {
	Event *CustodyCreated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyCreated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyCreated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyCreated represents a Created event raised by the Custody contract.
type CustodyCreated struct {
	ChannelId [32]byte
	Channel   Channel
	Initial   State
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterCreated is a free log retrieval operation binding the contract event 0x9cf47bec6921029dd28de10cd49d84ea4f8ff5520f34e71399741090651b0cc6.
//
// Solidity: event Created(bytes32 indexed channelId, (address[],address,uint64,uint64) channel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial)
func (_Custody *CustodyFilterer) FilterCreated(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyCreatedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "Created", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyCreatedIterator{contract: _Custody.contract, event: "Created", logs: logs, sub: sub}, nil
}

// WatchCreated is a free log subscription operation binding the contract event 0x9cf47bec6921029dd28de10cd49d84ea4f8ff5520f34e71399741090651b0cc6.
//
// Solidity: event Created(bytes32 indexed channelId, (address[],address,uint64,uint64) channel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial)
func (_Custody *CustodyFilterer) WatchCreated(opts *bind.WatchOpts, sink chan<- *CustodyCreated, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "Created", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyCreated)
				if err := _Custody.contract.UnpackLog(event, "Created", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseCreated is a log parse operation binding the contract event 0x9cf47bec6921029dd28de10cd49d84ea4f8ff5520f34e71399741090651b0cc6.
//
// Solidity: event Created(bytes32 indexed channelId, (address[],address,uint64,uint64) channel, (bytes,(address,address,uint256)[],(uint8,bytes32,bytes32)[]) initial)
func (_Custody *CustodyFilterer) ParseCreated(log types.Log) (*CustodyCreated, error) {
	event := new(CustodyCreated)
	if err := _Custody.contract.UnpackLog(event, "Created", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CustodyJoinedIterator is returned from FilterJoined and is used to iterate over the raw logs and unpacked data for Joined events raised by the Custody contract.
type CustodyJoinedIterator struct {
	Event *CustodyJoined // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyJoinedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyJoined)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyJoined)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyJoinedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyJoinedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyJoined represents a Joined event raised by the Custody contract.
type CustodyJoined struct {
	ChannelId [32]byte
	Index     *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterJoined is a free log retrieval operation binding the contract event 0xe8e915db7b3549b9e9e9b3e2ec2dc3edd1f76961504366998824836401f6846a.
//
// Solidity: event Joined(bytes32 indexed channelId, uint256 index)
func (_Custody *CustodyFilterer) FilterJoined(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyJoinedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "Joined", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyJoinedIterator{contract: _Custody.contract, event: "Joined", logs: logs, sub: sub}, nil
}

// WatchJoined is a free log subscription operation binding the contract event 0xe8e915db7b3549b9e9e9b3e2ec2dc3edd1f76961504366998824836401f6846a.
//
// Solidity: event Joined(bytes32 indexed channelId, uint256 index)
func (_Custody *CustodyFilterer) WatchJoined(opts *bind.WatchOpts, sink chan<- *CustodyJoined, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "Joined", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyJoined)
				if err := _Custody.contract.UnpackLog(event, "Joined", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseJoined is a log parse operation binding the contract event 0xe8e915db7b3549b9e9e9b3e2ec2dc3edd1f76961504366998824836401f6846a.
//
// Solidity: event Joined(bytes32 indexed channelId, uint256 index)
func (_Custody *CustodyFilterer) ParseJoined(log types.Log) (*CustodyJoined, error) {
	event := new(CustodyJoined)
	if err := _Custody.contract.UnpackLog(event, "Joined", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// CustodyOpenedIterator is returned from FilterOpened and is used to iterate over the raw logs and unpacked data for Opened events raised by the Custody contract.
type CustodyOpenedIterator struct {
	Event *CustodyOpened // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *CustodyOpenedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(CustodyOpened)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(CustodyOpened)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *CustodyOpenedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *CustodyOpenedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// CustodyOpened represents a Opened event raised by the Custody contract.
type CustodyOpened struct {
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterOpened is a free log retrieval operation binding the contract event 0xd087f17acc177540af5f382bc30c65363705b90855144d285a822536ee11fdd1.
//
// Solidity: event Opened(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) FilterOpened(opts *bind.FilterOpts, channelId [][32]byte) (*CustodyOpenedIterator, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.FilterLogs(opts, "Opened", channelIdRule)
	if err != nil {
		return nil, err
	}
	return &CustodyOpenedIterator{contract: _Custody.contract, event: "Opened", logs: logs, sub: sub}, nil
}

// WatchOpened is a free log subscription operation binding the contract event 0xd087f17acc177540af5f382bc30c65363705b90855144d285a822536ee11fdd1.
//
// Solidity: event Opened(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) WatchOpened(opts *bind.WatchOpts, sink chan<- *CustodyOpened, channelId [][32]byte) (event.Subscription, error) {

	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Custody.contract.WatchLogs(opts, "Opened", channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(CustodyOpened)
				if err := _Custody.contract.UnpackLog(event, "Opened", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseOpened is a log parse operation binding the contract event 0xd087f17acc177540af5f382bc30c65363705b90855144d285a822536ee11fdd1.
//
// Solidity: event Opened(bytes32 indexed channelId)
func (_Custody *CustodyFilterer) ParseOpened(log types.Log) (*CustodyOpened, error) {
	event := new(CustodyOpened)
	if err := _Custody.contract.UnpackLog(event, "Opened", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}