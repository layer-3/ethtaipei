import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { Address, Hex } from 'viem';
import { NitroliteStore, WalletStore, SettingsStore } from '@/store';
import { State } from '@erc7824/nitrolite';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';

// Define localStorage keys
const STORAGE_KEYS = {
    CHANNEL: 'nitrolite_channel',
    CHANNEL_STATE: 'nitrolite_channel_state',
    CHANNEL_ID: 'nitrolite_channel_id',
};

const EMPTY_STATE_DATA = '0x';

export function useChannelCreate() {
    const { activeChain } = useSnapshot(SettingsStore.state);
    const walletSnap = useSnapshot(WalletStore.state);

    // Check if a channel already exists
    const checkForExistingChannel = useCallback(async () => {
        // Check local storage
        const savedChannelId = localStorage.getItem(STORAGE_KEYS.CHANNEL_ID);

        if (savedChannelId) {
            return { exists: true, source: 'localStorage' };
        }

        // Check wallet store state
        if (walletSnap.channelOpen) {
            return { exists: true, source: 'walletStore' };
        }

        // Check for existing channels in the account
        // if (NitroliteStore.state.client && walletSnap.walletAddress) {
        //     try {
        //         const channels = await NitroliteStore.state.client.getAccountChannels(walletSnap.walletAddress);

        //         if (channels && channels.length > 0) {
        //             return { exists: true, source: 'accountChannels', count: channels.length };
        //         }
        //     } catch (error) {
        //         console.error('Error checking existing channels:', error);
        //     }
        // }

        // No existing channel found
        return { exists: false };
    }, [walletSnap.channelOpen, walletSnap.walletAddress]);

    const saveChannelToStorage = useCallback((state: State, channelId: string) => {
        try {
            const stateData = JSON.stringify(state, (key, value) =>
                typeof value === 'bigint' ? value.toString() + 'n' : value,
            );

            localStorage.setItem(STORAGE_KEYS.CHANNEL_STATE, stateData);
            localStorage.setItem(STORAGE_KEYS.CHANNEL_ID, channelId);

            console.log('Saved channel data to localStorage');
        } catch (error) {
            console.error('Failed to save channel to localStorage:', error);
        }
    }, []);

    const handleCreateChannel = useCallback(
        async (tokenAddress: Hex, amount: string) => {
            try {
                const existingChannel = await checkForExistingChannel();

                if (existingChannel.exists) {
                    const source = existingChannel.source;
                    let message = 'Cannot create a new channel because one already exists.';

                    if (source === 'accountChannels') {
                        message +=
                            'You have active channel(s). Please close existing channels before creating a new one.';
                    } else {
                        message += ' Please close the existing channel before creating a new one.';
                    }

                    alert(message);
                    throw new Error(message);
                }

                try {
                    const amountBigInt = parseTokenUnits(tokenAddress, amount);

                    const result = await NitroliteStore.state.client.createChannel({
                        initialAllocationAmounts: [amountBigInt, BigInt(0)],
                        stateData: EMPTY_STATE_DATA,
                    });

                    saveChannelToStorage(result.initialState, result.channelId);

                    WalletStore.setChannelOpen(true);

                    return result;
                } catch (error) {
                    WalletStore.setChannelOpen(false);

                    throw error;
                }
            } catch (error) {
                console.log('Error creating channel:', error);
            }
        },
        [activeChain, saveChannelToStorage, checkForExistingChannel],
    );

    // Function to deposit to a channel
    const handleDepositToChannel = useCallback(async (tokenAddress: Address, amount: string) => {
        try {
            const amountBigInt =
                typeof amount === 'string' && !amount.startsWith('0x')
                    ? parseTokenUnits(tokenAddress, amount)
                    : BigInt(amount);

            await NitroliteStore.state.client.deposit(amountBigInt);

            WalletStore.openChannel(tokenAddress, amountBigInt.toString());

            return true;
        } catch (depositError) {
            let errorMessage = 'Deposit failed';

            if (String(depositError).includes('approve') && String(depositError).includes('not been authorized')) {
                errorMessage = 'Token approval was rejected. Please approve the USDC spend in your wallet to proceed.';
            } else if (String(depositError).includes('user rejected transaction')) {
                errorMessage = 'Transaction was rejected. Please confirm the transaction in your wallet.';
            } else {
                errorMessage = `Deposit error: ${depositError}`;
            }

            throw new Error(errorMessage);
        }
    }, []);

    const clearStoredChannel = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEYS.CHANNEL);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);
        } catch (error) {
            console.error('Failed to clear channel data from localStorage:', error);
        }
    }, []);

    return {
        handleCreateChannel,
        handleDepositToChannel,
        clearStoredChannel,
    };
}
