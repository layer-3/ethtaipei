import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { NitroliteClient } from '@erc7824/nitrolite';

import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import NitroliteStore from '@/store/NitroliteStore';
import APP_CONFIG from '@/config/app';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useTransactionHistory } from '../debug/useTransactionHistory';
import { useResponseTracking } from '../debug/useResponseTracking';

export function useNitroliteClient() {
    const { setResponse, setLoading } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();
    const { ready } = usePrivy();
    const { wallets } = useWallets();
    const { activeChain } = useSnapshot(SettingsStore.state);

    useEffect(() => {
        if (!ready || !activeChain) return;

        setLoading('nitroliteInit', true);
        setResponse('nitroliteInit', { status: 'Initializing Nitrolite client...', success: false });

        const embeddedWallet = wallets.find((w) => w.type === 'ethereum');

        if (!embeddedWallet) {
            const errorMsg = 'No embedded wallet found. Please connect one before using Nitrolite.';

            setResponse('nitroliteInit', { error: errorMsg, success: false });
            addToHistory('NITROLITE_INIT', 'error', errorMsg);
            setLoading('nitroliteInit', false);

            console.error(errorMsg);
            return;
        }

        const address = embeddedWallet.address;

        const initializeClient = async () => {
            try {
                setResponse('nitroliteInit', {
                    status: 'Setting up chain configuration...',
                    success: false,
                });

                const chain = activeChain;

                if (!chain) {
                    throw new Error('No active chain selected');
                }

                // Create a public client (reads chain data via RPC)
                setResponse('nitroliteInit', {
                    status: 'Creating public client...',
                    success: false,
                });

                const publicClient = createPublicClient({
                    transport: http(),
                    chain,
                });

                // Get an EIP-1193 provider from the embedded wallet
                setResponse('nitroliteInit', {
                    status: 'Getting wallet provider...',
                    success: false,
                });

                const eip1193Provider = await embeddedWallet.getEthereumProvider();

                // Create a Viem wallet client
                setResponse('nitroliteInit', {
                    status: 'Creating wallet client...',
                    success: false,
                });

                const walletClient = createWalletClient({
                    transport: custom(eip1193Provider),
                    chain,
                    // @ts-ignore
                    account: address,
                });

                // Setup addresses for your custody and adjudicators
                const addresses = {
                    custody: APP_CONFIG.CUSTODIES[chain.id],
                    adjudicators: APP_CONFIG.ADJUDICATORS.dummy[chain.id],
                };

                // Finally, create the Nitrolite client
                setResponse('nitroliteInit', {
                    status: 'Creating Nitrolite client...',
                    success: false,
                });

                const client = new NitroliteClient({
                    // @ts-ignore
                    publicClient,
                    walletClient,
                    account: walletClient.account,
                    chainId: chain.id,
                    addresses,
                });

                // Save client to your Nitrolite store
                NitroliteStore.setClient(client);

                setResponse('nitroliteInit', {
                    status: 'Nitrolite client initialized successfully',
                    data: {
                        chain: chain.name,
                        chainId: chain.id,
                        account: address,
                    },
                    success: true,
                });

                addToHistory('NITROLITE_INIT', 'success', 'Nitrolite client initialized successfully', {
                    chain: chain.name,
                    chainId: chain.id,
                    account: address,
                    timestamp: Date.now(),
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                console.error('Failed to initialize Nitrolite client:', error);
                WalletStore.setError('Failed to initialize Nitrolite client');

                setResponse('nitroliteInit', {
                    error: `Failed to initialize Nitrolite client: ${errorMessage}`,
                    success: false,
                });

                addToHistory('NITROLITE_INIT', 'error', `Failed to initialize Nitrolite client: ${errorMessage}`);
            } finally {
                setLoading('nitroliteInit', false);
            }
        };

        initializeClient();
    }, [ready, activeChain, wallets, setResponse, setLoading, addToHistory]);

    return null;
}
