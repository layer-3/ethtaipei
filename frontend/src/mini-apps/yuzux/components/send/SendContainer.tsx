'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { Modal } from '../common/Modal';
import { NitroliteStore, SettingsStore } from '@/store';
import { useWebSocket } from '@/hooks';
import { useDeviceDetection } from '@/hooks/device/useDeviceDetection';
import { useAmountInput } from '@/hooks/payment/useAmountInput';
import { usePaymentFlow } from '@/hooks/payment/usePaymentFlow';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';
import { SendStep } from '../../types';
import { Address } from 'viem';
import { ScanStep, ManualEntryStep, AmountEntryStep, ProcessingStep, SuccessStep } from './steps';

interface SendContainerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SendContainer: React.FC<SendContainerProps> = ({ isOpen, onClose }) => {
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const { isMobile } = useDeviceDetection();

    const chainId = settingsSnap.activeChain?.id;

    const { sendRequest, isConnected } = useWebSocket();
    const { amount, handleAmountChange, handleAmountInput } = useAmountInput();

    const { processPayment, processingError } = usePaymentFlow({
        isConnected,
        signer: nitroSnap.stateSigner,
        sendRequest,
    });

    const { getParticipants } = useGetParticipants({
        signer: nitroSnap.stateSigner,
        sendRequest,
    });

    const [step, setStep] = useState<SendStep>('scan');
    const [recipientAddress, setRecipientAddress] = useState('');

    const availableBalance = useMemo(() => {
        if (!nitroSnap.userAccountFromParticipants) return '0';
        const displayValue = nitroSnap.userAccountFromParticipants.amount;

        return displayValue;
    }, [chainId, isOpen]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(isMobile ? 'scan' : 'manual');
            setRecipientAddress('');
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

    const handleSend = useCallback(async () => {
        setStep('processing');

        const chainId = settingsSnap.activeChain?.id;
        const participantA = nitroSnap.stateSigner?.address;
        const participantB = recipientAddress as Address;

        const result = await processPayment(participantA!, participantB, amount, chainId!);

        if (result.success) {
            // Refetch participants to get updated balance
            try {
                await getParticipants();
                console.log('Successfully refreshed participants data after payment');
            } catch (error) {
                console.error('Failed to refresh participants data after payment:', error);
            }

            setStep('success');
            setTimeout(() => {
                onClose();
                setStep(isMobile ? 'scan' : 'manual');
                setRecipientAddress('');
            }, 2000);
        } else {
            setStep('manual');
        }
    }, [
        amount,
        recipientAddress,
        onClose,
        settingsSnap.activeChain,
        nitroSnap.stateSigner,
        processPayment,
        isMobile,
        getParticipants,
    ]);

    const renderStep = () => {
        switch (step) {
            case 'scan':
                return <ScanStep onScan={handleScan} onSwitchToManual={handleManualEntry} />;
            case 'manual':
                return (
                    <ManualEntryStep
                        recipientAddress={recipientAddress}
                        onAddressChange={handleAddressChange}
                        onAddressSubmit={handleAddressSubmit}
                        onSwitchToScan={() => setStep('scan')}
                        isMobile={isMobile}
                    />
                );
            case 'amount':
                return (
                    <AmountEntryStep
                        amount={amount}
                        recipientAddress={recipientAddress}
                        onAmountChange={handleAmountChange}
                        onSubmit={handleSend}
                        handleAmountInput={handleAmountInput}
                        availableBalance={availableBalance}
                    />
                );
            case 'processing':
                return <ProcessingStep processingError={processingError} onRetry={() => setStep('manual')} />;
            case 'success':
                return <SuccessStep />;
            default:
                return <ScanStep onScan={handleScan} onSwitchToManual={handleManualEntry} />;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay">
            {renderStep()}
        </Modal>
    );
};
