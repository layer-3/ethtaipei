import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';

/**
 * Hook for closing a virtual channel.
 */
export function useVirtualChannelClose() {
    const closeVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            participantA: string,
            participantB: string,
            amountA: string,
            amountB: string,
            activeChainId: number,
        ) => {
            try {
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId];
                const adjudicatorAddress = APP_CONFIG.ADJUDICATORS.dummy[activeChainId];
                const virtualChannelId = localStorage.getItem('virtual_channel_id');

                if (!tokenAddress || !adjudicatorAddress) {
                    throw new Error('Invalid token address or adjudicator address');
                }

                if (!virtualChannelId) {
                    throw new Error('No virtual channel ID found');
                }

                const amountBigInt = parseTokenUnits(tokenAddress, amountB);

                const allocations = [
                    {
                        participant: participantA,
                        token_address: tokenAddress,
                        amount: +amountA,
                    },
                    {
                        participant: participantB,
                        token_address: tokenAddress,
                        amount: +String(amountBigInt),
                    },
                ];

                const params = {
                    allocations: allocations,
                    channel_id: virtualChannelId,
                };

                // @ts-ignore
                const response = await sendRequest('CloseVirtualChannel', [params]);

                if (response) {
                    localStorage.removeItem('virtual_channel_id');
                    return { success: true, response };
                }
            } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        },
        [],
    );

    return {
        closeVirtualChannel,
    };
}
