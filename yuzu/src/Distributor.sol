// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./IDistributor.sol"; // Use the updated interface file

/**
 * @title Distributor
 * @notice Distributes Yuzu tokens in exchange for USDC using a bonding curve.
 * The price increases linearly as the Yuzu supply decreases, reaching
 * a target price when the treasury is empty. Starts sales at a configured time.
 * Implements a purchase limit per user per cooldown period.
 */
contract Distributor is IDistributor, Ownable { // Inherits from the new IDistributor
  using SafeERC20 for IERC20;
  using Math for uint256;

  IERC20 public immutable yuzuToken;
  IERC20 public immutable usdcToken;
  uint256 public immutable targetPriceX1e18;
  uint8 public immutable yuzuDecimals;
  uint8 public immutable usdcDecimals;

  // Sale parameters set by start()
  uint256 public initialYuzuSupply;
  uint256 public saleStartTime;
  bool public saleConfigured; // Renamed from initialSupplySet for clarity

  // Purchase Limits (same as before)
  uint256 public constant MAX_PURCHASE_USD_VALUE = 100;
  uint256 public maxPurchaseUsdcWei;
  uint256 public constant COOLDOWN_PERIOD = 24 hours;
  mapping(address => uint256) public lastPurchaseTime;

  // Precision constant (same as before)
  uint256 private constant PRICE_PRECISION = 1e18;

  // --- Events ---
  // Renamed event for clarity
  event SaleScheduled(uint256 startTime, uint256 initialSupply);
  event TokensPurchased(address indexed buyer, uint256 usdcAmount, uint256 yuzuAmount);

  /**
   * @notice Constructor (mostly unchanged)
   * @param _yuzuTokenAddress Address of the Yuzu ERC20 token.
   * @param _usdcTokenAddress Address of the USDC ERC20 token.
   * @param _targetPriceNumerator Target price numerator (e.g., 12 for 1.2)
   * @param _targetPriceDenominator Target price denominator (e.g., 10 for 1.2)
   */
  constructor(
      address _yuzuTokenAddress,
      address _usdcTokenAddress,
      uint256 _targetPriceNumerator,
      uint256 _targetPriceDenominator
      ) Ownable(msg.sender) {
    require(_yuzuTokenAddress != address(0), "Distributor: Invalid Yuzu address");
    require(_usdcTokenAddress != address(0), "Distributor: Invalid USDC address");
    require(_targetPriceDenominator != 0, "Distributor: Denominator cannot be zero");

  yuzuToken = IERC20(_yuzuTokenAddress);
  usdcToken = IERC20(_usdcTokenAddress);

  yuzuDecimals = yuzuToken.decimals();
  usdcDecimals = usdcToken.decimals();

  require(yuzuDecimals <= 18, "Distributor: Yuzu decimals too high for scaling");

  targetPriceX1e18 = (_targetPriceNumerator * (10**usdcDecimals) * PRICE_PRECISION)
  / (_targetPriceDenominator * (10**yuzuDecimals));
  require(targetPriceX1e18 > 0, "Distributor: Scaled target price must be > 0");

  maxPurchaseUsdcWei = MAX_PURCHASE_USD_VALUE * (10**usdcDecimals);

  // Owner must transfer Yuzu tokens *after* deployment, then call start()
}

/**
 * @notice Sets the starting parameters for the sale. Replaces setInitialTreasury.
 * @dev Captures the contract's current Yuzu balance as the initial supply.
 * Must be called by the owner AFTER transferring the full Yuzu treasury.
 * Can only be called once. Sale starts at or after block.timestamp >= startTime.
 * @param _startTime The Unix timestamp when the sale should begin. Must be in the future.
 */
function start(uint256 _startTime) external override onlyOwner {
  require(!saleConfigured, "Distributor: Sale already configured");
  require(_startTime > block.timestamp, "Distributor: Start time must be in the future");

uint256 currentBalance = yuzuToken.balanceOf(address(this));
require(currentBalance > 0, "Distributor: Treasury cannot be zero");

initialYuzuSupply = currentBalance;
saleStartTime = _startTime;
saleConfigured = true; // Mark configuration complete

emit SaleScheduled(_startTime, initialYuzuSupply);
    }

    /**
     * @notice Allows a user to purchase Yuzu tokens by sending USDC.
     * @dev User must first approve this contract to spend their USDC.
     * @param amount The amount of USDC (in wei) the user wants to spend.
     */
    function order(uint256 amount) external override {
      // Renamed internal variable for clarity, matches interface param name `amount`
      uint256 usdcAmount = amount;

      require(saleConfigured, "Distributor: Sale not configured yet");
      require(block.timestamp >= saleStartTime, "Distributor: Sale not started yet");
      require(usdcAmount > 0, "Distributor: Amount must be positive");
      require(usdcAmount <= maxPurchaseUsdcWei, "Distributor: Exceeds max purchase amount");

      // Check cooldown
      require(block.timestamp >= lastPurchaseTime[msg.sender] + COOLDOWN_PERIOD, "Distributor: Cooldown active");

      // Calculate Yuzu amount using the internal function
      uint256 yuzuAmount = _calculateYuzuAmount(usdcAmount);
      require(yuzuAmount > 0, "Distributor: No Yuzu receivable for this amount (or treasury empty)");

      // Check if contract has enough Yuzu
      uint256 currentYuzuBalance = yuzuToken.balanceOf(address(this));
      require(currentYuzuBalance >= yuzuAmount, "Distributor: Insufficient Yuzu treasury");

      // Update cooldown timestamp *before* external calls
      lastPurchaseTime[msg.sender] = block.timestamp;

      // Perform transfers
      usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmount);
      yuzuToken.safeTransfer(msg.sender, yuzuAmount);

      emit TokensPurchased(msg.sender, usdcAmount, yuzuAmount);
    }

    /**
     * @notice Calculates the amount of Yuzu tokens receivable for a given USDC amount.
     * @dev Replaces getYuzuAmountForUsdc. Uses internal calculation logic.
     * @param amount The amount of USDC (in wei) to potentially spend.
     * @return yuzuAmount The estimated amount of Yuzu (in wei) that would be received.
     */
    function quote(uint256 amount) external view override returns (uint256 yuzuAmount) {
      // Renamed internal variable for clarity, matches interface param name `amount`
      uint256 usdcAmount = amount;

      // Allow quoting even if sale is not configured yet (returns 0) or not started.
      if (!saleConfigured || initialYuzuSupply == 0 || usdcAmount == 0) {
        return 0;
      }
      // Call the internal calculation function
      return _calculateYuzuAmount(usdcAmount);
    }

    /**
     * @notice Internal function to calculate Yuzu amount from USDC amount.
     * @dev Logic remains the same as before. Called by order() and quote().
     * @param usdcAmount The amount of USDC (in wei) input.
     * @return yuzuAmount The calculated amount of Yuzu (in wei) output.
     */
    function _calculateYuzuAmount(uint256 usdcAmount) internal view returns (uint256 yuzuAmount) {
      // Ensure calculation is based on configured supply
      if (!saleConfigured || initialYuzuSupply == 0) return 0;

      uint256 currentSupply = yuzuToken.balanceOf(address(this));
      uint256 I = initialYuzuSupply;
      uint256 S = currentSupply;
      uint256 C = usdcAmount;
      uint256 P_T_scaled = targetPriceX1e18;

      if (S == 0 || P_T_scaled == 0) {
        return 0; // Treasury empty or invalid target price
      }

      // --- Quadratic Formula Calculation (same as before) ---
      uint256 two_I = 2 * I;
      uint256 two_S = 2 * S;
      uint256 b_term_base = (two_I > two_S) ? two_I - two_S : 0;

      uint256 b_squared_intermediate = P_T_scaled * b_term_base;
      uint256 b_squared = Math.mulDiv(b_squared_intermediate, b_squared_intermediate, PRICE_PRECISION);

      uint256 four_a_c_intermediate1 = 4 * P_T_scaled;
      uint256 four_a_c_intermediate2 = C * two_I;
      uint256 four_a_c_intermediate3 = Math.mulDiv(four_a_c_intermediate1, four_a_c_intermediate2, 1);
      uint256 four_a_c = Math.mulDiv(four_a_c_intermediate3, PRICE_PRECISION, 1);

      uint256 discriminant = b_squared + four_a_c;
      uint256 sqrtDiscriminant = discriminant.sqrt();

      uint256 neg_b = P_T_scaled * (two_S > two_I ? two_S - two_I : 0);
      uint256 b_val = P_T_scaled * b_term_base;

      uint256 numerator;
      if (two_I >= two_S) {
        if (sqrtDiscriminant >= b_val) {
          numerator = sqrtDiscriminant - b_val;
        } else {
          return 0; // Should not happen
        }
      } else {
        numerator = neg_b + sqrtDiscriminant;
      }

      uint256 denominator = 2 * P_T_scaled;
      if (denominator == 0) return 0;

      yuzuAmount = numerator / denominator;
      // --- End Quadratic Formula Calculation ---

      // Ensure we don't try to sell more than available
      return yuzuAmount > S ? S : yuzuAmount;
    }

    // --- Fallback ---
    // receive() external payable {} // Optional
}
