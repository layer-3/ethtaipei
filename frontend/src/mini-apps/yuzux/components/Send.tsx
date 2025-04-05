import React, { useState } from 'react';
import { Modal } from './common/Modal';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');

    const handleSend = () => {
        // Add logic to handle send transaction
        console.log('Sending', amount, 'YUZU to', recipientAddress);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-md mx-auto">
                    <div className="rounded-lg border border-white p-4">
                        <label className="block text-sm font-normal text-white mb-2">Recipient Address</label>
                        <input
                            type="text"
                            placeholder="0x..."
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            className="block w-full px-3 py-3 bg-black border border-white rounded-md text-white shadow-sm focus:outline-none focus:ring-white focus:border-white"
                        />
                    </div>

                    <div className="rounded-lg border border-white p-4">
                        <label className="block text-sm font-normal text-white mb-2">Amount</label>
                        <div className="flex rounded-md shadow-sm">
                            <input
                                type="number"
                                placeholder="0.0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="block w-full flex-1 px-3 py-3 bg-black border border-white rounded-l-md text-white focus:outline-none focus:ring-white focus:border-white"
                            />
                            <span className="inline-flex items-center px-4 py-3 border border-l-0 border-white bg-black text-white rounded-r-md">
                                YUZU
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <button 
                    onClick={handleSend}
                    disabled={!recipientAddress || !amount}
                    className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed">
                    Pay
                </button>
            </div>
        </Modal>
    );
};