import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { Address, Hex, parseSignature, parseUnits } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import NitroliteStore from '@/store/NitroliteStore';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import APP_CONFIG from '@/config/app';
import { Channel, State } from '@erc7824/nitrolite';

export function useChannelCreate() {
    const { activeChain } = useSnapshot(SettingsStore.state);

    const handleCreateChannel = useCallback(
        async (tokenAddress: Address, amount: string) => {
            if (!NitroliteStore.state.stateSigner) {
                const errorMsg = 'Nitrolite stateSigner not initialized';

                throw new Error(errorMsg);
            }

            // Get chain ID from SettingsStore's activeChain
            const chainId = activeChain?.id;

            if (!chainId) {
                throw new Error('No active chain selected');
            }

            // Create Counter application instance
            const app = new AdjudicatorApp();
            const adjudicator = APP_CONFIG.ADJUDICATORS[APP_CONFIG.DEFAULT_ADJUDICATOR][chainId] as Address;

            if (!adjudicator) {
                throw new Error('Adjudicator address not found');
            }

            const stateSigner = NitroliteStore.state.stateSigner;

            // Debug information
            console.log('Creating channel with stateSigner:', stateSigner.address);
            // Set the channel open flag first
            WalletStore.setChannelOpen(true);

            try {
                const channel: Channel = {
                    participants: [stateSigner.address as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                    adjudicator,
                    challenge: BigInt(APP_CONFIG.CHANNEL.CHALLENGE_PERIOD),
                    nonce: BigInt(Date.now()),
                };

                // For USDC, decimals = 6. Adjust if you have different tokens.
                const decimals = 6;

                // Convert user’s input "5" to on-chain amount "5000000" (bigint)
                const amountBigInt = parseUnits(amount, decimals);

                // Create initial app state
                const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_OPEN;

                // Create initial channel state
                const initialState: State = {
                    data: app.encode(appState),
                    allocations: [
                        {
                            destination: WalletStore.state.walletAddress as Address,
                            token: tokenAddress,
                            amount: amountBigInt, // Use the converted amount
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

                if (!window.ethereum) {
                    throw new Error('MetaMask is not installed');
                }

                // Pass the same converted amount to deposit
                try {
                    await NitroliteStore.deposit(channelId, tokenAddress, amountBigInt.toString());
                } catch (depositError) {
                    console.error('Deposit error:', depositError);
                    
                    // Provide specific error for deposit failure
                    if (String(depositError).includes('approve') && String(depositError).includes('not been authorized')) {
                        throw new Error(
                            'Token approval was rejected. Please approve the USDC spend in your wallet to proceed.'
                        );
                    }
                    
                    // Provide specific error for other common issues
                    if (String(depositError).includes('user rejected transaction')) {
                        throw new Error('Transaction was rejected. Please confirm the transaction in your wallet.');
                    }
                    
                    throw depositError;
                }

                // Sign the initial state
                const stateHash = channelContext.getStateHash(initialState);
                const [signature] = await stateSigner.sign(stateHash);
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

                // Finally, create the channel on-chain or in your contract
                await NitroliteStore.createChannel(channelId);

                // Update your wallet store that channel is open
                WalletStore.openChannel(tokenAddress, amountBigInt.toString());
            } catch (error) {
                // If anything fails, mark channel as closed
                WalletStore.setChannelOpen(false);
                throw error;
            }
        },
        [activeChain],
    );

    return {
        handleCreateChannel,
    };
}
