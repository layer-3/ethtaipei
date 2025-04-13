import React from 'react';
import { useSnapshot } from 'valtio';
import { WalletStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';

interface WalletConnectionSectionProps {
    isPrivyEnabled: boolean;
}

export const WalletConnectionSection: React.FC<WalletConnectionSectionProps> = ({ isPrivyEnabled }) => {
    const walletSnap = useSnapshot(WalletStore.state);

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">1. Connect Wallet</h2>
            <div className="flex items-center justify-between">
                <div>
                    <p className="mb-2">
                        Status:{' '}
                        <span className={`font-semibold ${walletSnap.connected ? 'text-green-600' : 'text-red-600'}`}>
                            {walletSnap.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </p>
                    {walletSnap.connected && (
                        <p className="text-sm text-gray-600">Address: {walletSnap.walletAddress}</p>
                    )}
                </div>
                <div>{isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}</div>
            </div>
        </section>
    );
};
