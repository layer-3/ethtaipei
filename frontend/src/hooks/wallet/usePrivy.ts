'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { Address } from 'viem';
import { generateKeyPair, createEthersSigner, createWebSocketClient } from '@/websocket';
import APP_CONFIG from '@/config/app';
import { NitroliteStore } from '@/store';
import { fetchBalances } from '@/store/AssetsStore';
import { chains } from '@/config/chains';

// Storage key for wallet connection
const PRIVY_CONNECTION_KEY = 'privy_connection';

// Constants for WebSocket
const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';

// Static export for disconnect function that can be used outside of components
export const disconnectPrivy = async () => {
    // Clear local state
    WalletStore.disconnect();

    // Remove persisted connection
    if (typeof window !== 'undefined') {
        localStorage.removeItem(PRIVY_CONNECTION_KEY);
    }
};

export function usePrivyWallet() {
    const [isReady, setIsReady] = useState<boolean>(false);
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    const { login, authenticated, ready, user, logout } = usePrivy();
    const { wallets } = useWallets();

    // Check if Privy is ready
    useEffect(() => {
        if (ready) {
            setIsReady(true);
        }
    }, [ready]);

    // Helper function to initialize keys and WebSocket
    const initializeKeysAndWebSocket = async () => {
        try {
            console.log('Initializing crypto keys and WebSocket connection');

            // Check if we already have keys
            let keyPair = null;
            const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

            if (savedKeys) {
                try {
                    keyPair = JSON.parse(savedKeys);
                    console.log('Using existing crypto keys');
                } catch (error) {
                    console.error('Failed to parse saved keys:', error);
                    keyPair = null;
                }
            }

            // Generate new keys if none exist
            if (!keyPair) {
                console.log('Generating new crypto keys');
                keyPair = await generateKeyPair();

                // Store the keys in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(keyPair));
                }
            }

            // Create a signer with the private key
            const signer = createEthersSigner(keyPair.privateKey);

            NitroliteStore.setStateSigner(signer);

            // Create and connect WebSocket client
            const wsUrl = APP_CONFIG.WEBSOCKET.URL;
            const client = createWebSocketClient(wsUrl, signer, {
                autoReconnect: true,
                reconnectDelay: 1000,
                maxReconnectAttempts: 5,
                requestTimeout: 10000,
            });

            // Connect to WebSocket and authenticate
            try {
                await client.connect();
                console.log('WebSocket connection established and authenticated');
            } catch (wsError) {
                console.error('WebSocket connection failed:', wsError);
                // Continue execution even if WebSocket fails - we still have the keys
            }

            return { keyPair, client };
        } catch (error) {
            console.error('Error initializing keys and WebSocket:', error);
            // We don't throw here to avoid breaking the wallet connection
            // Just log the error and return null
            return null;
        }
    };

    // Initialize WebSocket connection when Privy is ready
    useEffect(() => {
        const initConnection = async () => {
            if (authenticated && wallets.length > 0) {
                const activeWallet = wallets[0];

                if (activeWallet.address && !walletSnap.connected) {
                    // Update our store with wallet info
                    WalletStore.connect(activeWallet.address as Address, 'privy');

                    // Set active chain if wallet has chainId
                    if (activeWallet.chainId) {
                        // @ts-ignore
                        const targetChain = chains.find((chain) => chain.id === activeWallet.chainId);

                        if (targetChain) {
                            SettingsStore.setActiveChain(targetChain);
                        }
                    }

                    // Fetch token balances
                    if (settingsSnap.activeChain) {
                        fetchBalances(activeWallet.address as Address, settingsSnap.activeChain);
                    }
                }

                // Initialize crypto keys and WebSocket connection
                await initializeKeysAndWebSocket();
            }
        };

        if (ready && authenticated) {
            initConnection();
        }
    }, [ready, authenticated, wallets, walletSnap.connected]);

    // Connect to Privy - simplified since wallet connection happens earlier
    const connect = useCallback(async () => {
        if (!ready) {
            WalletStore.setError('Privy is not ready');
            return;
        }

        try {
            if (!authenticated) {
                await login();
                return; // Login flow will trigger useEffect after authentication
            }

            if (wallets.length === 0) {
                WalletStore.setError('No wallets available');
                return;
            }

            // Use the first wallet by default
            const activeWallet = wallets[0];

            // Get the wallet address and chain ID
            const address = activeWallet.address;
            const chainId = activeWallet.chainId || 1;

            if (!address) {
                WalletStore.setError('No wallet address available');
                return;
            }

            // Update store
            WalletStore.connect(address as Address, 'privy');

            // Set active chain if wallet has chainId
            if (chainId) {
                const targetChain = chains.find((chain) => chain.id === chainId);

                if (targetChain) {
                    SettingsStore.setActiveChain(targetChain);
                }
            }

            // Save connection state to localStorage
            localStorage.setItem(PRIVY_CONNECTION_KEY, 'true');

            // Fetch token balances
            if (settingsSnap.activeChain) {
                fetchBalances(address as Address, settingsSnap.activeChain);
            }

            // Initialize crypto keys and WebSocket connection
            await initializeKeysAndWebSocket();
        } catch (error) {
            console.error('Error connecting to Privy:', error);
            WalletStore.setError('Failed to connect to Privy');
        }
    }, [ready, authenticated, wallets, login]);

    // Disconnect from Privy
    const disconnect = useCallback(async () => {
        try {
            await logout();
            await disconnectPrivy();
        } catch (error) {
            console.error('Error disconnecting from Privy:', error);
        }
    }, [logout]);

    // Switch network for Privy wallet
    const switchNetwork = async (chainId: number) => {
        if (!authenticated || wallets.length === 0) return;

        try {
            // Find the embedded Privy wallet specifically
            const embeddedPrivyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');

            if (!embeddedPrivyWallet) {
                console.log('No embedded Privy wallet found');
                return;
            }

            // Find the target chain
            const targetChain = chains.find((chain) => chain.id === chainId);

            if (!targetChain) {
                console.log('Chain not supported:', chainId);
                return;
            }

            // Switch chain
            await embeddedPrivyWallet.switchChain(chainId);

            // Update SettingsStore with the new active chain
            SettingsStore.setActiveChain(targetChain);

            // Refresh balances after chain switch
            if (walletSnap.walletAddress) {
                fetchBalances(walletSnap.walletAddress, targetChain);
            }
        } catch (error) {
            console.error('Error switching network:', error);
            WalletStore.setError('Failed to switch network');
        }
    };

    return {
        isReady,
        isConnected: authenticated && walletSnap.connected,
        account: walletSnap.walletAddress,
        chainId: settingsSnap.activeChain?.id,
        error: walletSnap.error,
        connect,
        disconnect,
        switchNetwork,
        wallets,
        activeChain: settingsSnap.activeChain,
    };
}
