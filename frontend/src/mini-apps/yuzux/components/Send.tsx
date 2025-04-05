import React, { useState, useCallback, useMemo } from 'react';
import { Modal } from './common/Modal';
import { QrScanner } from './QrScanner';
import { TokenSelector } from './TokenSelector';
import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

type SendStep = 'scan' | 'manual' | 'amount' | 'processing' | 'success';

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<SendStep>('scan');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('0');
    const [selectedToken, setSelectedToken] = useState({ id: '1', name: 'Yuzu Token', symbol: 'YUZU' });

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setStep('scan');
            setRecipientAddress('');
            setAmount('0');
        }
    }, [isOpen]);

    // Handle QR code scan
    const handleScan = useCallback((data: string) => {
        setRecipientAddress(data);
        setStep('amount');
    }, []);

    // Handle manual address entry
    const handleManualEntry = useCallback(() => {
        setStep('manual');
    }, []);

    // Handle address input change
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setRecipientAddress(e.target.value);
    }, []);

    // Handle address submission
    const handleAddressSubmit = useCallback(() => {
        if (recipientAddress) {
            setStep('amount');
        }
    }, [recipientAddress]);

    // Handle amount change from NumberPad
    const handleAmountChange = useCallback((newValue: string) => {
        if (newValue === '') {
            setAmount('0');
        } else {
            setAmount(newValue.replaceAll(/^0/g, ''));
        }
    }, []);

    // Handle payment submission
    const handleSend = useCallback(() => {
        // Add logic to handle send transaction
        console.log('Sending', amount, selectedToken.symbol, 'to', recipientAddress);
        setStep('processing');
        
        // Simulate processing and success
        setTimeout(() => {
            setStep('success');
            
            // Close modal after success
            setTimeout(() => {
                onClose();
            }, 2000);
        }, 2000);
    }, [amount, selectedToken, recipientAddress, onClose]);


    // QR Scanning view
    const scanComponent = useMemo(() => (
        <div className="flex flex-col h-full">
            <div className="flex-1">
                <QrScanner onScan={handleScan} />
            </div>
            <div className="p-4">
                <button 
                    onClick={handleManualEntry}
                    className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white">
                    Enter Manually
                </button>
            </div>
        </div>
    ), [handleScan, handleManualEntry]);

    // Manual address entry view
    const manualEntryComponent = useMemo(() => (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6">
                <div className="rounded-lg border border-white p-4 mb-4">
                    <label className="block text-sm font-normal text-white mb-2">Recipient Address</label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={recipientAddress}
                        onChange={handleAddressChange}
                        className="block w-full px-3 py-3 bg-black border border-white rounded-md text-white shadow-sm focus:outline-none focus:ring-white focus:border-white"
                    />
                </div>
            </div>
            <div className="p-4">
                <button 
                    onClick={handleAddressSubmit}
                    disabled={!recipientAddress}
                    className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed">
                    Continue
                </button>
            </div>
        </div>
    ), [recipientAddress, handleAddressChange, handleAddressSubmit]);

    // Amount entry view
    const amountComponent = useMemo(() => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white">
                <TokenSelector 
                    onSelect={setSelectedToken} 
                    selectedTokenId={selectedToken.id} 
                />
            </div>
            <div className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center mb-4">
                    <div className="flex gap-2 text-white items-start">
                        <span className="text-lg font-bold">{selectedToken.symbol}</span>
                        <span className="text-5xl font-bold">{amount}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                        Recipient: {recipientAddress.substring(0, 6)}...{recipientAddress.substring(recipientAddress.length - 4)}
                    </div>
                </div>

                <div className="p-4">
                    <button
                        disabled={!+amount}
                        onClick={handleSend}
                        className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed mb-4">
                        Pay
                    </button>
                </div>

                <NumberPad value={amount} onChange={handleAmountChange} />
            </div>
        </div>
    ), [amount, selectedToken, recipientAddress, handleAmountChange, handleSend]);

    // Processing component
    const processingComponent = useMemo(() => (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6 relative">
                <div className="w-16 h-16 border-4 border-white rounded-full animate-spin" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-black rounded-full" />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2 text-white">Processing</h2>
                <p className="text-gray-400">Sending payment</p>
            </div>
        </div>
    ), []);

    // Success component
    const successComponent = useMemo(() => (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6 relative">
                <div className="w-16 h-16 border-4 border-white rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2 text-white">Success!</h2>
                <p className="text-gray-400">Payment sent</p>
            </div>
        </div>
    ), []);

    // Determine which component to show based on step
    const componentToShow = useMemo(() => {
        switch (step) {
            case 'scan':
                return scanComponent;
            case 'manual':
                return manualEntryComponent;
            case 'amount':
                return amountComponent;
            case 'processing':
                return processingComponent;
            case 'success':
                return successComponent;
            default:
                return scanComponent;
        }
    }, [step, scanComponent, manualEntryComponent, amountComponent, processingComponent, successComponent]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay">
            {componentToShow}
        </Modal>
    );
};