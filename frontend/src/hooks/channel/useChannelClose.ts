import { useCallback } from 'react';
import { NitroliteStore, WalletStore } from '@/store';

// Define localStorage keys - must match those in useChannelCreate
const STORAGE_KEYS = {
    CHANNEL: 'nitrolite_channel',
    CHANNEL_STATE: 'nitrolite_channel_state',
    CHANNEL_ID: 'nitrolite_channel_id',
};

export function useChannelClose() {
    const clearStoredChannel = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEYS.CHANNEL);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);

            console.log('Cleared channel data from localStorage after closing');
        } catch (error) {
            console.log('Error clearing channel data from localStorage:', error);
        }
    }, []);

    // Function to get channel data from localStorage if needed
    const getChannelFromStorage = useCallback(() => {
        try {
            const savedChannelData = localStorage.getItem(STORAGE_KEYS.CHANNEL);
            const savedChannelState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

            if (savedChannelData && savedChannelState) {
                const channel = JSON.parse(savedChannelData, (key, value) => {
                    // Convert strings that look like BigInts back to BigInt
                    if (typeof value === 'string' && /^\d+n$/.test(value)) {
                        return BigInt(value.substring(0, value.length - 1));
                    }
                    return value;
                });

                const state = JSON.parse(savedChannelState, (key, value) => {
                    // Convert strings that look like BigInts back to BigInt
                    if (typeof value === 'string' && /^\d+n$/.test(value)) {
                        return BigInt(value.substring(0, value.length - 1));
                    }
                    return value;
                });

                return { channel, state };
            }

            return null;
        } catch (error) {
            console.error('Failed to retrieve channel from localStorage:', error);
            return null;
        }
    }, []);

    const handleCloseChannel = useCallback(
        async (finalState: any) => {
            try {
                const brokerState = finalState[0];

                await NitroliteStore.state.client.closeChannel({
                    finalState: {
                        channelId: brokerState.channel_id,
                        stateData: brokerState.state_data,
                        allocations: [
                            {
                                destination: brokerState.allocations[0].participant,
                                token: brokerState.allocations[0].token_address,
                                amount: brokerState.allocations[0].amount,
                            },
                            {
                                destination: brokerState.allocations[1].participant,
                                token: brokerState.allocations[1].token_address,
                                amount: brokerState.allocations[1].amount,
                            },
                        ],
                        serverSignature: brokerState['server_signature'],
                    },
                });

                clearStoredChannel();

                WalletStore.closeChannel();

                return true;
            } catch (error) {
                WalletStore.setChannelOpen(false);
                console.error('Error closing channel:', error);

                throw error;
            }
        },
        [clearStoredChannel, getChannelFromStorage],
    );

    return {
        handleCloseChannel,
        clearStoredChannel,
    };
}
