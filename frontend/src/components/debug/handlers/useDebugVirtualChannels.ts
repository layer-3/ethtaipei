import { useCallback } from 'react';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';
import { NitroliteStore } from '@/store';
import APP_CONFIG from '@/config/app';

/**
 * Encapsulate opening and closing of a virtual channel logic.
 */
interface UseDebugVirtualChannelsParams {
    isConnected: boolean;
    connect: () => Promise<void>;
}

export function useDebugVirtualChannels({ isConnected, connect }: UseDebugVirtualChannelsParams) {
    const { addToHistory } = useTransactionHistory();
    const { setResponse, setLoading } = useResponseTracking();

    // Example: open virtual channel
    const openVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            participantA: string,
            participantB: string,
            amount: string,
            activeChainId: number,
        ) => {
            setLoading('virtualChannel', true);
            setResponse('virtualChannel', null);
            addToHistory('virtualChannel', 'pending', 'Opening virtual channel...');

            if (!isConnected) {
                try {
                    await connect();
                } catch (error) {
                    setResponse('virtualChannel', { error: 'Failed to connect WebSocket' });
                    addToHistory('virtualChannel', 'error', 'Failed to connect to WebSocket server');
                    setLoading('virtualChannel', false);
                    return;
                }
            }

            try {
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId] || '0xEEEE...';

                const params = {
                    participantA,
                    participantB,
                    token_address: tokenAddress,
                    amountA: parseInt(amount, 10),
                    amountB: 0,
                    adjudicator: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9',
                    challenge: 1,
                    nonce: Date.now(),
                };

                const response = await sendRequest('CreateVirtualChannel', JSON.stringify([params]));

                setResponse('virtualChannel', response);

                if (response && response.channelId) {
                    localStorage.setItem('virtual_channel_id', response.channelId);
                    addToHistory(
                        'virtualChannel',
                        'success',
                        `Virtual channel created. ID: ${response.channelId.substring(0, 10)}...`,
                    );
                } else {
                    addToHistory('virtualChannel', 'success', 'Virtual channel response received, no ID.');
                }
            } catch (error) {
                setResponse('virtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory('virtualChannel', 'error', 'Failed to create virtual channel');
            } finally {
                setLoading('virtualChannel', false);
            }
        },
        [addToHistory, connect, isConnected, setLoading, setResponse],
    );

    // Example: close virtual channel
    const closeVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            channelId: string,
            participantA: string,
            participantB: string,
            amountA: string,
            amountB: string,
            activeChainId: number,
        ) => {
            setLoading('closeVirtualChannel', true);
            setResponse('closeVirtualChannel', null);
            addToHistory('closeVirtualChannel', 'pending', 'Closing virtual channel...');

            if (!isConnected) {
                try {
                    await connect();
                } catch (error) {
                    setResponse('closeVirtualChannel', { error: 'Failed to connect WebSocket' });
                    addToHistory('closeVirtualChannel', 'error', 'Failed to connect to WebSocket server');
                    setLoading('closeVirtualChannel', false);
                    return;
                }
            }

            try {
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId] || '0xEEEE...';
                const params = {
                    allocations: [
                        { amount: amountA, participant: participantA },
                        { amount: amountB, participant: participantB },
                    ],
                    channelId,
                    token_address: tokenAddress,
                };

                const response = await sendRequest('CloseVirtualChannel', JSON.stringify([params]));

                setResponse('closeVirtualChannel', response);

                addToHistory(
                    'closeVirtualChannel',
                    'success',
                    `Virtual channel ${channelId.substring(0, 10)}... closed`,
                );

                if (response && response.success) {
                    localStorage.removeItem('virtual_channel_id');
                }
            } catch (error) {
                setResponse('closeVirtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory('closeVirtualChannel', 'error', 'Failed to close virtual channel');
            } finally {
                setLoading('closeVirtualChannel', false);
            }
        },
        [addToHistory, connect, isConnected, setLoading, setResponse],
    );

    return {
        openVirtualChannel,
        closeVirtualChannel,
    };
}
