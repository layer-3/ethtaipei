import { useCallback } from 'react';
import { Address, Hex, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import NitroliteStore from '@/store/NitroliteStore';
import WalletStore from '@/store/WalletStore';
import APP_CONFIG from '@/config/app';
import { Channel, State } from '@erc7824/nitrolite';

export function useChannelCreate() {
    const handleCreateChannel = useCallback(async (tokenAddress: Address, amount: string) => {
        if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
            const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

            throw new Error(errorMsg);
        }

        // Create Counter application instance
        const app = new AdjudicatorApp();
        const adjudicator = APP_CONFIG.ADJUDICATORS[APP_CONFIG.DEFAULT_ADJUDICATOR][
            WalletStore.state.chainId
        ] as Address;

        if (!adjudicator) {
            throw new Error('Adjudicator address not found');
        }

        const stateSigner = NitroliteStore.state.stateSigner;

        // Set the channel open flag first
        WalletStore.setChannelOpen(true);

        try {
            const channel: Channel = {
                // participants: [WalletStore.state.account as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                participants: [stateSigner.address as Address, APP_CONFIG.CHANNEL.DEFAULT_GUEST as Address],
                adjudicator: adjudicator,
                challenge: BigInt(APP_CONFIG.CHANNEL.CHALLENGE_PERIOD),
                nonce: BigInt(Date.now()),
            };

            // Create initial app state
            const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_OPEN;

            // Create initial channel state
            const initialState: State = {
                data: app.encode(appState),
                allocations: [
                    {
                        // destination: channel.participants[0],
                        destination: WalletStore.state.account as Address,
                        token: tokenAddress,
                        amount: BigInt(amount),
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

            await NitroliteStore.deposit(channelId, tokenAddress as Address, amount);

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
