import { useCallback } from 'react';
import { useVirtualChannelOpen, useVirtualChannelClose } from '@/hooks/channel';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';

/**
 * Encapsulate debug opening and closing of a virtual channel logic.
 */
interface UseDebugVirtualChannelsParams {
    isConnected: boolean;
}

export function useDebugVirtualChannels({ isConnected }: UseDebugVirtualChannelsParams) {
    const { setResponse } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();
    const { openVirtualChannel: openVirtualChannelBase } = useVirtualChannelOpen();
    const { closeVirtualChannel: closeVirtualChannelBase } = useVirtualChannelClose();

    const openVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            participantA: string,
            participantB: string,
            amount: string,
            activeChainId: number,
        ) => {
            setResponse('virtualChannel', null);
            addToHistory('virtualChannel', 'pending', 'Opening virtual channel...');

            try {
                const result = await openVirtualChannelBase(
                    sendRequest,
                    participantA,
                    participantB,
                    amount,
                    activeChainId,
                );

                setResponse('virtualChannel', JSON.stringify(result));

                if (result.success && result.channelId) {
                    addToHistory(
                        'virtualChannel',
                        'success',
                        `Virtual channel created. ID: ${result.channelId.substring(0, 10)}...`,
                    );
                } else if (result.success) {
                    addToHistory('virtualChannel', 'success', 'Virtual channel response received, no ID.');
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                setResponse('virtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory('virtualChannel', 'error', 'Failed to create virtual channel');
            }
        },
        [addToHistory, isConnected, setResponse, openVirtualChannelBase],
    );

    const closeVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            virtualChannelId: string,
            participantA: string,
            participantB: string,
            amountA: string,
            amountB: string,
            activeChainId: number,
        ) => {
            setResponse('closeVirtualChannel', null);
            addToHistory('closeVirtualChannel', 'pending', 'Closing virtual channel...');

            try {
                const result = await closeVirtualChannelBase(
                    sendRequest,
                    participantA,
                    participantB,
                    amountA,
                    amountB,
                    activeChainId,
                );

                setResponse('closeVirtualChannel', result);

                if (result && result.success) {
                    const storedChannelId = localStorage.getItem('virtual_channel_id');

                    addToHistory(
                        'closeVirtualChannel',
                        'success',
                        `Virtual channel ${storedChannelId?.substring(0, 10) || 'unknown'}... closed`,
                    );
                } else {
                    throw new Error(result?.error || 'Unknown error');
                }
            } catch (error) {
                setResponse('closeVirtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory('closeVirtualChannel', 'error', 'Failed to close virtual channel');
            }
        },
        [addToHistory, isConnected, setResponse, closeVirtualChannelBase],
    );

    return {
        openVirtualChannel,
        closeVirtualChannel,
    };
}
