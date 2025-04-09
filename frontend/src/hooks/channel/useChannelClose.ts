import { useCallback } from 'react';
import { Address, createWalletClient, Hex, http, parseSignature } from 'viem';
import { AdjudicatorApp } from '@/services/apps/adjudicator_app';
import NitroliteStore from '@/store/NitroliteStore';
import WalletStore from '@/store/WalletStore';
import APP_CONFIG from '@/config/app';
import { State } from '@erc7824/nitrolite';
import { createEthersSigner } from '@/websocket';

export function useChannelClose() {
    const handleCloseChannel = useCallback(async (tokenAddress: string, amount: string) => {
        if (!NitroliteStore.state.client || !NitroliteStore.state.client.walletClient) {
            const errorMsg = 'Nitrolite client not initialized - please connect your wallet first';

            throw new Error(errorMsg);
        }

        // Create Counter application instance
        const app = new AdjudicatorApp();

        const stateSigner = NitroliteStore.state.stateSigner;

        // Set the channel open flag first
        WalletStore.setChannelOpen(true);

        try {
            // Create initial app state
            const appState = APP_CONFIG.CHANNEL.MAGIC_NUMBER_CLOSE;

            const channelContext = NitroliteStore.getChannelContext();
            const channelId = channelContext.getChannelId();

            const finalState: State = {
                data: app.encode(appState),
                allocations: [
                    {
                        destination: WalletStore.state.walletAddress as Address,
                        token: tokenAddress as Address,
                        amount: BigInt(amount),
                    },
                    {
                        destination: channelContext.channel.participants[1],
                        token: tokenAddress as Address,
                        amount: BigInt(0),
                    },
                ],
                sigs: [],
            };

            // Get state hash for signing
            const stateHash = channelContext.getStateHash(finalState);

            const [signature] = await stateSigner.sign(stateHash);

            // TODO:

            const guestSigner = createEthersSigner(APP_CONFIG.CHANNEL.GUEST_KEY as Hex);

            const [guestSignature] = await guestSigner.sign(stateHash);
            const pss = [parseSignature(signature as Hex), parseSignature(guestSignature as Hex)];

            finalState.sigs = [
                {
                    r: pss[0].r,
                    s: pss[0].s,
                    v: +pss[0].v.toString(),
                },
                {
                    r: pss[1].r,
                    s: pss[1].s,
                    v: +pss[1].v.toString(),
                },
            ];

            await NitroliteStore.closeChannel(channelId, finalState);

            WalletStore.closeChannel();
        } catch (error) {
            WalletStore.setChannelOpen(false);
            throw error;
        }
    }, []);

    return {
        handleCloseChannel,
    };
}
