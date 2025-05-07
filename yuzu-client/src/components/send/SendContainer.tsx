"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { ScanStep, ManualEntryStep, AmountEntryStep, ProcessingStep, SuccessStep } from "./steps";
import { useDeviceDetection } from "../../hooks/device";
import { useAmountInput } from "../../hooks/payment";
import type { SendStep } from "../../types";

interface SendContainerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SendContainer: React.FC<SendContainerProps> = ({ isOpen, onClose }) => {
    const { isMobile } = useDeviceDetection();

    const { amount, handleAmountChange } = useAmountInput();

    // const { processPayment, processingError } = usePaymentFlow({
    //     isConnected,
    //     signer: nitroSnap.stateSigner,
    //     sendRequest,
    // });

    const [step, setStep] = useState<SendStep>("scan");
    const [recipientAddress, setRecipientAddress] = useState("");

    useEffect(() => {
        if (isOpen) {
            setStep(isMobile ? "scan" : "manual");
            setRecipientAddress("");
        }
    }, [isOpen, isMobile]);

    const handleScan = (data: string) => {
        setRecipientAddress(data);
        setStep("amount");
    };

    const handleManualEntry = () => {
        setStep("manual");
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRecipientAddress(e.target.value);
    };

    const handleAddressSubmit = () => {
        if (recipientAddress) {
            setStep("amount");
        }
    };

    const handleSend = async () => {
        // setStep("processing");
        // const chainId = settingsSnap.activeChain?.id;
        // const participantA = nitroSnap.stateSigner?.address;
        // const participantB = recipientAddress as Address;
        // const result = await processPayment(participantA!, participantB, amount, chainId!);
        // if (result.success) {
        //     // Refetch participants to get updated balance
        //     try {
        //         await getParticipants();
        //         console.log("Successfully refreshed participants data after payment");
        //     } catch (error) {
        //         console.error("Failed to refresh participants data after payment:", error);
        //     }
        //     setStep("success");
        //     setTimeout(() => {
        //         onClose();
        //         setStep(isMobile ? "scan" : "manual");
        //         setRecipientAddress("");
        //     }, 2000);
        // } else {
        //     setStep("manual");
        // }
    };

    const renderStep = () => {
        switch (step) {
            case "scan":
                return <ScanStep onScan={handleScan} onSwitchToManual={handleManualEntry} />;
            case "manual":
                return (
                    <ManualEntryStep
                        recipientAddress={recipientAddress}
                        onAddressChange={handleAddressChange}
                        onAddressSubmit={handleAddressSubmit}
                        onSwitchToScan={() => setStep("scan")}
                        isMobile={isMobile}
                    />
                );
            case "amount":
                return (
                    <AmountEntryStep
                        amount={amount}
                        recipientAddress={recipientAddress}
                        onAmountChange={handleAmountChange}
                        onSubmit={handleSend}
                        availableBalance="100"
                    />
                );
            case "processing":
                return <ProcessingStep processingError={"test"} onRetry={() => setStep("manual")} />;
            case "success":
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
