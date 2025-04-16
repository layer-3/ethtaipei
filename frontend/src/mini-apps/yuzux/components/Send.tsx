'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { Modal } from './common/Modal';
import { QrScanner } from './QrScanner';
import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { NitroliteStore, SettingsStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { useWebSocket } from '@/hooks';
import { useVirtualChannelOpen, useVirtualChannelClose } from '@/hooks/channel';
import { Address } from 'viem';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

type SendStep = 'scan' | 'manual' | 'amount' | 'processing' | 'success';

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    const chainId = useMemo(() => settingsSnap.activeChain.id, []);

    const { sendRequest, isConnected, connect } = useWebSocket();

    const { getParticipants } = useGetParticipants({
        wsProps: { isConnected, connect, sendRequest },
        activeChainId: chainId,
    });
    const { openVirtualChannel } = useVirtualChannelOpen();
    const { closeVirtualChannel } = useVirtualChannelClose();

    const [step, setStep] = useState<SendStep>('scan');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('0');
    const [isMobile, setIsMobile] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);

    useEffect(() => {
        const checkIfMobile = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileUserAgent =
                /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);

            const isSmallScreen = window.innerWidth <= 768;

            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            const mobileDevice =
                (isMobileUserAgent && isSmallScreen) || (isMobileUserAgent && hasTouch) || (isSmallScreen && hasTouch);

            setIsMobile(mobileDevice);
        };

        checkIfMobile();

        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setStep(isMobile ? 'scan' : 'manual');
            setRecipientAddress('');
            setAmount('0');
        }
    }, [isOpen, isMobile]);

    const handleScan = useCallback((data: string) => {
        setRecipientAddress(data);
        setStep('amount');
    }, []);

    const handleManualEntry = useCallback(() => {
        setStep('manual');
    }, []);

    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setRecipientAddress(e.target.value);
    }, []);

    const handleAddressSubmit = useCallback(() => {
        if (recipientAddress) {
            setStep('amount');
        }
    }, [recipientAddress]);

    const handleAmountChange = useCallback((newValue: string) => {
        if (newValue === '') {
            setAmount('0');
            return;
        }

        if (newValue.includes('.')) {
            const parts = newValue.split('.');
            const integerPart = parts[0];
            const decimalPart = parts[1] || '';

            if (decimalPart.length > 7) {
                return;
            }

            if (integerPart.length + decimalPart.length > 9) {
                return;
            }
        } else {
            if (newValue.length > 9) {
                return;
            }
        }

        if (newValue.length > 1 && newValue.startsWith('0') && !newValue.startsWith('0.')) {
            setAmount(newValue.substring(1));
        } else {
            setAmount(newValue);
        }
    }, []);

    const handleSend = useCallback(async () => {
        setStep('processing');
        setProcessingError(null);

        const participantA = nitroSnap.stateSigner?.address;
        const participantB = recipientAddress as Address;
        const tokenConfig = chainId ? APP_CONFIG.TOKENS[chainId] : undefined;

        if (!isConnected) {
            setProcessingError('WebSocket not connected.');
            setStep('manual');
            return;
        }

        if (!chainId || !participantA || !participantB || !tokenConfig) {
            setProcessingError('Missing required information (Chain ID, Sender, Recipient, Token Config).');
            console.error('Missing info:', { chainId, participantA, participantB, tokenConfig });
            setStep('manual');
            return;
        }

        try {
            console.log('Opening virtual channel with:', { participantA, participantB, amount, chainId });

            const openResult = await openVirtualChannel(sendRequest, participantA, participantB, amount, chainId);

            if (!openResult.success) {
                throw new Error(openResult.error || 'Failed to open virtual channel');
            }

            const virtualChannelId = localStorage.getItem('virtual_channel_id');

            if (!virtualChannelId) {
                throw new Error('Failed to open virtual channel.');
            }
            console.log('Virtual channel opened, ID:', virtualChannelId);

            const allocations = {
                participantA: '0',
                participantB: amount,
            };

            console.log('Closing virtual channel with allocations:', allocations);
            // The virtualChannelId is internally retrieved from localStorage in the hook
            const closeResult = await closeVirtualChannel(
                sendRequest,
                participantA,
                participantB,
                allocations.participantA,
                allocations.participantB,
                chainId,
            );

            if (!closeResult || !closeResult.success) {
                throw new Error(closeResult?.error || 'Failed to close virtual channel');
            }

            console.log('Virtual channel closed successfully.');

            getParticipants();

            setStep('success');
            setTimeout(() => {
                onClose();
                setStep(isMobile ? 'scan' : 'manual');
                setRecipientAddress('');
                setAmount('0');
            }, 2000);
        } catch (error) {
            console.error('Send failed:', error);
            setProcessingError(error instanceof Error ? error.message : 'An unknown error occurred.');
            setStep('manual');
        }
    }, [
        amount,
        recipientAddress,
        onClose,
        settingsSnap.activeChain,
        nitroSnap.stateSigner,
        isConnected,
        sendRequest,
        openVirtualChannel,
        closeVirtualChannel,
        isMobile,
        chainId,
    ]);

    const scanComponent = useMemo(
        () => (
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
        ),
        [handleScan, handleManualEntry],
    );

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
                            autoFocus={!isMobile}
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

                    {isMobile && (
                        <button
                            onClick={() => setStep('scan')}
                            className="w-full bg-transparent text-white py-4 rounded-md hover:bg-gray-800 transition-colors text-lg font-normal border border-white mt-4">
                            Scan QR Code
                        </button>
                    )}
                </div>
            </div>
        ),
        [recipientAddress, handleAddressChange, handleAddressSubmit, isMobile],
    );

    const amountComponent = useMemo(
        () => (
            <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col pt-8">
                    {' '}
                    <div className="flex-1 flex flex-col items-center justify-center mb-4">
                        <div className="flex gap-1 text-white items-start">
                            {' '}
                            <span className="text-5xl font-bold">$</span>
                            <span className="text-5xl font-bold">{amount}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-400">to: {recipientAddress}</div>
                    </div>
                    <div className="p-4">
                        <button
                            disabled={!+amount}
                            onClick={handleSend}
                            className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed mb-4">
                            Pay
                        </button>
                    </div>
                    <div className="py-3 text-white">
                        <NumberPad value={amount} onChange={handleAmountChange} />
                    </div>
                </div>
            </div>
        ),
        [amount, recipientAddress, handleAmountChange, handleSend],
    );

    const processingComponent = useMemo(
        () => (
            <div className="flex flex-col items-center justify-center h-full">
                {processingError ? (
                    <div className="text-center text-red-500">
                        <h2 className="text-2xl font-semibold mb-2 text-white">Error</h2>
                        <p className="text-gray-400 break-words px-4">{processingError}</p>
                        <button
                            onClick={() => setStep('manual')}
                            className="mt-4 bg-white text-black py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white">
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 relative">
                            <div className="w-16 h-16 border-4 border-white rounded-full animate-spin" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-8 h-8 bg-black rounded-full" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold mb-2 text-white">Processing</h2>
                            <p className="text-gray-400">Sending payment via virtual channel...</p>
                        </div>
                    </>
                )}
            </div>
        ),
        [processingError],
    );

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
