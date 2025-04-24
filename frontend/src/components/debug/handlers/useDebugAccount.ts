import { useCallback } from 'react';
import { NitroliteStore, WalletStore } from '@/store';
import { AccountInfo } from '@/store/types';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';

/**
 * useDebugAccount
 * Encapsulates fetching account info from the Nitrolite store.
 */

interface UseDebugAccountParams {
    activeChainId?: number;
    setAccountInfo: (info: AccountInfo) => void;
}

export function useDebugAccount({ activeChainId, setAccountInfo }: UseDebugAccountParams) {
    const walletSnap = WalletStore.state;
    const { setResponse } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();

    // Fetch account info from Nitrolite
    const fetchAccountInfo = useCallback(async () => {
        if (!activeChainId || !walletSnap.walletAddress) return;

        try {
            const response = await NitroliteStore.getAccountInfo();

            setResponse('accountInfo', response);
            addToHistory('accountInfo', 'success', 'Fetched account info successfully');

            setAccountInfo(response);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }, [activeChainId, walletSnap.walletAddress, setAccountInfo]);

    return {
        fetchAccountInfo,
    };
}
