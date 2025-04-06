// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDistributor {
    /**
     * @notice Sets the starting parameters for the sale.
     * @dev Captures the contract's current Yuzu balance as the initial supply.
     * Must be called by the owner before any orders can be processed.
     * Orders will only be accepted after the specified start time.
     * @param startTime The Unix timestamp when the sale should begin. Must be in the future.
     */
    function start(uint256 startTime) external;

    /**
     * @notice Allows a user to purchase Yuzu tokens by sending USDC.
     * @dev Sale must have started (current time >= startTime).
     * User must first approve this contract to spend their USDC.
     * Enforces purchase limits and cooldowns.
     * @param amount The amount of USDC (in wei) the user wants to spend.
     */
    function order(uint256 amount) external;

    /**
     * @notice Calculates the amount of Yuzu tokens receivable for a given USDC amount.
     * @dev Provides an estimate based on the current state and bonding curve.
     * Does not require the sale to be active (can be called before startTime).
     * @param amount The amount of USDC (in wei) to potentially spend.
     * @return yuzuAmount The estimated amount of Yuzu (in wei) that would be received.
     */
    function quote(uint256 amount) external view returns (uint256); // Renamed return value for clarity
}
