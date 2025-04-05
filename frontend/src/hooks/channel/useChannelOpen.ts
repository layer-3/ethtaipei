import { useCallback } from 'react';
import { Address, Hex, parseSignature } from 'viem';
import { CounterApp } from '@/services/apps/counter';
import NitroliteStore from '@/store/NitroliteStore';
import WalletStore from '@/store/WalletStore';
import APP_CONFIG from '@/config/app';
import { MessageType } from '@erc7824/nitrolite/dist/relay';

export function useChannelOpen() {
    const handleOpenChannel = useCallback(async (tokenAddress: string, amount: string) => {
        if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
            const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

            throw new Error(errorMsg);
        }

        // Create Counter application instance
        const app = new CounterApp();

        // Set the channel open flag first
        WalletStore.setChannelOpen(true);

        try {
            // First set up the channel context with the counter app
            const channel = NitroliteStore.setChannelContext(APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address, app);
            const channelId = channel.getChannelId();

            if (!window.ethereum) {
                throw new Error('MetaMask is not installed');
            }

            const address = WalletStore.state.account;

            if (!address) {
                throw new Error('No wallet connected');
            }

            await NitroliteStore.deposit(channelId, tokenAddress as Address, amount);

            // Create initial app state
            const appState = { type: 'system' as MessageType, text: '0', sequence: '0' };

            // Get state hash for signing
            const stateHash = channel.getStateHash(
                appState,
                tokenAddress as Address,
                [BigInt(amount), BigInt(0)] as [bigint, bigint],
            );

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [stateHash, address],
            });

            const parsedSig = parseSignature(signature as Hex);

            await NitroliteStore.openChannel(
                channelId,
                appState,
                tokenAddress as Address,
                [BigInt(amount), BigInt(0)] as [bigint, bigint],
                [
                    {
                        r: parsedSig.r,
                        s: parsedSig.s,
                        v: +parsedSig.v.toString(),
                    },
                ],
            );

            WalletStore.openChannel(tokenAddress as Address, amount);
        } catch (error) {
            WalletStore.setChannelOpen(false);
        }
    }, []);

    return {
        handleOpenChannel,
    };
}
