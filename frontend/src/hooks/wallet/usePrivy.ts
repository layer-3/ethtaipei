'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { Address } from 'viem';
import { fetchBalances } from '@/store/AssetsStore';
import { chains } from '@/config/chains';

// Storage key for wallet connection
const PRIVY_CONNECTION_KEY = 'privy_connection';

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

    // Initialize wallet connection when Privy is ready and authenticated
    useEffect(() => {
        const initConnection = async () => {
            if (authenticated && wallets.length > 0) {
                const activeWallet = wallets[0];

                if (activeWallet.address && !walletSnap.connected) {
                    // Update our store with wallet info
                    WalletStore.connect(activeWallet.address as Address, 'privy');

                    // Set active chain if wallet has chainId
                    if (activeWallet.chainId) {
                        // @ts-ignore Find chain by ID (assuming chainId is number)
                        const targetChain = chains.find((chain) => String(chain.id) === String(activeWallet.chainId));

                        if (targetChain) {
                            SettingsStore.setActiveChain(targetChain);
                        }
                    }

                    // Fetch token balances
                    if (settingsSnap.activeChain) {
                        fetchBalances(activeWallet.address as Address, settingsSnap.activeChain);
                    }
                }
            }
        };

        if (ready && authenticated) {
            initConnection();
        }
    }, [ready, authenticated, wallets, walletSnap.connected, settingsSnap.activeChain]);

    // Connect to Privy
    const connect = useCallback(async () => {
        if (!ready) {
            WalletStore.setError('Privy is not ready');
            return;
        }

        try {
            if (!authenticated) {
                await login();
                return;
            }

            if (wallets.length > 0 && !walletSnap.connected) {
                const activeWallet = wallets[0];
                const address = activeWallet.address;
                // @ts-ignore Find chain by ID (assuming chainId is number)
                const targetChain = chains.find((chain) => String(chain.id) === String(activeWallet.chainId));

                if (address) {
                    WalletStore.connect(address as Address, 'privy');
                    if (targetChain) {
                        SettingsStore.setActiveChain(targetChain);
                    }
                    localStorage.setItem(PRIVY_CONNECTION_KEY, 'true');
                    if (targetChain) {
                        fetchBalances(address as Address, targetChain);
                    }
                } else {
                    WalletStore.setError('No wallet address available after authentication');
                }
            } else if (wallets.length === 0) {
                WalletStore.setError('No wallets available after authentication');
            }
        } catch (error) {
            console.error('Error connecting to Privy:', error);
            WalletStore.setError('Failed to connect to Privy');
        }
    }, [ready, authenticated, wallets, login, walletSnap.connected, settingsSnap.activeChain]);

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
