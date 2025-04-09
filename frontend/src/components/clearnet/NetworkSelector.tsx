'use client';

import { useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { chains, chainImageURLById } from '@/config/chains';
import { usePrivyWallet } from '@/hooks';

interface NetworkSelectorProps {
    onNetworkChange?: (chainId: number) => void;
    className?: string;
}

export default function NetworkSelector({ onNetworkChange, className = '' }: NetworkSelectorProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const { switchNetwork } = usePrivyWallet();

    // Use the chain from SettingsStore
    const currentChain = useMemo(() => {
        if (settingsSnap.activeChain) {
            return settingsSnap.activeChain;
        }

        // Default to Polygon if no chain is selected
        const polygonChain = chains.find((chain) => chain.id === 137);

        if (polygonChain) {
            // This updates the UI without triggering a storage update
            return polygonChain;
        }

        // Fallback to first available chain
        return chains[0];
    }, [settingsSnap.activeChain]);

    const handleNetworkChange = useCallback(
        async (chainId: number) => {
            if (onNetworkChange) {
                onNetworkChange(chainId);
            } else {
                // Find the target chain
                const targetChain = chains.find((chain) => chain.id === chainId);

                if (!targetChain) return;

                // Update the SettingsStore first
                SettingsStore.setActiveChain(targetChain);

                // Then attempt to switch the wallet's network based on provider
                if (walletSnap.walletProvider === 'privy') {
                    await switchNetwork(chainId);
                } else if (walletSnap.walletProvider === 'metamask') {
                    WalletStore.switchChain(chainId);
                }
            }
        },
        [onNetworkChange, walletSnap.walletProvider, switchNetwork],
    );

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => document.getElementById('network-dropdown')?.classList.toggle('hidden')}
                className="flex items-center gap-2 bg-gray-100 rounded-md px-3 py-2 text-sm hover:bg-gray-200 transition-colors">
                {currentChain && chainImageURLById(currentChain.id) ? (
                    <Image
                        src={chainImageURLById(currentChain.id) || ''}
                        alt={currentChain.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-5 h-5 bg-gray-300 rounded-full" />
                )}
                <span>{currentChain?.name || 'Polygon'}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                id="network-dropdown"
                className="absolute z-10 mt-1 hidden w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1 max-h-64 overflow-y-auto">
                    {chains.map((chain) => (
                        <button
                            key={chain.id}
                            onClick={() => {
                                handleNetworkChange(chain.id);
                                document.getElementById('network-dropdown')?.classList.add('hidden');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm w-full text-left hover:bg-gray-100 ${
                                chain.id === currentChain?.id ? 'bg-gray-50' : ''
                            }`}>
                            {chainImageURLById(chain.id) ? (
                                <Image
                                    src={chainImageURLById(chain.id) || ''}
                                    alt={chain.name}
                                    width={20}
                                    height={20}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="w-5 h-5 bg-gray-300 rounded-full" />
                            )}
                            <span>{chain.name}</span>
                            {chain.id === currentChain?.id && (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 ml-auto"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
