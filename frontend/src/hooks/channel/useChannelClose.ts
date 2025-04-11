import { useCallback } from 'react';
import { Address, Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { State } from '@erc7824/nitrolite';
import { createEthersSigner } from '@/websocket';

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

    const handleCloseChannel = useCallback(async () => {
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

            // Get the existing state to preserve the amounts
            const currentState = storedData?.state || channelContext.getCurrentState();

            const responseState = {
                channelId: '0x5ae95c54f290b3e33886b2a31f506e9bd277ecbd8b348843dbca67179e4e19ba',
                stateData: '0x0000000000000000000000000000000000000000000000000000000000001ec7',
                allocations: [
                    {
                        destination: '0x21F7D1F35979B125f6F7918fC16Cb9101e5882d7',
                        token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                        amount: 9600,
                    },
                    {
                        destination: '0xD278d56eDe7F43992739C1ee95806D00fDeA5aa0',
                        token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
                        amount: 0,
                    },
                ],
                'server-signature': {
                    v: '27',
                    r: '0x925352376dfc4444d4d810a730c7b6f599e4a46ef041ad9dee235439f89ac94a',
                    s: '0x4688a3b69599585f3abc96f1355d6590c149ec4a3b8011b04803e51e5b4bc812',
                },
            };

            const finalState: State = {
                data: app.encode(appState), // magic number
                // Use the existing allocations which already have the correct amount
                // @ts-ignore
                allocations: responseState.allocations,
                sigs: [],
            };

            const stateHash = channelContext.getStateHash(finalState);

            console.log('State hash:', stateHash);
            console.log('stateSigner', stateSigner);
            const [signature] = await stateSigner.sign(stateHash, true);
            const parsedSig = parseSignature(signature as Hex);

            finalState.sigs = [
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

            console.log('Final state:', finalState);

            // Close the channel
            await NitroliteStore.closeChannel(channelId, finalState);

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
    }, [clearStoredChannel, getChannelFromStorage]);

    return {
        handleCloseChannel,
        clearStoredChannel,
    };
}
