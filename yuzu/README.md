# Bonding Curve Distributor Smart Contract

## Address

<https://etherscan.io/address/0xe69a5ae114e12d02dbc995d383a258ce162151da#code>
<https://basescan.org/token/0xe69a5ae114e12d02dbc995d383a258ce162151da#code>
<https://polygonscan.com/address/0xe69A5AE114e12D02dBc995d383a258ce162151dA>
<https://worldscan.org/address/0xe69a5ae114e12d02dbc995d383a258ce162151da>

## Overview

This smart contract implements a generic ERC20 token distributor using a linear bonding curve mechanism. It allows a project owner to sell a predefined supply of a `baseToken` in exchange for a `quoteToken`. The price of the `baseToken` (in terms of the `quoteToken`) starts low and increases linearly as the supply held by the contract decreases, reaching a configurable target price when the contract's `baseToken` treasury is depleted.

The contract includes features like a scheduled sale start time, per-wallet purchase limits (defined in the `quoteToken`), and a cooldown period between purchases for each wallet. It is built using Solidity `^0.8.20` and leverages OpenZeppelin contracts for security best practices (`Ownable`, `SafeERC20`, `Math`).

## Features

* **Generic ERC20 Support:** Works with any standard ERC20 tokens for both the token being sold (`baseToken`) and the payment token (`quoteToken`).
* **Linear Bonding Curve:** Price dynamically adjusts based on remaining supply (`P(S) = P_target * (1 - S / I)`).
* **Configurable Target Price:** The final price (Quote/Base) reached when the treasury is empty is set during deployment.
* **Scheduled Sale Start:** Sales can only begin after a specific timestamp set by the owner.
* **Purchase Limit:** Limits the maximum amount of `quoteToken` a user can spend in a single `order` transaction.
* **Purchase Cooldown:** Enforces a 24-hour cooldown period per wallet between purchases.
* **Owner Controlled Setup:** A dedicated `start()` function for the owner to initialize the sale parameters after deployment and funding.
* **Price Quoting:** A `quote()` function allows users and frontends to estimate the `baseToken` amount received for a given `quoteToken` amount without executing a purchase.
* **Secure:** Utilizes OpenZeppelin's `Ownable` for access control, `SafeERC20` for safe token transfers, and includes basic reentrancy protection via the Checks-Effects-Interactions pattern.

## Prerequisites

* Foundry
* Solidity Compiler: `^0.8.20`
* OpenZeppelin Contracts library (`@openzeppelin/contracts`)

## Installation (Example using Hardhat/Foundry)

```bash
# Using npm (Hardhat)
npm install @openzeppelin/contracts

# Using forge (Foundry)
forge install OpenZeppelin/openzeppelin-contracts
```

## Configuration (Constructor Parameters)

The contract requires the following parameters upon deployment:

1. `address _baseTokenAddress`: The contract address of the ERC20 token being sold.
2. `address _quoteTokenAddress`: The contract address of the ERC20 token used for payment.
3. `uint256 _targetPriceNumerator`: The numerator for the target price (Quote / Base).
4. `uint256 _targetPriceDenominator`: The denominator for the target price (Quote / Base).
    * *Example:* For a target price of 1.5 QuoteToken per BaseToken, use Numerator=3, Denominator=2.
5. `uint256 _maxPurchaseQuoteWei`: The maximum amount of `quoteToken` (in its smallest unit, wei) allowed per `order` transaction.

## Usage Workflow

1. **Deploy:** Deploy the `BondingCurveDistributor.sol` contract providing the constructor arguments.
2. **Fund:** The deployer (owner) transfers the **entire initial supply** of the `baseToken` intended for sale to the deployed contract address.
3. **Schedule Sale:** The owner calls the `start(uint256 _startTime)` function, providing a future Unix timestamp (`_startTime`) when the sale should commence. This action also reads the contract's current `baseToken` balance and sets it as the `initialBaseSupply` for the bonding curve calculation.
4. **Approve (Users):** Before purchasing, users must approve the deployed `BondingCurveDistributor` contract address to spend their `quoteToken` via the `quoteToken`'s `approve()` function. The approval amount should be sufficient for their intended purchase(s).
5. **Purchase (Users):** After the `saleStartTime` has passed, users can call the `order(uint256 amount)` function, specifying the `amount` of `quoteToken` (in wei) they wish to spend. The contract calculates the corresponding `baseToken` amount based on the bonding curve, checks limits/cooldowns, transfers the tokens, and updates the user's cooldown timer.
6. **Estimate Price (Anyone):** Anyone can call the `quote(uint256 amount)` function at any time *after* `start()` has been called to get an estimate of how many `baseTokens` would be received for spending a specific `amount` of `quoteTokens`.

