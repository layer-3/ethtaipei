'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { chains, chainImageURLById } from '@/config/chains';
import { usePrivyWallet } from '@/hooks';
import { ChewronDownIcon } from '@/assets/images/ChewronDownIcon';
import { CheckIcon } from '@/assets/images/CheckIcon';

interface NetworkSelectorProps {
    onNetworkChange?: (chainId: number) => void;
    className?: string;
}

export default function NetworkSelector({ onNetworkChange, className = '' }: NetworkSelectorProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const { switchNetwork } = usePrivyWallet();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-neutral-control-color-20 rounded-md px-3 py-2 text-sm hover:bg-neutral-control-color-40 transition-colors text-text-color-100">
                {currentChain && chainImageURLById(currentChain.id) ? (
                    <Image
                        src={chainImageURLById(currentChain.id) || ''}
                        alt={currentChain.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                    />
                ) : (
                    <div className="w-5 h-5 bg-neutral-control-color-40 rounded-full" />
                )}
                <span>{currentChain?.name || 'Polygon'}</span>
                <ChewronDownIcon className="h-4 w-4 text-text-color-100" />
            </button>

            {isDropdownOpen && (
                <div
                    id="network-dropdown"
                    className="absolute z-10 mt-1 w-48 rounded-md bg-main-background-color shadow-lg ring-1 ring-divider-color-20 ring-opacity-5 focus:outline-none">
                    <div className="py-1 max-h-64 overflow-y-auto">
                        {chains.map((chain) => (
                            <button
                                key={chain.id}
                                onClick={() => {
                                    handleNetworkChange(chain.id);
                                    setIsDropdownOpen(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 text-sm w-full text-left hover:bg-neutral-control-color-20 ${
                                    chain.id === currentChain?.id ? 'bg-neutral-control-color-10' : ''
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
                                    <div className="w-5 h-5 bg-neutral-control-color-40 rounded-full" />
                                )}
                                <span>{chain.name}</span>
                                {chain.id === currentChain?.id && <CheckIcon className="h-4 w-4 ml-auto" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
