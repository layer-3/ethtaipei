'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from './common/Modal';
import { QrScanner } from './QrScanner';
import { TokenSelector } from './TokenSelector';
import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { NitroliteStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

type SendStep = 'scan' | 'manual' | 'amount' | 'processing' | 'success';

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<SendStep>('scan');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('0');
    const [selectedToken, setSelectedToken] = useState({
        id: '1',
        name: 'Yuzu Token',
        symbol: 'YUZU',
    });

    // Example chain ID from your global store
    const chainId = useMemo(() => WalletStore.state.chainId, []);

    // Example balance from your global store (Nitrolite)
    const currentBalance = useMemo(() => {
        const nitroState = NitroliteStore.getLatestState();

        if (!nitroState) return BigInt(0);
        const creatorAllocation = nitroState.allocations[0];

        return creatorAllocation.amount;
    }, []);

    // Reset state whenever the modal is opened
    useEffect(() => {
        if (isOpen) {
            setStep('scan');
            setRecipientAddress('');
            setAmount('0');
        }
    }, [isOpen]);

    // ----- Handlers -----

    // 1. When we successfully scan a QR code
    const handleScan = useCallback((data: string) => {
        setRecipientAddress(data);
        setStep('amount'); // Move to the amount entry step
    }, []);

    // 2. Switch to manual entry of address
    const handleManualEntry = useCallback(() => {
        setStep('manual');
    }, []);

    // 3. Manual address input change
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setRecipientAddress(e.target.value);
    }, []);

    // 4. Manual address submit
    const handleAddressSubmit = useCallback(() => {
        if (recipientAddress) {
            setStep('amount');
        }
    }, [recipientAddress]);

    // 5. Amount change (via NumberPad)
    const handleAmountChange = useCallback((newValue: string) => {
        if (newValue === '') {
            setAmount('0');
        } else {
            // Remove leading zeros
            setAmount(newValue.replace(/^0+/, ''));
        }
    }, []);

    // 6. Send transaction
    const handleSend = useCallback(() => {
        console.log('Sending', amount, selectedToken.symbol, 'to', recipientAddress);
        setStep('processing');

        // Example usage with your global store
        const token = APP_CONFIG.TOKENS[chainId];

        // Very rough example of updating store:
        NitroliteStore.appendState(token, [BigInt(+currentBalance.toString() - +amount), BigInt(0)]);

        // Simulate an async transaction
        setTimeout(() => {
            setStep('success');
            // Optionally close the modal after success
            setTimeout(() => {
                onClose();
            }, 2000);
        }, 2000);
    }, [amount, selectedToken, recipientAddress, onClose, chainId, currentBalance]);

    // ----- Step Components -----

    // Scan step: shows the QrScanner + a button to enter address manually
    const scanComponent = useMemo(
        () => (
            <div className="flex flex-col h-full">
                <div className="flex-1">
                    <QrScanner onScan={handleScan} />
                </div>
                <div className="p-4">
                    <button
                        onClick={handleManualEntry}
                        className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white"
                    >
                        Enter Manually
                    </button>
                </div>
            </div>
        ),
        [handleScan, handleManualEntry],
    );

    // Manual address entry
    const manualEntryComponent = useMemo(
        () => (
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
                        className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Continue
                    </button>
                </div>
            </div>
        ),
        [recipientAddress, handleAddressChange, handleAddressSubmit],
    );

    // Amount entry (token selector + number pad)
    const amountComponent = useMemo(
        () => (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-white">
                    <TokenSelector onSelect={setSelectedToken} selectedTokenId={selectedToken.id} />
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center mb-4">
                        <div className="flex gap-2 text-white items-start">
                            <span className="text-lg font-bold">{selectedToken.symbol}</span>
                            <span className="text-5xl font-bold">{amount}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-400">
                            to: {recipientAddress.substring(0, 6)}...
                            {recipientAddress.substring(recipientAddress.length - 4)}
                        </div>
                    </div>

                    <div className="p-4">
                        <button
                            disabled={!+amount} // disable if amount is zero
                            onClick={handleSend}
                            className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                        >
                            Pay
                        </button>
                    </div>

                    <div className="bg-white py-3">
                        <NumberPad value={amount} onChange={handleAmountChange} />
                    </div>
                </div>
            </div>
        ),
        [amount, selectedToken, recipientAddress, handleAmountChange, handleSend],
    );

    // Processing step
    const processingComponent = useMemo(
        () => (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-6 relative">
                    <div className="w-16 h-16 border-4 border-white rounded-full animate-spin" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-8 h-8 bg-black rounded-full" />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2 text-white">Processing</h2>
                    <p className="text-gray-400">Sending payment</p>
                </div>
            </div>
        ),
        [],
    );

    // Success step
    const successComponent = useMemo(
        () => (
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
        ),
        [],
    );

    // ----- Which step to show -----
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
