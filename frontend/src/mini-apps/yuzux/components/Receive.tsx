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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Receive">
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-8 flex flex-col items-center h-full">
                    {!walletSnap.account && (
                        <div className="p-6 rounded-lg mx-auto">
                            <QrCodeDisplay address="0x0" />
                        </div>
                    )}

                    <AddressDisplay address="0x0" />
                </div>
            </div>
        </Modal>
    );
};
