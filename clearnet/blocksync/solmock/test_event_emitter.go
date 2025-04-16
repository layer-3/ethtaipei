// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package solmock

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

// TestEventEmitterMetaData contains all meta data concerning the TestEventEmitter contract.
var TestEventEmitterMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"EventA\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"EventB\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"EventC\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"EventD\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"triggerEventA\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"triggerEventB\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"triggerEventC\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"triggerEventD\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
	Bin: "0x608060405234801561001057600080fd5b506101c3806100206000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80636e531f95146100515780639998d3f11461005b578063a12a00dd14610065578063c47bc4d61461006f575b600080fd5b610059610079565b005b6100636100be565b005b61006d610103565b005b610077610148565b005b3373ffffffffffffffffffffffffffffffffffffffff167f2ac336d316802d0304655a180985d4209070c7f956d5b633300f0ab28cc89e1260405160405180910390a2565b3373ffffffffffffffffffffffffffffffffffffffff167f2c0002f4c21939aa5cdc8b48ec9fcf8de5503d963e62c967ac9fe6b55d547d8260405160405180910390a2565b3373ffffffffffffffffffffffffffffffffffffffff167fb09b4cce9a6aa343be3615d1e9c454692069c380bccb0eec7f977975369337fb60405160405180910390a2565b3373ffffffffffffffffffffffffffffffffffffffff167f5145a195e6ffe20888500a7eb3f0467b75a1ae8770c0d7e6b124cbc83c15b18b60405160405180910390a256fea2646970667358221220990b64a1a3b9bf32734cc5139580b00df97fe3b29f07c7f847bc3ee15e84d9b364736f6c63430008130033",
}

// TestEventEmitterABI is the input ABI used to generate the binding from.
// Deprecated: Use TestEventEmitterMetaData.ABI instead.
var TestEventEmitterABI = TestEventEmitterMetaData.ABI

// TestEventEmitterBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use TestEventEmitterMetaData.Bin instead.
var TestEventEmitterBin = TestEventEmitterMetaData.Bin

// DeployTestEventEmitter deploys a new Ethereum contract, binding an instance of TestEventEmitter to it.
func DeployTestEventEmitter(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *TestEventEmitter, error) {
	parsed, err := TestEventEmitterMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(TestEventEmitterBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &TestEventEmitter{TestEventEmitterCaller: TestEventEmitterCaller{contract: contract}, TestEventEmitterTransactor: TestEventEmitterTransactor{contract: contract}, TestEventEmitterFilterer: TestEventEmitterFilterer{contract: contract}}, nil
}

// TestEventEmitter is an auto generated Go binding around an Ethereum contract.
type TestEventEmitter struct {
	TestEventEmitterCaller     // Read-only binding to the contract
	TestEventEmitterTransactor // Write-only binding to the contract
	TestEventEmitterFilterer   // Log filterer for contract events
}

// TestEventEmitterCaller is an auto generated read-only Go binding around an Ethereum contract.
type TestEventEmitterCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TestEventEmitterTransactor is an auto generated write-only Go binding around an Ethereum contract.
type TestEventEmitterTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TestEventEmitterFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type TestEventEmitterFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// TestEventEmitterSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type TestEventEmitterSession struct {
	Contract     *TestEventEmitter // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// TestEventEmitterCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type TestEventEmitterCallerSession struct {
	Contract *TestEventEmitterCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts           // Call options to use throughout this session
}

// TestEventEmitterTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type TestEventEmitterTransactorSession struct {
	Contract     *TestEventEmitterTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// TestEventEmitterRaw is an auto generated low-level Go binding around an Ethereum contract.
type TestEventEmitterRaw struct {
	Contract *TestEventEmitter // Generic contract binding to access the raw methods on
}

// TestEventEmitterCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type TestEventEmitterCallerRaw struct {
	Contract *TestEventEmitterCaller // Generic read-only contract binding to access the raw methods on
}

// TestEventEmitterTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type TestEventEmitterTransactorRaw struct {
	Contract *TestEventEmitterTransactor // Generic write-only contract binding to access the raw methods on
}

