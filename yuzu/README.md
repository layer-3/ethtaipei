## Foundry

## Address
<https://etherscan.io/address/0xe69a5ae114e12d02dbc995d383a258ce162151da#code>
<https://basescan.org/token/0xe69a5ae114e12d02dbc995d383a258ce162151da#code>
<https://polygonscan.com/address/0xe69A5AE114e12D02dBc995d383a258ce162151dA>
<https://worldscan.org/address/0xe69a5ae114e12d02dbc995d383a258ce162151da>

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

<https://book.getfoundry.sh/>

## Usage

### Build

```shell
forge build
```

### Test

```shell
forge test
```

### Format

```shell
forge fmt
```

### Gas Snapshots

```shell
forge snapshot
```

### Anvil

```shell
anvil
```

### Deploy

```shell
forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
cast <subcommand>
```

### Help

```shell
forge --help
anvil --help
cast --help
```
