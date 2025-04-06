'use client';

import { useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import { chains, chainImageURLById } from '@/config/chains';

interface NetworkSelectorProps {
    onNetworkChange?: (chainId: number) => void;
    className?: string;
}

export default function NetworkSelector({ onNetworkChange, className = '' }: NetworkSelectorProps) {
    const walletSnap = useSnapshot(WalletStore.state);

    const currentChain = useMemo(() => {
        return chains.find((chain) => chain.id === walletSnap.chainId);
    }, [walletSnap.chainId]);

    const handleNetworkChange = useCallback(
        (chainId: number) => {
            if (onNetworkChange) {
                onNetworkChange(chainId);
            } else {
                WalletStore.switchChain(chainId);
            }
        },
        [onNetworkChange],
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
                <span>{currentChain?.name || 'Select Network'}</span>
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
                                chain.id === walletSnap.chainId ? 'bg-gray-50' : ''
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
                            {chain.id === walletSnap.chainId && (
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