// NewTestEventEmitter creates a new instance of TestEventEmitter, bound to a specific deployed contract.
func NewTestEventEmitter(address common.Address, backend bind.ContractBackend) (*TestEventEmitter, error) {
	contract, err := bindTestEventEmitter(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitter{TestEventEmitterCaller: TestEventEmitterCaller{contract: contract}, TestEventEmitterTransactor: TestEventEmitterTransactor{contract: contract}, TestEventEmitterFilterer: TestEventEmitterFilterer{contract: contract}}, nil
}

// NewTestEventEmitterCaller creates a new read-only instance of TestEventEmitter, bound to a specific deployed contract.
func NewTestEventEmitterCaller(address common.Address, caller bind.ContractCaller) (*TestEventEmitterCaller, error) {
	contract, err := bindTestEventEmitter(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterCaller{contract: contract}, nil
}

// NewTestEventEmitterTransactor creates a new write-only instance of TestEventEmitter, bound to a specific deployed contract.
func NewTestEventEmitterTransactor(address common.Address, transactor bind.ContractTransactor) (*TestEventEmitterTransactor, error) {
	contract, err := bindTestEventEmitter(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterTransactor{contract: contract}, nil
}

// NewTestEventEmitterFilterer creates a new log filterer instance of TestEventEmitter, bound to a specific deployed contract.
func NewTestEventEmitterFilterer(address common.Address, filterer bind.ContractFilterer) (*TestEventEmitterFilterer, error) {
	contract, err := bindTestEventEmitter(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterFilterer{contract: contract}, nil
}

// bindTestEventEmitter binds a generic wrapper to an already deployed contract.
func bindTestEventEmitter(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(TestEventEmitterABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TestEventEmitter *TestEventEmitterRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TestEventEmitter.Contract.TestEventEmitterCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TestEventEmitter *TestEventEmitterRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TestEventEmitterTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TestEventEmitter *TestEventEmitterRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TestEventEmitterTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_TestEventEmitter *TestEventEmitterCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _TestEventEmitter.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_TestEventEmitter *TestEventEmitterTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_TestEventEmitter *TestEventEmitterTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _TestEventEmitter.Contract.contract.Transact(opts, method, params...)
}

// TriggerEventA is a paid mutator transaction binding the contract method 0x9998d3f1.
//
// Solidity: function triggerEventA() returns()
func (_TestEventEmitter *TestEventEmitterTransactor) TriggerEventA(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.contract.Transact(opts, "triggerEventA")
}

// TriggerEventA is a paid mutator transaction binding the contract method 0x9998d3f1.
//
// Solidity: function triggerEventA() returns()
func (_TestEventEmitter *TestEventEmitterSession) TriggerEventA() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventA(&_TestEventEmitter.TransactOpts)
}

// TriggerEventA is a paid mutator transaction binding the contract method 0x9998d3f1.
//
// Solidity: function triggerEventA() returns()
func (_TestEventEmitter *TestEventEmitterTransactorSession) TriggerEventA() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventA(&_TestEventEmitter.TransactOpts)
}

// TriggerEventB is a paid mutator transaction binding the contract method 0x6e531f95.
//
// Solidity: function triggerEventB() returns()
func (_TestEventEmitter *TestEventEmitterTransactor) TriggerEventB(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.contract.Transact(opts, "triggerEventB")
}

// TriggerEventB is a paid mutator transaction binding the contract method 0x6e531f95.
//
// Solidity: function triggerEventB() returns()
func (_TestEventEmitter *TestEventEmitterSession) TriggerEventB() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventB(&_TestEventEmitter.TransactOpts)
}

// TriggerEventB is a paid mutator transaction binding the contract method 0x6e531f95.
//
// Solidity: function triggerEventB() returns()
func (_TestEventEmitter *TestEventEmitterTransactorSession) TriggerEventB() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventB(&_TestEventEmitter.TransactOpts)
}

// TriggerEventC is a paid mutator transaction binding the contract method 0xc47bc4d6.
//
// Solidity: function triggerEventC() returns()
func (_TestEventEmitter *TestEventEmitterTransactor) TriggerEventC(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.contract.Transact(opts, "triggerEventC")
}

// TriggerEventC is a paid mutator transaction binding the contract method 0xc47bc4d6.
//
// Solidity: function triggerEventC() returns()
func (_TestEventEmitter *TestEventEmitterSession) TriggerEventC() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventC(&_TestEventEmitter.TransactOpts)
}

// TriggerEventC is a paid mutator transaction binding the contract method 0xc47bc4d6.
//
// Solidity: function triggerEventC() returns()
func (_TestEventEmitter *TestEventEmitterTransactorSession) TriggerEventC() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventC(&_TestEventEmitter.TransactOpts)
}

// TriggerEventD is a paid mutator transaction binding the contract method 0xa12a00dd.
//
// Solidity: function triggerEventD() returns()
func (_TestEventEmitter *TestEventEmitterTransactor) TriggerEventD(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _TestEventEmitter.contract.Transact(opts, "triggerEventD")
}

