// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IDistributor.sol"; // Use the updated generic interface file

/**
 * @title BondingCurveDistributor
 * @notice Distributes a base ERC20 token in exchange for a quote ERC20 token using a bonding curve.
 * The price (quote/base) increases linearly as the base token supply decreases, reaching
 * a target price when the treasury is empty. Starts sales at a configured time.
 * Implements a purchase limit (in quote tokens) per user per cooldown period.
 * @dev Current time based on block.timestamp. Ensure Taiwan time zone context is handled off-chain if needed.
 */
contract LinearDistributor is IDistributor, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // --- Token Configuration ---
    IERC20 public immutable baseToken; // Token being sold
    IERC20 public immutable quoteToken; // Token used for payment
    uint8 public immutable baseDecimals;
    uint8 public immutable quoteDecimals;

    // --- Bonding Curve Parameters ---
    // Target price: Price when treasury is empty (Quote Token wei per Base Token wei)
    // Scaled by 1e18 for precision in calculations
    uint256 public immutable targetPriceX1e18;
    uint256 private constant PRICE_PRECISION = 1e18;

    // --- Sale State ---
    uint256 public initialBaseSupply; // Initial supply of base tokens for sale
    uint256 public saleStartTime; // Unix timestamp when sale begins
    bool public saleConfigured; // Flag indicating if start() has been called

    // --- Purchase Limits ---
    uint256 public immutable maxPurchaseQuoteWei; // Max quote token spend per order
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    mapping(address => uint256) public lastPurchaseTime;

    // --- Events ---
    event SaleScheduled(uint256 startTime, uint256 initialBaseSupply);
    event TokensPurchased(address indexed buyer, uint256 quoteAmount, uint256 baseAmount);

    /**
     * @notice Constructor
     * @param _baseTokenAddress Address of the base ERC20 token (token to sell).
     * @param _quoteTokenAddress Address of the quote ERC20 token (payment token).
     * @param _targetPriceNumerator Target price numerator (quote/base).
     * @param _targetPriceDenominator Target price denominator (quote/base).
     * @param _maxPurchaseQuoteWei Maximum amount of quote tokens (in wei) allowed per purchase.
     */
    constructor(
        address _baseTokenAddress,
        address _quoteTokenAddress,
        uint256 _targetPriceNumerator,
        uint256 _targetPriceDenominator,
        uint256 _maxPurchaseQuoteWei // Generic limit in quote token wei
    ) Ownable(msg.sender) {
        require(_baseTokenAddress != address(0), "Distributor: Invalid base token address");
        require(_quoteTokenAddress != address(0), "Distributor: Invalid quote token address");
        require(_targetPriceDenominator != 0, "Distributor: Denominator cannot be zero");
        require(_maxPurchaseQuoteWei > 0, "Distributor: Max purchase amount must be positive");

        baseToken = IERC20(_baseTokenAddress);
        quoteToken = IERC20(_quoteTokenAddress);

        baseDecimals = IERC20Metadata(_baseTokenAddress).decimals();
        quoteDecimals = IERC20Metadata(_quoteTokenAddress).decimals();

        // Precision limitation for scaling
        require(baseDecimals <= 18, "Distributor: Base decimals too high for scaling");

        // Calculate scaled target price (Quote wei per Base wei, scaled by 1e18)
        targetPriceX1e18 = (_targetPriceNumerator * (10 ** quoteDecimals) * PRICE_PRECISION)
            / (_targetPriceDenominator * (10 ** baseDecimals));
        require(targetPriceX1e18 > 0, "Distributor: Scaled target price must be > 0");

        maxPurchaseQuoteWei = _maxPurchaseQuoteWei;

        // Owner must transfer base tokens *after* deployment, then call start()
    }

    /**
     * @notice Sets the starting parameters for the sale.
     * @dev Captures the contract's current base token balance as the initial supply.
     * Must be called by the owner AFTER transferring the full base token treasury.
     * Can only be called once. Sale starts at or after block.timestamp >= startTime.
     * @param _startTime The Unix timestamp when the sale should begin. Must be in the future.
     */
    function start(uint256 _startTime) external override onlyOwner {
        require(!saleConfigured, "Distributor: Sale already configured");
        require(_startTime > block.timestamp, "Distributor: Start time must be in the future");

        uint256 currentBalance = baseToken.balanceOf(address(this));
        require(currentBalance > 0, "Distributor: Base token treasury cannot be zero");

        initialBaseSupply = currentBalance;
        saleStartTime = _startTime;
        saleConfigured = true;

        emit SaleScheduled(_startTime, initialBaseSupply);
    }

    /**
     * @notice Allows a user to purchase base tokens by sending quote tokens.
     * @dev User must first approve this contract to spend their quote tokens.
     * @param amount The amount of quote tokens (in wei) the user wants to spend.
     */
    function order(uint256 amount) external override {
        uint256 quoteAmount = amount; // Use descriptive internal variable

        require(saleConfigured, "Distributor: Sale not configured yet");
        require(block.timestamp >= saleStartTime, "Distributor: Sale not started yet");
        require(quoteAmount > 0, "Distributor: Amount must be positive");
        require(quoteAmount <= maxPurchaseQuoteWei, "Distributor: Exceeds max purchase amount");

        // Check cooldown
        require(block.timestamp >= lastPurchaseTime[msg.sender] + COOLDOWN_PERIOD, "Distributor: Cooldown active");

        // Calculate base token amount using the internal function
        uint256 baseAmount = _calculateBaseAmount(quoteAmount);
        require(baseAmount > 0, "Distributor: No base token receivable for this amount (or treasury empty)");

        // Check if contract has enough base tokens
        uint256 currentBaseBalance = baseToken.balanceOf(address(this));
        require(currentBaseBalance >= baseAmount, "Distributor: Insufficient base token treasury");

        // Update cooldown timestamp *before* external calls (Checks-Effects-Interactions)
        lastPurchaseTime[msg.sender] = block.timestamp;

        // Perform transfers
        quoteToken.safeTransferFrom(msg.sender, address(this), quoteAmount);
        baseToken.safeTransfer(msg.sender, baseAmount);

        emit TokensPurchased(msg.sender, quoteAmount, baseAmount);
    }

    /**
     * @notice Calculates the amount of base tokens receivable for a given quote token amount.
     * @param amount The amount of quote tokens (in wei) to potentially spend.
     * @return baseAmount The estimated amount of base tokens (in wei) that would be received.
     */
    function quote(uint256 amount) external view override returns (uint256 baseAmount) {
        uint256 quoteAmount = amount; // Use descriptive internal variable

        if (!saleConfigured || initialBaseSupply == 0 || quoteAmount == 0) {
            return 0;
        }
        // Call the internal calculation function
        baseAmount = _calculateBaseAmount(quoteAmount);
        return baseAmount; // Explicit return name matches interface/NatSpec
    }

    /**
     * @notice Internal function to calculate base token amount from quote token amount.
     * @dev Contains the core bonding curve price integration logic.
     * @param quoteAmount The amount of quote tokens (in wei) input.
     * @return baseAmount The calculated amount of base tokens (in wei) output.
     */
    function _calculateBaseAmount(uint256 quoteAmount) internal view returns (uint256 baseAmount) {
        // This function requires the sale to be configured to have valid parameters
        if (!saleConfigured || initialBaseSupply == 0) return 0;

        uint256 currentSupply = baseToken.balanceOf(address(this));
        uint256 I = initialBaseSupply; // Alias for readability: Initial Base Supply
        uint256 S = currentSupply; // Alias for readability: Current Base Supply
        uint256 C = quoteAmount; // Alias for readability: Quote Amount (Cost)
        uint256 P_T_scaled = targetPriceX1e18; // Alias for readability: Scaled Target Price

        if (S == 0 || P_T_scaled == 0) {
            return 0; // Treasury empty or invalid target price
        }

        // --- Quadratic Formula Calculation (Quote/Base derived) ---
        // Formula solves C = Integral(Price dS) for the amount of base token (Y) bought.
        // Y = [-b + sqrt(b^2 - 4ac)] / 2a derived from the quadratic equation:
        // P_T_scaled * Y^2 + P_T_scaled * (2I - 2S) * Y - (C * 1e18 * 2I) = 0

        uint256 two_I = 2 * I;
        uint256 two_S = 2 * S;
        // (2I - 2S) term, ensure non-negative
        uint256 b_term_base = (two_I > two_S) ? two_I - two_S : 0;

        // b^2 = (P_T_scaled * (2I - 2S))^2  (Scale: 1e36)
        uint256 b_squared_intermediate = P_T_scaled * b_term_base; // Scale 1e18
        uint256 b_squared = Math.mulDiv(b_squared_intermediate, b_squared_intermediate, PRICE_PRECISION); // Scale 1e36

        // -4ac = 4 * P_T_scaled * (C * 1e18 * 2I) (Scale: 1e36)
        // Note: c is negative, so -4ac is positive
        uint256 four_a_c_intermediate1 = 4 * P_T_scaled; // Scale 1e18
        uint256 four_a_c_intermediate2 = C * two_I; // Scale 0
        uint256 four_a_c_intermediate3 = Math.mulDiv(four_a_c_intermediate1, four_a_c_intermediate2, 1); // Scale 1e18
        uint256 four_a_c = Math.mulDiv(four_a_c_intermediate3, PRICE_PRECISION, 1); // Scale 1e36

        // Discriminant D = b^2 - 4ac (Scale: 1e36)
        uint256 discriminant = b_squared + four_a_c;

        // sqrt(D) (Scale: 1e18)
        uint256 sqrtDiscriminant = discriminant.sqrt();

        // Numerator: -b + sqrt(D) (Scale: 1e18)
        // b = P_T_scaled * (2I - 2S) (Scale: 1e18)
        uint256 neg_b = P_T_scaled * (two_S > two_I ? two_S - two_I : 0); // = -b if S > I
        uint256 b_val = P_T_scaled * b_term_base; // = +b if I >= S

        uint256 numerator;
        if (two_I >= two_S) {
            // b is non-negative
            require(sqrtDiscriminant >= b_val, "Distributor: sqrt(D) < b"); // Safety check
            numerator = sqrtDiscriminant - b_val;
        } else {
            // b is negative, so -b is positive
            numerator = neg_b + sqrtDiscriminant;
        }

        // Denominator: 2a = 2 * P_T_scaled (Scale: 1e18)
        uint256 denominator = 2 * P_T_scaled;
        require(denominator > 0, "Distributor: zero denominator"); // Safety check

        // Final Calculation: Y (baseAmount) = Numerator / Denominator (Scale: 1e18 / 1e18 = 1)
        baseAmount = numerator / denominator;
        // --- End Quadratic Formula Calculation ---

        // Ensure we don't try to sell more than available supply
        return baseAmount > S ? S : baseAmount;
    }
}
