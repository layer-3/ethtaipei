import { useCallback } from 'react';
import { useMessageService } from '@/hooks/ui/useMessageService';
import { disconnectWallet } from './useMetaMask';
import { disconnectPrivy } from './usePrivy';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';

/**
 * Custom hook to manage wallet connection and disconnection
 */
export function useWalletConnection(status: string, disconnect: () => void) {
    const { addSystemMessage } = useMessageService();
    const walletSnap = useSnapshot(WalletStore.state);

    /**
     * Handles disconnecting from wallet and websocket
     */
    const handleDisconnect = useCallback(async () => {
        // First disconnect from WebSocket if connected
        if (status === 'connected') {
            disconnect(); // This is the WebSocket disconnect
        }

        // Then disconnect from the appropriate wallet provider
        if (walletSnap.walletProvider === 'privy') {
            await disconnectPrivy();
        } else {
            // Default to MetaMask
            await disconnectWallet();
        }
        
        addSystemMessage('Disconnected from wallet');
    }, [status, disconnect, addSystemMessage, walletSnap.walletProvider]);

    return {
        handleDisconnect,
    };
}