// TriggerEventD is a paid mutator transaction binding the contract method 0xa12a00dd.
//
// Solidity: function triggerEventD() returns()
func (_TestEventEmitter *TestEventEmitterSession) TriggerEventD() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventD(&_TestEventEmitter.TransactOpts)
}

// TriggerEventD is a paid mutator transaction binding the contract method 0xa12a00dd.
//
// Solidity: function triggerEventD() returns()
func (_TestEventEmitter *TestEventEmitterTransactorSession) TriggerEventD() (*types.Transaction, error) {
	return _TestEventEmitter.Contract.TriggerEventD(&_TestEventEmitter.TransactOpts)
}

// TestEventEmitterEventAIterator is returned from FilterEventA and is used to iterate over the raw logs and unpacked data for EventA events raised by the TestEventEmitter contract.
type TestEventEmitterEventAIterator struct {
	Event *TestEventEmitterEventA // Event containing the contract specifics and raw log

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
func (it *TestEventEmitterEventAIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TestEventEmitterEventA)
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
		it.Event = new(TestEventEmitterEventA)
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
func (it *TestEventEmitterEventAIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TestEventEmitterEventAIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TestEventEmitterEventA represents a EventA event raised by the TestEventEmitter contract.
type TestEventEmitterEventA struct {
	Sender common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEventA is a free log retrieval operation binding the contract event 0x2c0002f4c21939aa5cdc8b48ec9fcf8de5503d963e62c967ac9fe6b55d547d82.
//
// Solidity: event EventA(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) FilterEventA(opts *bind.FilterOpts, sender []common.Address) (*TestEventEmitterEventAIterator, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.FilterLogs(opts, "EventA", senderRule)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterEventAIterator{contract: _TestEventEmitter.contract, event: "EventA", logs: logs, sub: sub}, nil
}

// WatchEventA is a free log subscription operation binding the contract event 0x2c0002f4c21939aa5cdc8b48ec9fcf8de5503d963e62c967ac9fe6b55d547d82.
//
// Solidity: event EventA(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) WatchEventA(opts *bind.WatchOpts, sink chan<- *TestEventEmitterEventA, sender []common.Address) (event.Subscription, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.WatchLogs(opts, "EventA", senderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TestEventEmitterEventA)
				if err := _TestEventEmitter.contract.UnpackLog(event, "EventA", log); err != nil {
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

// ParseEventA is a log parse operation binding the contract event 0x2c0002f4c21939aa5cdc8b48ec9fcf8de5503d963e62c967ac9fe6b55d547d82.
//
// Solidity: event EventA(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) ParseEventA(log types.Log) (*TestEventEmitterEventA, error) {
	event := new(TestEventEmitterEventA)
	if err := _TestEventEmitter.contract.UnpackLog(event, "EventA", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TestEventEmitterEventBIterator is returned from FilterEventB and is used to iterate over the raw logs and unpacked data for EventB events raised by the TestEventEmitter contract.
type TestEventEmitterEventBIterator struct {
	Event *TestEventEmitterEventB // Event containing the contract specifics and raw log

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
func (it *TestEventEmitterEventBIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TestEventEmitterEventB)
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
		it.Event = new(TestEventEmitterEventB)
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
func (it *TestEventEmitterEventBIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TestEventEmitterEventBIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TestEventEmitterEventB represents a EventB event raised by the TestEventEmitter contract.
type TestEventEmitterEventB struct {
	Sender common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEventB is a free log retrieval operation binding the contract event 0x2ac336d316802d0304655a180985d4209070c7f956d5b633300f0ab28cc89e12.
//
// Solidity: event EventB(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) FilterEventB(opts *bind.FilterOpts, sender []common.Address) (*TestEventEmitterEventBIterator, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.FilterLogs(opts, "EventB", senderRule)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterEventBIterator{contract: _TestEventEmitter.contract, event: "EventB", logs: logs, sub: sub}, nil
}

// WatchEventB is a free log subscription operation binding the contract event 0x2ac336d316802d0304655a180985d4209070c7f956d5b633300f0ab28cc89e12.
//
// Solidity: event EventB(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) WatchEventB(opts *bind.WatchOpts, sink chan<- *TestEventEmitterEventB, sender []common.Address) (event.Subscription, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.WatchLogs(opts, "EventB", senderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TestEventEmitterEventB)
				if err := _TestEventEmitter.contract.UnpackLog(event, "EventB", log); err != nil {
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

// ParseEventB is a log parse operation binding the contract event 0x2ac336d316802d0304655a180985d4209070c7f956d5b633300f0ab28cc89e12.
//
// Solidity: event EventB(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) ParseEventB(log types.Log) (*TestEventEmitterEventB, error) {
	event := new(TestEventEmitterEventB)
	if err := _TestEventEmitter.contract.UnpackLog(event, "EventB", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TestEventEmitterEventCIterator is returned from FilterEventC and is used to iterate over the raw logs and unpacked data for EventC events raised by the TestEventEmitter contract.
type TestEventEmitterEventCIterator struct {
	Event *TestEventEmitterEventC // Event containing the contract specifics and raw log

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
func (it *TestEventEmitterEventCIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TestEventEmitterEventC)
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
		it.Event = new(TestEventEmitterEventC)
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
func (it *TestEventEmitterEventCIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TestEventEmitterEventCIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TestEventEmitterEventC represents a EventC event raised by the TestEventEmitter contract.
type TestEventEmitterEventC struct {
	Sender common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEventC is a free log retrieval operation binding the contract event 0x5145a195e6ffe20888500a7eb3f0467b75a1ae8770c0d7e6b124cbc83c15b18b.
//
// Solidity: event EventC(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) FilterEventC(opts *bind.FilterOpts, sender []common.Address) (*TestEventEmitterEventCIterator, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.FilterLogs(opts, "EventC", senderRule)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterEventCIterator{contract: _TestEventEmitter.contract, event: "EventC", logs: logs, sub: sub}, nil
}

// WatchEventC is a free log subscription operation binding the contract event 0x5145a195e6ffe20888500a7eb3f0467b75a1ae8770c0d7e6b124cbc83c15b18b.
//
// Solidity: event EventC(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) WatchEventC(opts *bind.WatchOpts, sink chan<- *TestEventEmitterEventC, sender []common.Address) (event.Subscription, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.WatchLogs(opts, "EventC", senderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TestEventEmitterEventC)
				if err := _TestEventEmitter.contract.UnpackLog(event, "EventC", log); err != nil {
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

// ParseEventC is a log parse operation binding the contract event 0x5145a195e6ffe20888500a7eb3f0467b75a1ae8770c0d7e6b124cbc83c15b18b.
//
// Solidity: event EventC(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) ParseEventC(log types.Log) (*TestEventEmitterEventC, error) {
	event := new(TestEventEmitterEventC)
	if err := _TestEventEmitter.contract.UnpackLog(event, "EventC", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// TestEventEmitterEventDIterator is returned from FilterEventD and is used to iterate over the raw logs and unpacked data for EventD events raised by the TestEventEmitter contract.
type TestEventEmitterEventDIterator struct {
	Event *TestEventEmitterEventD // Event containing the contract specifics and raw log

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
func (it *TestEventEmitterEventDIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(TestEventEmitterEventD)
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
		it.Event = new(TestEventEmitterEventD)
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
func (it *TestEventEmitterEventDIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *TestEventEmitterEventDIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// TestEventEmitterEventD represents a EventD event raised by the TestEventEmitter contract.
type TestEventEmitterEventD struct {
	Sender common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEventD is a free log retrieval operation binding the contract event 0xb09b4cce9a6aa343be3615d1e9c454692069c380bccb0eec7f977975369337fb.
//
// Solidity: event EventD(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) FilterEventD(opts *bind.FilterOpts, sender []common.Address) (*TestEventEmitterEventDIterator, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.FilterLogs(opts, "EventD", senderRule)
	if err != nil {
		return nil, err
	}
	return &TestEventEmitterEventDIterator{contract: _TestEventEmitter.contract, event: "EventD", logs: logs, sub: sub}, nil
}

// WatchEventD is a free log subscription operation binding the contract event 0xb09b4cce9a6aa343be3615d1e9c454692069c380bccb0eec7f977975369337fb.
//
// Solidity: event EventD(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) WatchEventD(opts *bind.WatchOpts, sink chan<- *TestEventEmitterEventD, sender []common.Address) (event.Subscription, error) {

	var senderRule []interface{}
	for _, senderItem := range sender {
		senderRule = append(senderRule, senderItem)
	}

	logs, sub, err := _TestEventEmitter.contract.WatchLogs(opts, "EventD", senderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(TestEventEmitterEventD)
				if err := _TestEventEmitter.contract.UnpackLog(event, "EventD", log); err != nil {
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

// ParseEventD is a log parse operation binding the contract event 0xb09b4cce9a6aa343be3615d1e9c454692069c380bccb0eec7f977975369337fb.
//
// Solidity: event EventD(address indexed sender)
func (_TestEventEmitter *TestEventEmitterFilterer) ParseEventD(log types.Log) (*TestEventEmitterEventD, error) {
	event := new(TestEventEmitterEventD)
	if err := _TestEventEmitter.contract.UnpackLog(event, "EventD", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
