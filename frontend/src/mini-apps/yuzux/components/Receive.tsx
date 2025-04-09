import React from 'react';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import { Modal } from './common/Modal';
import { QrCodeDisplay } from './QrCodeDisplay';
import { AddressDisplay } from './AddressDisplay';

interface ReceiveProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Receive: React.FC<ReceiveProps> = ({ isOpen, onClose }) => {
    const walletSnap = useSnapshot(WalletStore.state);

    const handleShare = async () => {
        if (!walletSnap.walletAddress) return;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'My Wallet Address',
                    text: `Here's my wallet address: ${walletSnap.walletAddress}`,
                });
            } else {
                navigator.clipboard.writeText(walletSnap.walletAddress);
                alert('Sharing not supported in this browser. Address copied to clipboard instead.');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Receive">
            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col items-center">
                    {walletSnap.walletAddress && (
                        <div className="pt-6 rounded-lg mx-auto">
                            <QrCodeDisplay address={walletSnap.walletAddress} />
                        </div>
                    )}

                    <AddressDisplay address={walletSnap.walletAddress || '0x0'} />
                </div>

                <div className="w-full px-6">
                    <button
                        onClick={handleShare}
                        className="w-full bg-white text-black py-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center border border-white">
                        Share
                    </button>
                </div>
            </div>
        </Modal>
    );
};
