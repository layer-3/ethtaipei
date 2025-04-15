import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';

/**
 * Encapsulate opening and closing of a virtual channel logic.
 */
interface UseDebugVirtualChannelsParams {
    isConnected: boolean;
}

export function useDebugVirtualChannels({ isConnected }: UseDebugVirtualChannelsParams) {
    const { setResponse } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();

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
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId];
                const adjudicatorAddress = APP_CONFIG.ADJUDICATORS.dummy[activeChainId];
                const challengePeriod = APP_CONFIG.CHANNEL.CHALLENGE_PERIOD;

                if (!tokenAddress || !adjudicatorAddress) {
                    throw new Error('Invalid token address or adjudicator address');
                }

                const amountBigInt =
                    typeof amount === 'string' && !amount.startsWith('0x')
                        ? parseTokenUnits(tokenAddress, amount)
                        : BigInt(amount);

                const params = {
                    participantA,
                    participantB,
                    token_address: tokenAddress,
                    amountA: +String(amountBigInt),
                    amountB: 0,
                    adjudicator: adjudicatorAddress,
                    challenge: challengePeriod,
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
            }
        },
        [addToHistory, isConnected, setResponse],
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
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId];
                const adjudicatorAddress = APP_CONFIG.ADJUDICATORS.dummy[activeChainId];
                const virtualChannelId = localStorage.getItem('virtual_channel_id');

                if (!tokenAddress || !adjudicatorAddress) {
                    throw new Error('Invalid token address or adjudicator address');
                }

                const amountBigInt =
                    typeof amountB === 'string' && !amountB.startsWith('0x')
                        ? parseTokenUnits(tokenAddress, amountB)
                        : BigInt(amountB);

                const params = {
                    allocations: [
                        { amount: amountA, participant: participantA },
                        { amount: +String(amountBigInt), participant: participantB },
                    ],
                    channelId: virtualChannelId,
                    token_address: tokenAddress,
                };

                const response = await sendRequest('CloseVirtualChannel', JSON.stringify([params]));

                setResponse('closeVirtualChannel', response);

                addToHistory(
                    'closeVirtualChannel',
                    'success',
                    `Virtual channel ${virtualChannelId.substring(0, 10)}... closed`,
                );

                if (response && response.success) {
                    localStorage.removeItem('virtual_channel_id');
                }
            } catch (error) {
                setResponse('closeVirtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory('closeVirtualChannel', 'error', 'Failed to close virtual channel');
            }
        },
        [addToHistory, isConnected, setResponse],
    );

    return {
        openVirtualChannel,
        closeVirtualChannel,
    };
}
