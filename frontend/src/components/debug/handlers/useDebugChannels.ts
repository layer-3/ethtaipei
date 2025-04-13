import { useCallback } from 'react';
import { Address, Hex } from 'viem';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { AccountInfo } from '@/store/types';

/**
 * This hook encapsulates the main channel logic:
 * - Creating a channel
 * - Closing a channel
 * - Challenging a channel
 * - Withdrawing
 */

interface UseDebugChannelsParams {
    accountInfo: AccountInfo;
    setAccountInfo: (info: AccountInfo) => void;
    activeChainId?: number;
}

export function useDebugChannels({ accountInfo, setAccountInfo, activeChainId }: UseDebugChannelsParams) {
    const { addToHistory } = useTransactionHistory();
    const { responses, loadingStates, setResponse, setLoading } = useResponseTracking();

    const walletSnap = WalletStore.state;
    const nitroliteSnap = NitroliteStore.state;

    // fetchAccountInfo can also be here or use a separate hook
    const fetchAccountInfo = useCallback(async () => {
        if (!activeChainId || !walletSnap.walletAddress) return;
        try {
            const resp = await NitroliteStore.getAccountInfo(
                walletSnap.walletAddress,
                APP_CONFIG.TOKENS[activeChainId] as Address,
            );

            setAccountInfo(resp);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }, [activeChainId, walletSnap.walletAddress, setAccountInfo]);

    // Create channel
    const createChannel = useCallback(
        async (tokenAddress: Address, amount: string) => {
            if (!walletSnap.connected) return;

            setLoading('createChannel', true);
            addToHistory('createChannel', 'pending', 'Creating payment channel...');

            try {
                // Suppose we have a function in the store or a custom hook to actually create the channel
                // e.g., handleCreateChannel from your useChannelCreate
                // Here we just replicate that logic:

                if (!nitroliteSnap.client) throw new Error('No Nitrolite client instance');

                // example: channel ID from store
                const channelId = await nitroliteSnap.client.createChannel(tokenAddress, amount);

                setResponse('createChannel', {
                    success: true,
                    channelId,
                    message: 'Channel created successfully',
                });
                addToHistory('createChannel', 'success', `Channel created with ID: ${channelId.substring(0, 10)}...`);

                // Refresh account info
                await fetchAccountInfo();
                return channelId;
            } catch (error) {
                console.error('Error creating channel:', error);
                setResponse('createChannel', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                addToHistory('createChannel', 'error', 'Failed to create channel.');
            } finally {
                setLoading('createChannel', false);
            }
        },
        [nitroliteSnap.client, walletSnap.connected, addToHistory, setLoading, setResponse, fetchAccountInfo],
    );

    // Close channel
    const closeChannel = useCallback(async () => {
        if (!walletSnap.connected) return;

        setLoading('closeChannel', true);
        addToHistory('closeChannel', 'pending', 'Closing payment channel...');

        try {
            // e.g., from useChannelClose
            if (!nitroliteSnap.client) throw new Error('No Nitrolite client instance');
            await nitroliteSnap.client.closeChannel();

            setResponse('closeChannel', {
                success: true,
                message: 'Channel closed successfully',
            });
            addToHistory('closeChannel', 'success', 'Payment channel closed.');

            await fetchAccountInfo();
        } catch (error) {
            console.error('Error closing channel:', error);
            setResponse('closeChannel', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            addToHistory('closeChannel', 'error', 'Failed to close channel.');
        } finally {
            setLoading('closeChannel', false);
        }
    }, [walletSnap.connected, nitroliteSnap.client, addToHistory, setLoading, setResponse, fetchAccountInfo]);

    // Challenge channel
    const challengeChannel = useCallback(async () => {
        if (!walletSnap.connected || !nitroliteSnap.client || !activeChainId) return;

        setLoading('challenge', true);
        addToHistory('challenge', 'pending', 'Challenging channel...');

        try {
            const STORAGE_KEYS = {
                CHANNEL_ID: 'nitrolite_channel_id',
                CHANNEL_STATE: 'nitrolite_channel_state',
            };
            const channelId = localStorage.getItem(STORAGE_KEYS.CHANNEL_ID) as Hex;
            const savedState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

            if (!channelId || !savedState) {
                throw new Error('No channel or channel state found in localStorage');
            }

            const state = JSON.parse(savedState, (key, value) => {
                if (typeof value === 'string' && /^\d+n$/.test(value)) {
                    return BigInt(value.substring(0, value.length - 1));
                }
                return value;
            });

            await nitroliteSnap.client.challengeChannel(channelId, state);
            setResponse('challenge', {
                success: true,
                channelId,
                message: 'Channel challenged successfully',
            });
            addToHistory('challenge', 'success', `Challenged channel: ${channelId.substring(0, 10)}...`);

            await fetchAccountInfo();
        } catch (error) {
            console.error('Error challenging channel:', error);
            setResponse('challenge', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            addToHistory('challenge', 'error', 'Channel challenge failed.');
        } finally {
            setLoading('challenge', false);
        }
    }, [
        walletSnap.connected,
        nitroliteSnap.client,
        activeChainId,
        addToHistory,
        setLoading,
        setResponse,
        fetchAccountInfo,
    ]);

    // Withdraw
    const withdraw = useCallback(
        async (currentDeposit: string) => {
            if (!walletSnap.connected || !nitroliteSnap.client || !activeChainId) return;

            setLoading('withdrawal', true);
            addToHistory('withdrawal', 'pending', 'Processing withdrawal...');

            try {
                await nitroliteSnap.client.withdraw(APP_CONFIG.TOKENS[activeChainId] as Address, accountInfo.deposited);
                setResponse('withdrawal', { success: true, message: 'Withdrawal successful' });
                addToHistory('withdrawal', 'success', `Successfully withdrew ${currentDeposit} tokens`);

                await fetchAccountInfo();
            } catch (error) {
                console.error('Error withdrawing:', error);
                setResponse('withdrawal', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                addToHistory('withdrawal', 'error', 'Withdrawal failed.');
            } finally {
                setLoading('withdrawal', false);
            }
        },
        [
            accountInfo.deposited,
            walletSnap.connected,
            nitroliteSnap.client,
            activeChainId,
            setLoading,
            setResponse,
            addToHistory,
            fetchAccountInfo,
        ],
    );

    return {
        createChannel,
        closeChannel,
        challengeChannel,
        withdraw,
        fetchAccountInfo,
    };
}
