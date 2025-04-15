import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import NitroliteStore from '@/store/NitroliteStore';
import { Participant } from '@/store/types';

interface useGetParticipantsParams {
    wsProps: any;
    activeChainId?: number;
}

export function useGetParticipants({ wsProps, activeChainId }: useGetParticipantsParams) {
    const { isConnected, connect, sendRequest } = wsProps;

    const getParticipants = useCallback(async () => {
        console.log('Fetching participants...');

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                return;
            }
        }

        const tokenAddress = activeChainId && APP_CONFIG.TOKENS[activeChainId];
        const message = {
            token_address: tokenAddress,
        };

        if (!tokenAddress) {
            console.error('Token address not found for active chain ID:', activeChainId);
            return;
        }

        try {
            const response = await sendRequest('ListOpenParticipants', JSON.stringify([message]));

            console.log('Participants response:', response);

            let participantsList: Participant[] = [];

            if (response && Array.isArray(response)) {
                const potentialRes = response as any;

                if (
                    potentialRes.res &&
                    Array.isArray(potentialRes.res) &&
                    potentialRes.res.length > 2 &&
                    Array.isArray(potentialRes.res[2]) &&
                    potentialRes.res[2][0] &&
                    Array.isArray(potentialRes.res[2][0])
                ) {
                    participantsList = potentialRes.res[2][0];
                } else if (response[0] && Array.isArray(response[0])) {
                    participantsList = response[0];
                } else if (response.length > 0 && response[0].address) {
                    participantsList = response;
                } else {
                    console.warn('Participants list appears empty or has unexpected format:', response);
                }
            } else {
                console.error('Unexpected response format:', response);
            }

            NitroliteStore.setParticipants(participantsList);
        } catch (error) {
            console.error('Error getting participants:', error);
            NitroliteStore.setParticipants([]);
        }
    }, [isConnected, connect, sendRequest, activeChainId]);

    return {
        getParticipants,
    };
}
