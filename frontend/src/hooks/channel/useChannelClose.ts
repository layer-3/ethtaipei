import { useCallback } from 'react';
import { Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { State } from '@erc7824/nitrolite';
import { useResponseTracking } from '../debug/useResponseTracking';
import { useTransactionHistory } from '../debug/useTransactionHistory';

// Define localStorage keys - must match those in useChannelCreate
const STORAGE_KEYS = {
    CHANNEL: 'nitrolite_channel',
    CHANNEL_STATE: 'nitrolite_channel_state',
    CHANNEL_ID: 'nitrolite_channel_id',
};

export function useChannelClose() {
    const { setResponse, setLoading } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();

    // Function to clear stored channel data
    const clearStoredChannel = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEYS.CHANNEL);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
            localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);

            setResponse('channelStorage', {
                status: 'Channel data cleared from localStorage',
                success: true,
            });

            addToHistory('CHANNEL_STORAGE_CLEAR', 'success', 'Cleared channel data from localStorage', {
                timestamp: Date.now(),
            });

            console.log('Cleared channel data from localStorage after closing');
        } catch (error) {
            setResponse('channelStorage', {
                error: `Failed to clear channel data: ${error}`,
                success: false,
            });

            addToHistory('CHANNEL_STORAGE_CLEAR', 'error', `Failed to clear channel data: ${error}`);
        }
    }, [setResponse, addToHistory]);

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
            setLoading('channelClose', true);

            try {
                setResponse('channelClose', { status: 'Initializing channel close...', success: false });

                if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
                    const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

                    setResponse('channelClose', { error: errorMsg, success: false });

                    addToHistory('CHANNEL_CLOSE', 'error', errorMsg);

                    throw new Error(errorMsg);
                }

                // Create Counter application instance
                const app = new AdjudicatorApp();
                const stateSigner = NitroliteStore.state.stateSigner;

                if (!stateSigner) {
                    const errorMsg = 'State signer not initialized';

                    setResponse('channelClose', { error: errorMsg, success: false });

                    addToHistory('CHANNEL_CLOSE', 'error', errorMsg);

                    throw new Error(errorMsg);
                }

                // Create initial app state
                const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_CLOSE;

                // Try to get channel context from NitroliteStore first
                let channelContext = NitroliteStore.getChannelContext();
                let storedData = null;

                // If no channel context in store, try to restore from localStorage
                if (!channelContext) {
                    setResponse('channelClose', {
                        status: 'No channel context found, attempting to restore from localStorage...',
                        success: false,
                    });

                    storedData = getChannelFromStorage();

                    if (storedData) {
                        // Restore channel context
                        channelContext = NitroliteStore.setChannelContext(storedData.channel, storedData.state, app);
                        setResponse('channelClose', {
                            status: 'Restored channel from localStorage for closing',
                            success: false,
                        });
                        console.log('Restored channel from localStorage for closing');
                    } else {
                        const errorMsg = 'No channel found to close - check if channel exists';

                        setResponse('channelClose', { error: errorMsg, success: false });

                        addToHistory('CHANNEL_CLOSE', 'error', errorMsg);

                        throw new Error(errorMsg);
                    }
                }

                const channelId = channelContext.getChannelId();

                setResponse('channelClose', {
                    status: `Preparing to close channel with ID: ${channelId}`,
                    success: false,
                });

                // Set the channel open flag since we're interacting with it
                WalletStore.setChannelOpen(true);
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

                setResponse('channelClose', {
                    status: 'Creating state hash for signing...',
                    success: false,
                });

                const stateHash = channelContext.getStateHash(state);

                setResponse('channelClose', {
                    status: 'Signing state hash...',
                    success: false,
                });

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

                setResponse('channelClose', {
                    status: 'Closing channel on-chain...',
                    success: false,
                });

                // Close the channel
                await NitroliteStore.closeChannel(channelId, state);

                // Clear stored channel data after successful close
                clearStoredChannel();

                // Update wallet state
                WalletStore.closeChannel();

                // Record successful channel close
                addToHistory('CHANNEL_CLOSE', 'success', 'Channel closed successfully', {
                    channelId,
                    allocations: JSON.stringify(state.allocations),
                    timestamp: Date.now(),
                });

                setResponse('channelClose', {
                    status: 'Channel closed successfully',
                    data: { channelId },
                    success: true,
                });

                return true;
            } catch (error) {
                WalletStore.setChannelOpen(false);
                console.error('Error closing channel:', error);

                setResponse('channelClose', {
                    error: `Channel close failed: ${error}`,
                    success: false,
                });

                addToHistory('CHANNEL_CLOSE', 'error', `Channel close failed: ${error}`);

                throw error;
            } finally {
                setLoading('channelClose', false);
            }
        },
        [clearStoredChannel, getChannelFromStorage, setResponse, setLoading, addToHistory],
    );

    return {
        handleCloseChannel,
        clearStoredChannel,
    };
}
