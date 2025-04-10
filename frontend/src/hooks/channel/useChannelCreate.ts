import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { Address, Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import { NitroliteStore, WalletStore, SettingsStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { Channel, State } from '@erc7824/nitrolite';
import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';

export function useChannelCreate() {
    const { activeChain } = useSnapshot(SettingsStore.state);

    // Function to create a channel without depositing
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

            console.log('Creating channel with stateSigner:', stateSigner.address);

            // Set the channel open flag
            WalletStore.setChannelOpen(true);

            try {
                const channel: Channel = {
                    participants: [stateSigner.address as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                    adjudicator,
                    challenge: BigInt(APP_CONFIG.CHANNEL.CHALLENGE_PERIOD),
                    nonce: BigInt(Date.now()),
                };

                // Parse amount to BigInt with proper decimals
                const amountBigInt = parseTokenUnits(tokenAddress, amount);

                console.log('amountBigInt', amountBigInt);
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

                // Create the channel on-chain
                await NitroliteStore.createChannel(channelId);

                return { channelId, tokenAddress, amount: amountBigInt.toString() };
            } catch (error) {
                // If anything fails, mark channel as closed
                WalletStore.setChannelOpen(false);
                throw error;
            }
        },
        [activeChain],
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

    // Combined function that does both in sequence
    // const handleCreateAndDeposit = useCallback(
    //     async (tokenAddress: Address, amount: string) => {
    //         const { channelId } = await handleCreateChannel(tokenAddress, amount);

    //         await handleDepositToChannel(channelId, tokenAddress, amount);
    //         return channelId;
    //     },
    //     [handleCreateChannel, handleDepositToChannel],
    // );

    return {
        handleCreateChannel,
        handleDepositToChannel,
        // handleCreateAndDeposit,
    };
}
