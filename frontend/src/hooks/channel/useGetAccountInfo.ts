import { useCallback } from 'react';
import { Address } from 'viem';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { useSnapshot } from 'valtio';

/**
 * useGetAccountInfo
 */

interface UseGetAccountInfoParams {
    activeChainId?: number;
}

export function useGetAccountInfo({ activeChainId }: UseGetAccountInfoParams) {
    const walletSnap = useSnapshot(WalletStore.state);

    const getAccountInfo = useCallback(async () => {
        if (!activeChainId || !walletSnap.walletAddress) return;

        try {
            await NitroliteStore.getAccountInfo(walletSnap.walletAddress, APP_CONFIG.TOKENS[activeChainId] as Address);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }, [activeChainId, walletSnap.walletAddress]);

    return {
        getAccountInfo,
    };
}
