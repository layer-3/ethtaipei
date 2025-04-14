import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';

/**
 * This hook encapsulates logic to fetch a list of participants via a WebSocket request.
 */
interface UseDebugParticipantsParams {
    wsProps: any;
    activeChainId?: number;
    setResponse: (key: string, value: any) => void;
    addToHistory: (type: string, status: string, message: string) => void;
}

export function useDebugParticipants({
    wsProps,
    activeChainId,
    setResponse,
    addToHistory,
}: UseDebugParticipantsParams) {
    const { isConnected, connect, sendRequest } = wsProps;

    const getParticipants = useCallback(
        async (setParticipants: (p: any[]) => void, setSelectedParticipant: (p: string) => void) => {
            console.log('Fetching participants...');
            setResponse('participants', null);
            addToHistory('participants', 'pending', 'Fetching available participants...');

            if (!isConnected) {
                try {
                    await connect();
                } catch (error) {
                    console.error('Failed to connect WebSocket:', error);
                    setResponse('participants', { error: 'Failed to connect WebSocket' });
                    addToHistory('participants', 'error', 'Failed to connect to WebSocket server');
                    return;
                }
            }

            const tokenAddress = activeChainId && APP_CONFIG.TOKENS[activeChainId];
            const message = {
                token_address: tokenAddress,
            };

            if (!tokenAddress) {
                console.error('Token address not found for active chain ID:', activeChainId);
                setResponse('participants', { error: 'Token address not found for active chain ID' });
                addToHistory('participants', 'error', 'Token address not found for active chain ID');
                return;
            }

            try {
                const response = await sendRequest('ListOpenParticipants', JSON.stringify([message]));

                console.log('Participants response:', response);
                setResponse('participants', response);

                // Process response
                if (response && Array.isArray(response)) {
                    // Check nested structure
                    if (response.res && Array.isArray(response.res[2]) && response.res[2][0]) {
                        setParticipants(response.res[2][0]);
                        if (response.res[2][0].length > 0) {
                            setSelectedParticipant(response.res[2][0][0].address);
                        }
                        addToHistory('participants', 'success', `Found ${response.res[2][0].length} participants`);
                    } else if (response[0] && Array.isArray(response[0])) {
                        setParticipants(response[0]);
                        if (response[0].length > 0) {
                            setSelectedParticipant(response[0][0].address);
                        }
                        addToHistory('participants', 'success', `Found ${response[0].length} participants`);
                    } else if (response.length > 0 && response[0].address) {
                        setParticipants(response);
                        setSelectedParticipant(response[0].address);
                        addToHistory('participants', 'success', `Found ${response.length} participants`);
                    } else {
                        addToHistory('participants', 'success', 'No participants found');
                    }
                } else {
                    addToHistory('participants', 'success', 'No participants found');
                }
            } catch (error) {
                console.error('Error getting participants:', error);
                setResponse('participants', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                addToHistory(
                    'participants',
                    'error',
                    `Failed to get participants: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
            }
        },
        [isConnected, connect, sendRequest, setResponse, addToHistory, activeChainId],
    );

    return {
        getParticipants,
    };
}
