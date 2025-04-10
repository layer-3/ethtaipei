import { Address, formatUnits, parseUnits } from 'viem';
import { AssetsStore } from '@/store';

// FIXME: This file is a temporary workaround for handling token decimals.
/**
 * Token decimals utility functions
 *
 * Provides utility functions for handling token decimals and conversions.
 */

// Known token addresses and their decimals
// Used as a fallback when token info is not available in AssetsStore
const KNOWN_TOKENS: Record<string, number> = {
    // USDC
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // Mainnet
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359': 6, // Polygon

    // USDT
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // Mainnet
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 6, // Polygon

    // DAI
    '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // Mainnet
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 18, // Polygon

    // WETH
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // Mainnet
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 18, // Polygon
};

// Default decimals for ERC20 tokens
const DEFAULT_DECIMALS = 6;

/**
 * Get token decimals from token address
 *
 * @param tokenAddress Token address
 * @returns Number of decimals for the token
 */
export function getTokenDecimals(tokenAddress: Address): number {
    if (!tokenAddress) return DEFAULT_DECIMALS;

    const normalizedAddress = tokenAddress.toLowerCase();

    // Try to get token info from AssetsStore
    const { assets } = AssetsStore.state;
    const tokenInfo = assets?.find((asset) => asset.address.toLowerCase() === normalizedAddress);

    if (tokenInfo?.decimals) {
        return tokenInfo.decimals;
    }

    // Fall back to known tokens map
    if (KNOWN_TOKENS[normalizedAddress]) {
        return KNOWN_TOKENS[normalizedAddress];
    }

    // Default to 18 if not found
    return DEFAULT_DECIMALS;
}

/**
 * Convert human-readable amount to token amount with proper decimals
 *
 * @param tokenAddress Token address
 * @param amount Human-readable amount (e.g. "5.0")
 * @returns Token amount as bigint with correct decimals
 */
export function parseTokenUnits(tokenAddress: Address, amount: string): bigint {
    const decimals = getTokenDecimals(tokenAddress);

    return parseUnits(amount, decimals);
}

/**
 * Convert token amount to human-readable amount
 *
 * @param tokenAddress Token address
 * @param amount Token amount as bigint
 * @returns Human-readable amount with correct decimals
 */
export function formatTokenUnits(tokenAddress: Address, amount: bigint): string {
    const decimals = getTokenDecimals(tokenAddress);

    return formatUnits(amount, 6);
}

/**
 * Simple utility to get token decimals
 * Used in components that need just the decimal value
 */
export function tokenDecimals(tokenAddress: Address): number {
    return getTokenDecimals(tokenAddress);
}
