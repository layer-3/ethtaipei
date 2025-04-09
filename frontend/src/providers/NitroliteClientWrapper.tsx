import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { NitroliteClient } from '@erc7824/nitrolite';

import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import NitroliteStore from '@/store/NitroliteStore';
import APP_CONFIG from '@/config/app';

import { usePrivy, useWallets } from '@privy-io/react-auth';

interface NitroliteClientWrapperProps {
    children?: React.ReactNode;
}

export function NitroliteClientWrapper({ children }: NitroliteClientWrapperProps) {
    const { ready } = usePrivy();
    const { wallets } = useWallets();
    const { activeChain } = useSnapshot(SettingsStore.state);

    useEffect(() => {
        // Only proceed if Privy is ready & we have an active chain
        if (!ready || !activeChain) return;

        // Example: pick the embedded wallet
        console.log('wallets', wallets);
        const embeddedWallet = wallets.find((w) => w.type === 'ethereum');

        if (!embeddedWallet) {
            console.warn('No embedded wallet found. Please connect or create one before using Nitrolite.');
            return;
        }

        const initializeNitrolite = async () => {
            try {
                // 1) Create a Public Client
                const publicClient = createPublicClient({
                    transport: http(),
                    chain: activeChain,
                });

                // 2) Get the EIP-1193 provider from your embedded wallet
                const eip1193Provider = await embeddedWallet.getEthereumProvider();

                // 3) Create the Wallet Client
                const walletClient = createWalletClient({
                    transport: custom(eip1193Provider),
                    chain: activeChain,
                    account: embeddedWallet.address,
                });

                // 4) Build addresses from config (custody, adjudicators)
                const addresses = {
                    custody: APP_CONFIG.CUSTODIES[activeChain.id],
                    adjudicators: APP_CONFIG.ADJUDICATORS,
                };

                // 5) Instantiate Nitrolite Client
                const client = new NitroliteClient({
                    publicClient,
                    walletClient,
                    account: walletClient.account,
                    chainId: activeChain.id,
                    addresses,
                });

                // 6) Save to store
                NitroliteStore.setClient(client);
                console.log('Nitrolite client initialized!');
            } catch (error) {
                console.error('Failed to initialize Nitrolite client:', error);
                WalletStore.setError('Failed to initialize Nitrolite client');
            }
        };

        initializeNitrolite();
    }, [ready, wallets, activeChain]);

    // Option 1: If you want to block rendering until Nitrolite is set:
    // - can check if NitroliteStore.state.client is non-null

    // Here we just always render children
    return <>{children}</>;
}
