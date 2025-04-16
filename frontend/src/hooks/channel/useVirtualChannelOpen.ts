import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';

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

                const params = {
                    participantA,
                    participantB,
                    token_address: tokenAddress,
                    amountA: String(amountBigInt),
                    amountB: 0,
                    adjudicator: adjudicatorAddress,
                    challenge: challengePeriod,
                    nonce: Date.now(),
                };

                // @ts-ignore
                const response = await sendRequest('CreateVirtualChannel', [params]);

                if (response && response[0].channelId) {
                    localStorage.setItem('virtual_channel_id', response[0].channelId);
                    return { success: true, channelId: response[0].channelId, response };
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
