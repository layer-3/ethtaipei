import { useCallback } from 'react';
import { Address, Hex, parseSignature } from 'viem';
import { CounterApp } from '@/services/apps/counter';
import NitroliteStore from '@/store/NitroliteStore';
import WalletStore from '@/store/WalletStore';
import APP_CONFIG from '@/config/app';
import { MessageType } from '@erc7824/nitrolite/dist/relay';
import { Channel, State } from '@erc7824/nitrolite';

export function useChannelCreate() {
    const handleCreateChannel = useCallback(async (tokenAddress: string, amount: string) => {
        if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
            const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

            throw new Error(errorMsg);
        }

        // Create Counter application instance
        const app = new CounterApp();

        // Set the channel open flag first
        WalletStore.setChannelOpen(true);

        try {
            const channel: Channel = {
                participants: [WalletStore.state.account as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                adjudicator: APP_CONFIG.ADJUDICATORS.flag as Address,
                challenge: BigInt(APP_CONFIG.CHANNEL.CHALLENGE_PERIOD),
                nonce: BigInt(Date.now()),
            };

            // Create initial app state
            const appState = { type: 'system' as MessageType, text: '0', sequence: '0' };

            // Create initial channel state
            const initialState: State = {
                data: app.encode(appState),
                allocations: [
                    {
                        destination: channel.participants[0],
                        token: tokenAddress as Address,
                        amount: BigInt(amount),
                    },
                    {
                        destination: channel.participants[1],
                        token: tokenAddress as Address,
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

            const address = WalletStore.state.account;

            if (!address) {
                throw new Error('No wallet connected');
            }

            await NitroliteStore.deposit(channelId, tokenAddress as Address, amount);

            // Get state hash for signing
            const stateHash = channelContext.getStateHash(
                appState,
                tokenAddress as Address,
                [BigInt(amount), BigInt(0)] as [bigint, bigint],
            );

            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [stateHash, address],
            });

            const parsedSig = parseSignature(signature as Hex);

            // We need to remove the EIP-191 prefix that MetaMask adds with personal_sign
            // When using personal_sign, v is either 27 or 28, but we need 0 or 1 for raw signatures
            // According to the Nitrolite protocol spec: "For signature verification, the stateHash is bare signed without EIP-191"
            let adjustedV = Number(parsedSig.v);

            // Critical: For Nitrolite protocol, the v value must be exactly 0 or 1
            // Force v to be either 0 or 1 as required by the contract
            if (adjustedV === 27) {
                adjustedV = 0;
            } else if (adjustedV === 28) {
                adjustedV = 1;
            } else if (adjustedV > 28) {
                adjustedV = adjustedV - 27;
            }

            // Ensure v is exactly 0 or 1 and nothing else
            adjustedV = adjustedV % 2; // This will force v to be either 0 or 1

            console.log('Removing EIP-191 prefix - adjusted v value:', adjustedV);

            // Update initial state with signature (without EIP-191 prefix)
            // Ensure the signature is correctly formatted according to the protocol specification
            initialState.sigs = [
                {
                    r: parsedSig.r,
                    s: parsedSig.s,
                    // According to the protocol, v should be 0 or 1
                    v: adjustedV,
                },
            ];

            NitroliteStore.setChannelContext(channel, initialState, app);

            await NitroliteStore.createChannel(channelId);

            WalletStore.openChannel(tokenAddress as Address, amount);
        } catch (error) {
            WalletStore.setChannelOpen(false);
            throw error;
        }
    }, []);

    return {
        handleCreateChannel,
    };
}
