import { useCallback } from 'react';
import APP_CONFIG from '@/config/app';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';

interface IAllocations {
    participantA: string;
    participantB: string;
}

interface IUseVirtualChannelHandlers {
    isConnected: boolean;
    connect: () => Promise<void>;
    selectedParticipant: string;
    activeChain: any;
    virtualChannelId: string;
    virtualChannelAmount: string;
    allocations: IAllocations;
    setVirtualChannelId: (id: string) => void;
    setAllocations: (allocs: IAllocations) => void;
}

/**
 * Provide handlers for opening & closing a virtual channel.
 */
export function useVirtualChannelHandlers(params: IUseVirtualChannelHandlers) {
    const {
        isConnected,
        connect,
        selectedParticipant,
        activeChain,
        virtualChannelId,
        virtualChannelAmount,
        allocations,
        setVirtualChannelId,
        setAllocations,
    } = params;

    const { addToHistory } = useTransactionHistory();
    const { setResponse, setLoading } = useResponseTracking();

    // --- OPEN VIRTUAL CHANNEL ---
    const handleOpenVirtualChannel = useCallback(
        async (
            sendRequest: (method: string, payload: string) => Promise<any>,
            participantA: string,
            stateSignerAddress: string,
        ) => {
            console.log('Opening virtual channel...');

            if (!selectedParticipant) {
                setResponse('virtualChannel', { error: 'Please select a participant first' });
                addToHistory('virtualChannel', 'error', 'No participant selected for virtual channel');
                return;
            }

            setLoading('virtualChannel', true);
            setResponse('virtualChannel', null);
            addToHistory('virtualChannel', 'pending', 'Opening virtual channel...');

            if (!isConnected) {
                try {
                    await connect();
                } catch (error) {
                    console.error('Failed to connect WebSocket:', error);
                    setResponse('virtualChannel', { error: 'Failed to connect WebSocket' });
                    setLoading('virtualChannel', false);
                    addToHistory('virtualChannel', 'error', 'Failed to connect to WebSocket server');
                    return;
                }
            }

            try {
                const amountA = parseInt(virtualChannelAmount, 10);

                if (isNaN(amountA)) {
                    throw new Error('Invalid amount entered');
                }

                const createVirtualChannelParams = {
                    participantA: stateSignerAddress || '',
                    participantB: selectedParticipant,
                    token_address:
                        (activeChain?.id && APP_CONFIG.TOKENS[activeChain.id]) ||
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    amountA,
                    amountB: 0,
                    adjudicator: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9',
                    challenge: 1,
                    nonce: Date.now(),
                };

                const response = await sendRequest(
                    'CreateVirtualChannel',
                    JSON.stringify([createVirtualChannelParams]),
                );

                console.log('Virtual channel created:', response);
                setResponse('virtualChannel', response);

                if (response && response.channelId) {
                    setVirtualChannelId(response.channelId);
                    localStorage.setItem('virtual_channel_id', response.channelId);
                    addToHistory(
                        'virtualChannel',
                        'success',
                        `Virtual channel created with ID: ${response.channelId.substring(0, 10)}...`,
                        {
                            channelId: response.channelId,
                            amount: virtualChannelAmount,
                        },
                    );
                } else {
                    addToHistory(
                        'virtualChannel',
                        'success',
                        'Virtual channel response received, but no channel ID found',
                    );
                }

                // Update allocations for closing with same amount
                setAllocations({
                    participantA: '0',
                    participantB: virtualChannelAmount,
                });
            } catch (error) {
                console.error('Error creating virtual channel:', error);
                setResponse('virtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory(
                    'virtualChannel',
                    'error',
                    `Failed to create virtual channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
            } finally {
                setLoading('virtualChannel', false);
            }
        },
        [
            setLoading,
            setResponse,
            addToHistory,
            isConnected,
            connect,
            selectedParticipant,
            activeChain,
            setVirtualChannelId,
            setAllocations,
            virtualChannelAmount,
        ],
    );

    // --- CLOSE VIRTUAL CHANNEL ---
    const handleCloseVirtualChannel = useCallback(
        async (sendRequest: (method: string, payload: string) => Promise<any>, stateSignerAddress: string) => {
            console.log('Closing virtual channel...');

            setLoading('closeVirtualChannel', true);
            setResponse('closeVirtualChannel', null);
            addToHistory('closeVirtualChannel', 'pending', 'Closing virtual channel...');

            if (!isConnected) {
                try {
                    await connect();
                } catch (error) {
                    console.error('Failed to connect WebSocket:', error);
                    setResponse('closeVirtualChannel', { error: 'Failed to connect WebSocket' });
                    setLoading('closeVirtualChannel', false);
                    addToHistory('closeVirtualChannel', 'error', 'Failed to connect to WebSocket server');
                    return;
                }
            }

            try {
                let channelId = virtualChannelId;

                if (!channelId) {
                    channelId = localStorage.getItem('virtual_channel_id') || '';
                    if (!channelId) {
                        throw new Error('No virtual channel ID found. Please create a virtual channel first.');
                    }
                }

                const closeVirtualChannelParams = {
                    allocations: [
                        {
                            amount: allocations.participantA,
                            participant: stateSignerAddress || '',
                        },
                        {
                            amount: allocations.participantB,
                            participant: selectedParticipant || '0xFecaD186B71b5dC129420927534c97027782cD76',
                        },
                    ],
                    channelId,
                    token_address:
                        (activeChain?.id && APP_CONFIG.TOKENS[activeChain.id]) ||
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                };

                const response = await sendRequest('CloseVirtualChannel', JSON.stringify([closeVirtualChannelParams]));

                console.log('Virtual channel closed:', response);
                setResponse('closeVirtualChannel', response);

                addToHistory(
                    'closeVirtualChannel',
                    'success',
                    `Virtual channel ${channelId.substring(0, 10)}... closed`,
                    {
                        allocations: {
                            participantA: allocations.participantA,
                            participantB: allocations.participantB,
                        },
                    },
                );

                // Clear channel ID after closing
                if (response && response.success) {
                    localStorage.removeItem('virtual_channel_id');
                }
            } catch (error) {
                console.error('Error closing virtual channel:', error);
                setResponse('closeVirtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
                addToHistory(
                    'closeVirtualChannel',
                    'error',
                    `Failed to close virtual channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
            } finally {
                setLoading('closeVirtualChannel', false);
            }
        },
        [
            setLoading,
            setResponse,
            addToHistory,
            isConnected,
            connect,
            allocations,
            virtualChannelId,
            selectedParticipant,
            activeChain,
        ],
    );

    return {
        handleOpenVirtualChannel,
        handleCloseVirtualChannel,
    };
}
