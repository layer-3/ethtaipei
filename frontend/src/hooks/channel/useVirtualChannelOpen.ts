import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';
import { Allocation } from '@erc7824/nitrolite/dist/client/types';

/**
 * Hook for opening a virtual channel.
 */
export function useVirtualChannelOpen() {
    const openVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            participantA: string,
            participantB: string,
            amount: string,
            activeChainId: number,
        ) => {
            try {
                const tokenAddress = APP_CONFIG.TOKENS[activeChainId];
                const adjudicatorAddress = APP_CONFIG.ADJUDICATORS.dummy[activeChainId];
                const challengePeriod = APP_CONFIG.CHANNEL.CHALLENGE_PERIOD;

                if (!tokenAddress || !adjudicatorAddress) {
                    throw new Error('Invalid token address or adjudicator address');
                }

                const amountBigInt = parseTokenUnits(tokenAddress, amount);

                // TODO: [Allocation, Allocation]
                const allocations: [any, any] = [
                    {
                        participant: participantA,
                        token_address: tokenAddress,
                        amount: +String(amountBigInt),
                    },
                    {
                        participant: participantB,
                        token_address: tokenAddress,
                        amount: 0,
                    },
                ];

                const params = {
                    participant_a: participantA,
                    participant_b: participantB,
                    allocations: allocations,
                };

                // @ts-ignore
                const response = await sendRequest('CreateVirtualChannel', [params]);

                if (response && response[0].channel_id) {
                    localStorage.setItem('virtual_channel_id', response[0].channel_id);
                    return { success: true, channel_id: response[0].channel_id, response };
                } else {
                    return { success: true, response };
                }
            } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        },
        [],
    );

    return {
        openVirtualChannel,
    };
}
