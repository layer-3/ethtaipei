'use client';

import React, { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { createPublicClient, createWalletClient, custom, Hex, http } from 'viem';
import { ContractAddresses, NitroliteClient } from '@erc7824/nitrolite';

import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import NitroliteStore from '@/store/NitroliteStore';
import APP_CONFIG from '@/config/app';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { createEthersSigner, generateKeyPair } from '@/websocket/crypto';

const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';

interface NitroliteClientWrapperProps {
    children?: React.ReactNode;
}

export function NitroliteClientWrapper({ children }: NitroliteClientWrapperProps) {
    const { ready } = usePrivy();
    const { wallets } = useWallets();
    const { activeChain } = useSnapshot(SettingsStore.state);

    const initializeKeys = useCallback(async (): Promise<{ keyPair: any; stateWalletClient: any | null }> => {
        try {
            let keyPair = null;
            const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

            if (savedKeys) {
                try {
                    keyPair = JSON.parse(savedKeys);
                } catch (error) {
                    console.error('Error while parsing savedKeys', error);

                    keyPair = null;
                }
            }

            if (!keyPair) {
                keyPair = await generateKeyPair();
                if (typeof window !== 'undefined') {
                    localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(keyPair));
                }
            }

            const signer = createEthersSigner(keyPair.privateKey);

            const wallet = new ethers.Wallet(keyPair.privateKey);

            const stateWalletClient = {
                ...wallet,
                account: {
                    address: wallet.address,
                },
                signMessage: async ({ message: { raw } }: { message: { raw: string } }) => {
                    const flatSignature = await wallet._signingKey().signDigest(raw);

                    const signature = ethers.utils.joinSignature(flatSignature);

                    return signature as Hex;
                },
            };

            console.log(stateWalletClient);

            NitroliteStore.setStateSigner(signer);

            return { keyPair, stateWalletClient };
        } catch (error) {
            console.error('Failed to initialize keys:', error);
            return { keyPair: null, stateWalletClient: null };
        }
    }, []);

    useEffect(() => {
        if (!ready || !activeChain) return;

        const embeddedWallet = wallets.find((w) => w.type === 'ethereum');

        if (!embeddedWallet) {
            console.warn('No embedded wallet found. Please connect one before using Nitrolite.');
            return;
        }

        const initializeNitrolite = async () => {
            try {
                const keyInitResult = await initializeKeys();

                if (!keyInitResult || !keyInitResult.stateWalletClient) {
                    throw new Error('Failed to initialize state wallet client keys.');
                }
                const { stateWalletClient } = keyInitResult;

                const publicClient = createPublicClient({
                    transport: http(),
                    chain: activeChain,
                });

                const eip1193Provider = await embeddedWallet.getEthereumProvider();

                const walletClient = createWalletClient({
                    transport: custom(eip1193Provider),
                    chain: activeChain,
                    account: embeddedWallet.address as Hex,
                });

                const addresses: ContractAddresses = {
                    custody: APP_CONFIG.CUSTODIES[activeChain.id],
                    adjudicator: APP_CONFIG.ADJUDICATORS[activeChain.id],
                    guestAddress: APP_CONFIG.CHANNEL.DEFAULT_GUEST as Hex,
                    tokenAddress: APP_CONFIG.TOKENS[activeChain.id] as Hex,
                };

                const challengeDuration = APP_CONFIG.CHANNEL.CHALLENGE_PERIOD;

                const client = new NitroliteClient({
                    // @ts-ignore
                    publicClient,
                    // @ts-ignore
                    walletClient,
                    // @ts-ignore
                    stateWalletClient: stateWalletClient,
                    account: walletClient.account,
                    chainId: activeChain.id,
                    challengeDuration: challengeDuration,
                    addresses,
                });

                NitroliteStore.setClient(client);

                console.log('Nitrolite client initialized!');
            } catch (error) {
                console.error('Failed to initialize Nitrolite client:', error);
                WalletStore.setError('Failed to initialize Nitrolite client');
            }
        };

        initializeNitrolite();
    }, [ready, wallets, activeChain, initializeKeys]);

    return <>{children}</>;
}
