import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { NitroliteClient } from '@erc7824/nitrolite';

import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import NitroliteStore from '@/store/NitroliteStore';
import APP_CONFIG from '@/config/app';

// 1) Pull in Privy’s useWallets hook
import { usePrivy, useWallets } from '@privy-io/react-auth';

export function useNitroliteClient() {
    // 2) Instead of relying on walletState from your store or window.ethereum,
    //    get the user’s connected wallets from Privy
    const { ready } = usePrivy();
    const { wallets } = useWallets();
    const { activeChain } = useSnapshot(SettingsStore.state);

    useEffect(() => {
        // Only proceed if user’s wallets array is populated & we have an active chain
        if (!ready || !activeChain) return;

        // 3) Pick a user wallet from the array. For example, find an embedded wallet:
        const embeddedWallet = wallets.find((w) => w.type === 'ethereum');

        if (!embeddedWallet) {
            console.error('No embedded wallet found. Please connect one before using Nitrolite.');
            return;
        }

        // 4) The address for our wallet
        const address = embeddedWallet.address;

        const initializeClient = async () => {
            try {
                const chain = activeChain;

                if (!chain) throw new Error('No active chain selected');

                // Create a public client (reads chain data via RPC)
                const publicClient = createPublicClient({
                    transport: http(),
                    chain,
                });

                // Get an EIP-1193 provider from the embedded wallet
                // (This is how we sign transactions, messages, etc.)
                const eip1193Provider = await embeddedWallet.getEthereumProvider();

                // Create a Viem wallet client
                const walletClient = createWalletClient({
                    transport: custom(eip1193Provider),
                    chain,
                    // @ts-ignore
                    account: address,
                });

                console.log('walletClient', walletClient);

                // Setup addresses for your custody and adjudicators
                const addresses = {
                    custody: APP_CONFIG.CUSTODIES[chain.id],
                    adjudicators: APP_CONFIG.ADJUDICATORS,
                };

                // Finally, create the Nitrolite client
                const client = new NitroliteClient({
                    // @ts-ignore
                    publicClient,
                    walletClient,
                    account: walletClient.account,
                    chainId: chain.id,
                    addresses,
                });

                console.log('client', client);

                // Save client to your Nitrolite store
                NitroliteStore.setClient(client);
            } catch (error) {
                console.error('Failed to initialize Nitrolite client:', error);
                WalletStore.setError('Failed to initialize Nitrolite client');
            }
        };

        initializeClient();
    }, [ready, activeChain, wallets]);

    return null;
}
