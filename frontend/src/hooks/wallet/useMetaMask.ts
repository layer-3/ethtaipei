import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { Address } from 'viem';
import { generateKeyPair, createEthersSigner, createWebSocketClient } from '@/websocket';
import APP_CONFIG from '@/config/app';
import { NitroliteStore } from '@/store';

// Storage key for wallet connection
const WALLET_CONNECTION_KEY = 'wallet_connection';

// Static export for disconnect function that can be used outside of components
export const disconnectWallet = async () => {
    // Note: MetaMask doesn't have a direct method to disconnect via the provider API
    // The best practice is to clear the local state
    WalletStore.disconnect();

    // Remove persisted connection
    if (typeof window !== 'undefined') {
        localStorage.removeItem(WALLET_CONNECTION_KEY);
    }

    // MetaMask may implement a disconnect method in the future
    // For now, we'll let the user know they need to disconnect manually if they want to connect a different account
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask) {
        console.log('MetaMask connection state cleared');
        // You can also show a notification to the user if needed
    }
};

// Constants for WebSocket
const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';

export function useMetaMask() {
    const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    // Check if MetaMask is installed
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMetaMaskInstalled(!!window.ethereum?.isMetaMask);
        }
    }, []);

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

    // Auto-reconnect to MetaMask if previously connected
    useEffect(() => {
        const reconnectWallet = async () => {
            if (window.ethereum && !walletSnap.connected) {
                try {
                    const savedConnection = localStorage.getItem(WALLET_CONNECTION_KEY);

                    if (savedConnection === 'true') {
                        // Get current accounts without showing the MetaMask popup
                        const accounts = await window.ethereum.request({
                            method: 'eth_accounts', // Uses eth_accounts instead of eth_requestAccounts to avoid popup
                        });

                        // @ts-ignore
                        if (accounts?.length > 0) {
                            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                            // @ts-ignore
                            const chainId = parseInt(chainIdHex, 16);

                            // Update store
                            WalletStore.connect(accounts[0] as Address, chainId);

                            // Check if we need to switch networks
                            if (settingsSnap.activeChain && settingsSnap.activeChain.id !== chainId) {
                                await switchNetwork(settingsSnap.activeChain.id);
                            }

                            // Initialize crypto keys and WebSocket connection
                            await initializeKeysAndWebSocket();
                        }
                    }
                } catch (error) {
                    console.error('Error auto-reconnecting to MetaMask:', error);
                }
            }
        };

        reconnectWallet();
    }, [settingsSnap.activeChain]);

    // Connect to MetaMask
    const connect = async () => {
        if (!window.ethereum) {
            WalletStore.setError('MetaMask is not installed');
            return;
        }

        try {
            // Request accounts
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            // @ts-ignore
            const chainId = parseInt(chainIdHex, 16);

            // Update store
            WalletStore.connect(accounts[0] as Address, chainId);

            // Save connection state to localStorage
            localStorage.setItem(WALLET_CONNECTION_KEY, 'true');

            // Check if we need to switch networks
            if (settingsSnap.activeChain && settingsSnap.activeChain.id !== chainId) {
                await switchNetwork(settingsSnap.activeChain.id);
            }

            // Initialize crypto keys and WebSocket connection
            await initializeKeysAndWebSocket();
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            WalletStore.setError('Failed to connect to MetaMask');
        }
    };

    // Disconnect from MetaMask - use the static function
    const disconnect = async () => {
        await disconnectWallet();
    };

    // Switch network
    const switchNetwork = async (chainId: number) => {
        if (!window.ethereum) return;

        try {
            // Try switching to the network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainId.toString(16)}` }],
            });

            // Update the store with the new chain ID
            WalletStore.setChainId(chainId);
        } catch (error: unknown) {
            // If the network doesn't exist in MetaMask, we need to add it
            if (error && typeof error === 'object' && 'code' in error && error.code === 4902) {
                // This would need chain-specific data like name, RPC URLs, etc.
                // Consider adding logic to add networks if needed
                console.error('Network not available in MetaMask', chainId);
                WalletStore.setError('Network not available in MetaMask');
            } else {
                console.error('Error switching network:', error);
                WalletStore.setError('Failed to switch network');
            }
        }
    };

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    // User disconnected their wallet
                    WalletStore.disconnect();
                    localStorage.removeItem(WALLET_CONNECTION_KEY);
                } else if (accounts[0] !== walletSnap.account) {
                    // Account changed
                    WalletStore.connect(accounts[0] as Address, walletSnap.chainId || 1);
                    localStorage.setItem(WALLET_CONNECTION_KEY, 'true');
                }
            };

            const handleChainChanged = (chainIdHex: string) => {
                const chainId = parseInt(chainIdHex, 16);

                WalletStore.setChainId(chainId);
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, [walletSnap.account, walletSnap.chainId]);

    return {
        isMetaMaskInstalled,
        isConnected: walletSnap.connected,
        account: walletSnap.account,
        chainId: walletSnap.chainId,
        error: walletSnap.error,
        connect,
        disconnect,
        switchNetwork,
    };
}
