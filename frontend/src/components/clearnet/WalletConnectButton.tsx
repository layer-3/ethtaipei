'use client';

import { usePrivyWallet } from '@/hooks';
import { chainImageURLById } from '@/config/chains';
import { shortenHex } from '@/helpers/shortenHex';
import { WalletStore } from '@/store';
import Image from 'next/image';
import { useCallback } from 'react';

export const WalletConnectButton: React.FC = () => {
    const { isConnected, account, isReady, connect: connectPrivy, disconnect: disconnectPrivy } = usePrivyWallet();

    const connectWallet = useCallback(async () => {
        if (!isReady) {
            alert('Wallet connection is not ready. Please try again in a moment.');
            return;
        }

        try {
            await connectPrivy();
        } catch (error) {
            // Show error message to user
            alert(`Error connecting wallet: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [isReady, connectPrivy]);

    if (isConnected) {
        return (
            <button
                onClick={disconnectPrivy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary"
            >
                <Image src={chainImageURLById(WalletStore.state.chainId)} alt="chain-icon" width={24} height={24} />
                <span className="text-black">{shortenHex(account)}</span>
            </button>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary w-full"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                    fill="black"
                />
            </svg>
            <span className="text-black font-normal">Connect Wallet</span>
        </button>
    );
};
