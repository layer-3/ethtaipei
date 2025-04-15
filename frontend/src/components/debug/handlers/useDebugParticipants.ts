import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { useResponseTracking } from '../../../hooks/debug/useResponseTracking'; // Import directly from file
import { useTransactionHistory } from '../../../hooks/debug/useTransactionHistory'; // Import directly from file

/**
 * This hook encapsulates logic to fetch a list of participants via a WebSocket request.
 */
interface UseDebugParticipantsParams {
    wsProps: any;
    activeChainId?: number;
}

export function useDebugParticipants({ wsProps, activeChainId }: UseDebugParticipantsParams) {
    const { isConnected, connect, sendRequest } = wsProps;
    const { setResponse } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();

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

                // Process response - Added more robust type checking for 'res'
                if (response && Array.isArray(response)) {
                    // Check nested structure specifically
                    // Assuming response structure might be like: { res: [any, any, [[{ address: string, ... }]]] }
                    // Or simpler like: [[{ address: string, ... }]]
                    // Or even simpler: [{ address: string, ... }]
                    const potentialRes = response as any; // Cast to any to check for 'res'

                    if (
                        potentialRes.res &&
                        Array.isArray(potentialRes.res) &&
                        potentialRes.res.length > 2 &&
                        Array.isArray(potentialRes.res[2]) &&
                        potentialRes.res[2][0] &&
                        Array.isArray(potentialRes.res[2][0])
                    ) {
                        const participantsList = potentialRes.res[2][0];

                        setParticipants(participantsList);
                        if (participantsList.length > 0 && participantsList[0].address) {
                            setSelectedParticipant(participantsList[0].address);
                        }
                        addToHistory(
                            'participants',
                            'success',
                            `Found ${participantsList.length} participants (nested)`,
                        );
                    } else if (response[0] && Array.isArray(response[0])) {
                        // Check if response is like [[{...}]]
                        const participantsList = response[0];

                        setParticipants(participantsList);

                        if (participantsList.length > 0 && participantsList[0].address) {
                            setSelectedParticipant(participantsList[0].address);
                        }

                        addToHistory(
                            'participants',
                            'success',
                            `Found ${participantsList.length} participants (array in array)`,
                        );
                    } else if (response.length > 0 && response[0].address) {
                        // Check if response is like [{...}]
                        const participantsList = response;

                        setParticipants(participantsList);
                        setSelectedParticipant(participantsList[0].address);
                        addToHistory(
                            'participants',
                            'success',
                            `Found ${participantsList.length} participants (direct array)`,
                        );
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
        [isConnected, connect, sendRequest, activeChainId, setResponse, addToHistory], // Keep setResponse and addToHistory in deps as they come from hooks now
    );

    return {
        getParticipants,
    };
}
