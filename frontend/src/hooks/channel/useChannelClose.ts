import { useCallback } from 'react';
import { Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { State } from '@erc7824/nitrolite';

// Define localStorage keys - must match those in useChannelCreate
const STORAGE_KEYS = {
    CHANNEL: 'nitrolite_channel',
    CHANNEL_STATE: 'nitrolite_channel_state',
    CHANNEL_ID: 'nitrolite_channel_id',
};

export function useChannelClose() {
    // Function to clear stored channel data
    const clearStoredChannel = useCallback(() => {
        localStorage.removeItem(STORAGE_KEYS.CHANNEL);
        localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
        localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);
        console.log('Cleared channel data from localStorage after closing');
    }, []);

    function removeQuotesFromRS(input: { r?: string; s?: string; [key: string]: any }): { [key: string]: any } {
        const output = { ...input };

        if (typeof output.r === 'string') {
            output.r = output.r.replace(/^"(.*)"$/, '$1');
        }

        if (typeof output.s === 'string') {
            output.s = output.s.replace(/^"(.*)"$/, '$1');
        }

        return output;
    }

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
            if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
                const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

                throw new Error(errorMsg);
            }

            // Create Counter application instance
            const app = new AdjudicatorApp();

            const stateSigner = NitroliteStore.state.stateSigner;

            if (!stateSigner) {
                throw new Error('State signer not initialized');
            }

            try {
                // Create initial app state
                const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_CLOSE;

                // Try to get channel context from NitroliteStore first
                let channelContext = NitroliteStore.getChannelContext();
                let storedData = null;

                // If no channel context in store, try to restore from localStorage
                if (!channelContext) {
                    storedData = getChannelFromStorage();

                    if (storedData) {
                        // Restore channel context
                        channelContext = NitroliteStore.setChannelContext(storedData.channel, storedData.state, app);
                        console.log('Restored channel from localStorage for closing');
                    } else {
                        throw new Error('No channel found to close - check if channel exists');
                    }
                }

                const channelId = channelContext.getChannelId();

                console.log('Closing channel with ID:', channelId);
                console.log('channelContext:', channelContext);
                // Set the channel open flag since we're interacting with it
                WalletStore.setChannelOpen(true);
                console.log('finalState', finalState[0]);
                const brokerState = finalState[0] || storedData;

                const responseState = {
                    channelId: brokerState.channelId,
                    stateData: brokerState.stateData,
                    allocations: brokerState.allocations,
                    'server-signature': removeQuotesFromRS(brokerState['server-signature']),
                };

                const state: State = {
                    data: app.encode(appState), // magic number
                    // Use the existing allocations which already have the correct amount
                    // @ts-ignore
                    allocations: responseState.allocations,
                    sigs: [],
                };

                const stateHash = channelContext.getStateHash(state);

                console.log('State hash:', stateHash);
                console.log('stateSigner', stateSigner);
                const [signature] = await stateSigner.sign(stateHash, true);
                const parsedSig = parseSignature(signature as Hex);

                state.sigs = [
                    {
                        r: parsedSig.r,
                        s: parsedSig.s,
                        v: Number(parsedSig.v),
                    },
                    {
                        r: responseState['server-signature'].r as Hex,
                        s: responseState['server-signature'].s as Hex,
                        v: +responseState['server-signature'].v.toString(),
                    },
                ];

                console.log('Final state:', state);

                // Close the channel
                await NitroliteStore.closeChannel(channelId, state);

                // Clear stored channel data after successful close
                clearStoredChannel();

                // Update wallet state
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
