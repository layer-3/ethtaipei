# TestEvenEmitter Contract

This directory provides a minimal Solidity contract (TestEvenEmitter.sol) and its generated
Go bindings (TestEvenEmitter.go). The contract includes several functions that emit different events.

## How to Re-generate Bindings

1. Compile the contract (using Foundry, solc, or another workflow) to produce
   TestEventEmitter.abi and TestEventEmitter.bin. For example:

   `solc --abi --bin TestEventEmitter.sol -o build/`
   or using forge

   ```bash
   forge compile --evm-version=paris --root=. TestEventEmitter.sol
   jq -r '.bytecode.object' out/TestEventEmitter.sol/TestEventEmitter.json > TestEventEmitter.bin
   jq -r '.abi' out/TestEventEmitter.sol/TestEventEmitter.json > TestEventEmitter.abi
   ```

   > NOTE: use solc version <= 0.8.19, as simulated backend have issues with supporting Shanghai changes (made in 0.8.20)

2. Run abigen to create the Go bindings:

```bash
   abigen --bin build/TestEventEmitter.bin \
          --abi build/TestEventEmitter.abi \
          --pkg solmock \
          --type TestEventEmitter \
          --out test_event_emitter.go
```

This will produce test_event_emitter.go in the current folder, containing typed methods for
deploying or calling the TestEventEmitter contract, as well as decoding events.

## Usage

After generating test_event_emitter.go, you can:
• Deploy the contract in tests using DeployTestEventEmitter(...)
• Call triggerEvent(...) functions to emit the EventA, EventB, EventC, EventD events
• Filter or watch logs representing those events

Refer to tracker_test.go for an example of how to deploy and interact with TestEventEmitter in
a simulated Ethereum backend.
