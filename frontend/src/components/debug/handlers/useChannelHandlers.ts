import { useCallback } from 'react';
import { Address } from 'viem';
import { WalletStore, NitroliteStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { AccountInfo } from '@/store/types';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';

/**
 * Provide channel-related handlers for:
 *  - fetchAccountInfo
 *  - onCreateChannel
 *  - handleWithdrawal
 *  - handleCloseChannel
 *  - handleChallenge
 */
export function useChannelHandlers(
    accountInfo: AccountInfo,
    setAccountInfo: (info: AccountInfo) => void,
    currentDeposit: string,
    activeChain: any,
) {
    const { addToHistory } = useTransactionHistory();
    const { responses, loadingStates, setResponse, setLoading } = useResponseTracking();

    const walletSnap = WalletStore.state;
    const nitroliteSnap = NitroliteStore.state;

    // --- 1) Fetch Account Info ---
    const fetchAccountInfo = useCallback(async () => {
        try {
            if (!activeChain || !walletSnap.walletAddress) return;
            const response = await NitroliteStore.getAccountInfo(
                walletSnap.walletAddress,
                APP_CONFIG.TOKENS[activeChain.id],
            );

            setAccountInfo(response);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    }, [activeChain, setAccountInfo, walletSnap.walletAddress]);

    // --- 2) Create Payment Channel ---
    const onCreateChannel = useCallback(
        async (handleCreateChannel: (token: Address, amount: string) => Promise<string>) => {
            if (!walletSnap.connected || !activeChain) return;

            setLoading('createChannel', true);
            addToHistory('createChannel', 'pending', 'Creating payment channel...');

            try {
                const tokenAddress = APP_CONFIG.TOKENS[activeChain.id] as Address;
                const amount = currentDeposit;

                console.log('Creating channel with token:', tokenAddress, 'amount:', amount);

                const channelId = await handleCreateChannel(tokenAddress, amount);

                setResponse('createChannel', {
                    success: true,
                    channelId: channelId,
                    message: 'Channel created successfully',
                });
                addToHistory('createChannel', 'success', `Channel created: ${channelId.substring(0, 10)}...`);

                await fetchAccountInfo();
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
        [activeChain, addToHistory, currentDeposit, fetchAccountInfo, setLoading, setResponse, walletSnap.connected],
    );

    // --- 3) Withdraw Funds ---
    const handleWithdrawal = useCallback(async () => {
        if (!walletSnap.connected || !nitroliteSnap.client || !activeChain) return;

        setLoading('withdrawal', true);
        addToHistory('withdrawal', 'pending', 'Processing withdrawal...');

        try {
            await nitroliteSnap.client.withdraw(APP_CONFIG.TOKENS[activeChain.id], accountInfo.deposited);

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
    }, [
        accountInfo.deposited,
        activeChain,
        addToHistory,
        currentDeposit,
        fetchAccountInfo,
        nitroliteSnap.client,
        setLoading,
        setResponse,
        walletSnap.connected,
    ]);

    // --- 4) Close Payment Channel ---
    const handleCloseChannel = useCallback(
        async (closeChannelHook: () => Promise<void>) => {
            if (!walletSnap.connected) return;

            setLoading('closeChannel', true);
            addToHistory('closeChannel', 'pending', 'Closing payment channel...');

            try {
                await closeChannelHook();
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
        },
        [addToHistory, fetchAccountInfo, setLoading, setResponse, walletSnap.connected],
    );

    // --- 5) Challenge Existing Channel ---
    const handleChallenge = useCallback(async () => {
        if (!walletSnap.connected || !nitroliteSnap.client || !activeChain) return;

        setLoading('challenge', true);
        addToHistory('challenge', 'pending', 'Challenging channel...');

        try {
            const STORAGE_KEYS = {
                CHANNEL_ID: 'nitrolite_channel_id',
                CHANNEL_STATE: 'nitrolite_channel_state',
            };
            const channelId = localStorage.getItem(STORAGE_KEYS.CHANNEL_ID);
            const savedState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

            if (!channelId || !savedState) {
                throw new Error('No channel or channel state found in localStorage');
            }

            // Parse stored state with BigInt fix
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
        activeChain,
        addToHistory,
        fetchAccountInfo,
        nitroliteSnap.client,
        setLoading,
        setResponse,
        walletSnap.connected,
    ]);

    return {
        onCreateChannel,
        handleWithdrawal,
        handleCloseChannel,
        handleChallenge,
        fetchAccountInfo,
    };
}
