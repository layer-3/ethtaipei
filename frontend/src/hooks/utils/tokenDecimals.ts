import { Address, formatUnits, parseUnits } from 'viem';
import { AssetsStore } from '@/store';

/**
 * Get token decimals from token address
 *
 * @param tokenAddress Token address
 * @returns Number of decimals for the token
 */
export function getTokenDecimals(tokenAddress: Address): number {
    if (!tokenAddress) {
        throw new Error('Token address is required');
    }

    const normalizedAddress = tokenAddress.toLowerCase();
    // Try to get token info from AssetsStore
    const { assets } = AssetsStore.state;
    const tokenInfo = assets?.find((asset) => asset.address.toLowerCase() === normalizedAddress);

    if (tokenInfo?.decimals) {
        return tokenInfo.decimals;
    } else {
        console.error(`Token info not found for address: ${tokenAddress}`);
    }
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

    return formatUnits(amount, decimals);
}

/**
 * Simple utility to get token decimals
 * Used in components that need just the decimal value
 */
export function tokenDecimals(tokenAddress: Address): number {
    return getTokenDecimals(tokenAddress);
}