## Core Logic: Bonding Curve Pricing

The contract uses a linear bonding curve where the instantaneous price `P` (Quote units per Base unit) depends on the current remaining supply `S` and the initial supply `I`:

`P(S) = P_target * (1 - S / I)`

Where `P_target` is the configured target price reached when `S = 0`.

When a user calls `order(quoteAmount)`, the contract doesn't just use the instantaneous price. It calculates the *integral* of the price function over the range of supply being bought. This ensures fair pricing even for larger orders that significantly deplete the supply. The calculation involves solving a quadratic equation derived from this integral to find the exact `baseAmount` corresponding to the `quoteAmount` provided. This calculation happens within the internal `_calculateBaseAmount` function, utilizing scaled fixed-point arithmetic for precision.

## Functions (External Interface)

*(See `IBondingCurveDistributor.sol` for the full interface)*

* **`start(uint256 startTime)`**
  * Sets the sale start time and records the initial base token supply.
  * Access: `onlyOwner`.
  * Requirements: Must be called after deployment and funding, `startTime` must be in the future, can only be called once.
  * Emits: `SaleScheduled(startTime, initialBaseSupply)`
* **`order(uint256 amount)`**
  * Allows users to buy `baseToken` by spending `quoteToken` (`amount` is quote token wei).
  * Access: Public.
  * Requirements: Sale must be configured (`start()` called), `block.timestamp >= saleStartTime`, user must have approved sufficient `quoteToken` allowance, `amount` must be positive and `<= maxPurchaseQuoteWei`, user must not be in cooldown period.
  * Emits: `TokensPurchased(buyer, quoteAmount, baseAmount)`
* **`quote(uint256 amount)`** (`view`)
  * Estimates the `baseAmount` received for a given `quoteAmount` (quote token wei).
  * Access: Public.
  * Requirements: Sale must be configured (`start()` called).
  * Returns: `uint256 baseAmount` (estimated base token wei).

## Events

* **`SaleScheduled(uint256 startTime, uint256 initialBaseSupply)`**: Emitted when the owner successfully calls `start()`.
* **`TokensPurchased(address indexed buyer, uint256 quoteAmount, uint256 baseAmount)`**: Emitted upon a successful purchase via `order()`.

## Security Considerations

* **Owner Privileges:** The owner role is critical. They initiate the sale via `start()`. If the owner key is compromised, the sale start could be manipulated (though the core parameters are set at construction). Use a secure owner address (e.g., a multisig).
* **Token Approvals:** Users interact with standard ERC20 `approve`. Phishing risks related to approvals exist outside this contract's scope.
* **Precision:** The contract uses scaled fixed-point arithmetic (`targetPriceX1e18`, `PRICE_PRECISION`) and `Math.sqrt` for calculations. While robust, extreme values or tokens with >18 decimals (base token) could potentially encounter precision limits (base decimals > 18 disallowed by constructor).
* **Gas Costs:** The `order` function involves storage reads/writes (cooldown), token transfers, and the relatively complex `_calculateBaseAmount` function (including `sqrt`). Gas costs may be non-trivial, especially during high network congestion.
* **Reentrancy:** The contract follows the Checks-Effects-Interactions pattern (e.g., `lastPurchaseTime` updated before external calls `safeTransferFrom`/`safeTransfer`) to mitigate reentrancy risks.
* **Oracle Dependency:** This contract relies *only* on its internal state and formula for pricing. It does *not* use external price oracles.
* **Audit:** This code has **not** been professionally audited. Use in production at your own risk. A professional audit is highly recommended before deploying significant value.

## Development & Testing

*(Placeholder - Add instructions specific to your development environment)*

```bash
forge build

# Example: Run tests (Foundry)
forge test
```

## License

This contract is licensed under the MIT License. See the `LICENSE` file for details. (Assumes MIT based on standard practice, confirm SPDX identifier in the `.sol` file).
