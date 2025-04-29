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
                // [
                //     1745936620448,
                //     "close_channel",
                //     [
                //         {
                //             "channel_id": "0x11abc5846528f88cc07d399ee5fd9f7070c59597bcfab11faf04427cf062a322",
                //             "state_data": "0x0000000000000000000000000000000000000000000000000000000000001ec7",
                //             "allocations": [
                //                 {
                //                     "destination": "0x0000000000000000000000000000000000000000",
                //                     "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                //                     "amount": 1000
                //                 },
                //                 {
                //                     "destination": "0x3c93C321634a80FB3657CFAC707718A11cA57cBf",
                //                     "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                //                     "amount": 0
                //                 }
                //             ],
                //             "state_hash": "0xef98465e106969cf27b30ee7696eb758b59094b647526535498b17dd308b2b16",
                //             "hash_sig": "0x96c116e9c82022284017c23bd68549af0794c94567ce8d98e3e6ba55c4c877e252cd7b384b240f8ae2b852d9f7f4f2180d83d2b4aa3ca4835b33ac9931b5ffea00"
                //         }
                //     ],
                //     1745936616
                // ]

                console.log('finalState:', brokerState);

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
