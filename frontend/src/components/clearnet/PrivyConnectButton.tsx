'use client';

import { chainImageURLById } from '@/config/chains';
import { shortenHex } from '@/helpers/shortenHex';
import { usePrivyWallet } from '@/hooks';
import { WalletStore } from '@/store';
import Image from 'next/image';
import { useCallback } from 'react';

export const PrivyConnectButton: React.FC = () => {
    const { isConnected, account, isReady, connect: connectPrivy, disconnect: disconnectPrivy } = usePrivyWallet();

    const connectWallet = useCallback(async () => {
        if (!isReady) {
            alert('Privy is not ready. Please try again in a moment.');
            return;
        }

        try {
            await connectPrivy();
        } catch (error) {
            // Show error message to user
            alert(`Error connecting to Privy: ${error instanceof Error ? error.message : String(error)}`);
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"
                    fill="black"
                />
            </svg>
            <span className="text-black font-normal">Connect Wallet</span>
        </button>
    );
};
