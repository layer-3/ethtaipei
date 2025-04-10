import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Address, Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import { NitroliteStore, WalletStore, SettingsStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { Channel, State } from '@erc7824/nitrolite';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';

// Define localStorage keys
const STORAGE_KEYS = {
    CHANNEL: 'nitrolite_channel',
    CHANNEL_STATE: 'nitrolite_channel_state',
    CHANNEL_ID: 'nitrolite_channel_id',
};

export function useChannelCreate() {
    const { activeChain } = useSnapshot(SettingsStore.state);
    const walletSnap = useSnapshot(WalletStore.state);

    useEffect(() => {
        if (walletSnap.walletAddress && !NitroliteStore.getChannelContext()) {
            try {
                const savedChannelData = localStorage.getItem(STORAGE_KEYS.CHANNEL);
                const savedChannelState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

                if (savedChannelData && savedChannelState) {
                    const channel = JSON.parse(savedChannelData, (key, value) => {
                        if (typeof value === 'string' && /^\d+n$/.test(value)) {
                            return BigInt(value.substring(0, value.length - 1));
                        }
                        return value;
                    });

                    const state = JSON.parse(savedChannelState, (key, value) => {
                        if (typeof value === 'string' && /^\d+n$/.test(value)) {
                            return BigInt(value.substring(0, value.length - 1));
                        }
                        return value;
                    });

                    if (channel.participants[0] === walletSnap.walletAddress) {
                        const app = new AdjudicatorApp();

                        NitroliteStore.setChannelContext(channel, state, app);
                        WalletStore.setChannelOpen(true);
                        console.log('Restored channel from localStorage');
                    }
                }
            } catch (error) {
                console.error('Failed to restore channel from localStorage:', error);
                localStorage.removeItem(STORAGE_KEYS.CHANNEL);
                localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
                localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);
            }
        }
    }, [walletSnap.walletAddress]);

    const saveChannelToStorage = useCallback((channel: Channel, state: State, channelId: string) => {
        try {
            const channelData = JSON.stringify(channel, (key, value) =>
                typeof value === 'bigint' ? value.toString() + 'n' : value,
            );

            const stateData = JSON.stringify(state, (key, value) =>
                typeof value === 'bigint' ? value.toString() + 'n' : value,
            );

            localStorage.setItem(STORAGE_KEYS.CHANNEL, channelData);
            localStorage.setItem(STORAGE_KEYS.CHANNEL_STATE, stateData);
            localStorage.setItem(STORAGE_KEYS.CHANNEL_ID, channelId);

            console.log('Saved channel data to localStorage');
        } catch (error) {
            console.error('Failed to save channel to localStorage:', error);
        }
    }, []);

    const handleCreateChannel = useCallback(
        async (tokenAddress: Address, amount: string) => {
            if (!NitroliteStore.state.stateSigner) {
                throw new Error('Nitrolite stateSigner not initialized');
            }

            const chainId = activeChain?.id;

            if (!chainId) {
                throw new Error('No active chain selected');
            }

            const app = new AdjudicatorApp();
            const adjudicator = APP_CONFIG.ADJUDICATORS[APP_CONFIG.DEFAULT_ADJUDICATOR][chainId] as Address;

            if (!adjudicator) {
                throw new Error('Adjudicator address not found');
            }

            const stateSigner = NitroliteStore.state.stateSigner;

            WalletStore.setChannelOpen(true);

            try {
                const channel: Channel = {
                    participants: [stateSigner.address as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                    adjudicator,
                    challenge: BigInt(APP_CONFIG.CHANNEL.CHALLENGE_PERIOD),
                    nonce: BigInt(Date.now()),
                };

                const amountBigInt = parseTokenUnits(tokenAddress, amount);

                // Create initial app state
                const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_OPEN;

                // Create initial channel state
                const initialState: State = {
                    data: app.encode(appState),
                    allocations: [
                        {
                            destination: WalletStore.state.walletAddress as Address,
                            token: tokenAddress,
                            amount: amountBigInt,
                        },
                        {
                            destination: channel.participants[1],
                            token: tokenAddress,
                            amount: BigInt(0),
                        },
                    ],
                    sigs: [],
                };

                // Create channel context with initial state
                const channelContext = NitroliteStore.setChannelContext(channel, initialState, app);
                const channelId = channelContext.getChannelId();

                // Sign the initial state
                const stateHash = channelContext.getStateHash(initialState);
                const [signature] = await stateSigner.sign(stateHash, true);
                const parsedSig = parseSignature(signature as Hex);

                initialState.sigs = [
                    {
                        r: parsedSig.r,
                        s: parsedSig.s,
                        v: Number(parsedSig.v),
                    },
                ];

                // Update the channel context with the signed initial state
                NitroliteStore.setChannelContext(channel, initialState, app);

                // Save channel data to localStorage
                saveChannelToStorage(channel, initialState, channelId);

                // Create the channel on-chain
                await NitroliteStore.createChannel(channelId);

                return { channelId, tokenAddress, amount: amountBigInt.toString() };
            } catch (error) {
                // If anything fails, mark channel as closed
                WalletStore.setChannelOpen(false);
                throw error;
            }
        },
        [activeChain, saveChannelToStorage],
    );

    // Function to deposit to a channel
    const handleDepositToChannel = useCallback(async (tokenAddress: Address, amount: string) => {
        try {
            // Convert to BigInt if it's not already
            const amountBigInt =
                typeof amount === 'string' && !amount.startsWith('0x')
                    ? parseTokenUnits(tokenAddress, amount)
                    : BigInt(amount);

            await NitroliteStore.state.client.deposit(tokenAddress, amountBigInt);

            // Update your wallet store that channel is open
            WalletStore.openChannel(tokenAddress, amountBigInt.toString());

            return true;
        } catch (depositError) {
            console.error('Deposit error:', depositError);

            // Provide specific error for deposit failure
            if (String(depositError).includes('approve') && String(depositError).includes('not been authorized')) {
                throw new Error(
                    'Token approval was rejected. Please approve the USDC spend in your wallet to proceed.',
                );
            }

            // Provide specific error for other common issues
            if (String(depositError).includes('user rejected transaction')) {
                throw new Error('Transaction was rejected. Please confirm the transaction in your wallet.');
            }

            throw depositError;
        }
    }, []);

    // Function to clear stored channel data
    const clearStoredChannel = useCallback(() => {
        localStorage.removeItem(STORAGE_KEYS.CHANNEL);
        localStorage.removeItem(STORAGE_KEYS.CHANNEL_STATE);
        localStorage.removeItem(STORAGE_KEYS.CHANNEL_ID);
        console.log('Cleared channel data from localStorage');
    }, []);

    return {
        handleCreateChannel,
        handleDepositToChannel,
        clearStoredChannel,
    };
}
