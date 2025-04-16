/* eslint-disable padding-line-between-statements */
import { useCallback, useState } from 'react';
import { useVirtualChannelOpen, useVirtualChannelClose } from '@/hooks/channel';
import { Address } from 'viem';

interface PaymentFlowOptions {
    isConnected: boolean;
    sendRequest: (method: string, payload: string) => Promise<any>;
}

interface PaymentResult {
    success: boolean;
    error?: string;
}

export function usePaymentFlow({ isConnected, sendRequest }: PaymentFlowOptions) {
    const [processingError, setProcessingError] = useState<string | null>(null);
    const { openVirtualChannel } = useVirtualChannelOpen();
    const { closeVirtualChannel } = useVirtualChannelClose();

    const checkRequirements = (chainId?: number, participantA?: string, participantB?: Address) => {
        if (!isConnected) {
            const errorMessage = 'WebSocket not connected.';
            setProcessingError(errorMessage);
            return { valid: false, error: errorMessage };
        }

        if (!chainId || !participantA || !participantB) {
            const errorMessage = 'Missing required information (Chain ID, Sender, or Recipient).';
            setProcessingError(errorMessage);
            console.error('Missing info:', { chainId, participantA, participantB });
            return { valid: false, error: errorMessage };
        }

        return { valid: true };
    };

    const processPayment = useCallback(async (
        participantA: string,
        participantB: Address,
        amount: string,
        chainId: number,
    ): Promise<PaymentResult> => {
        setProcessingError(null);
        
        const check = checkRequirements(chainId, participantA, participantB);
        
        if (!check.valid) {
            return { success: false, error: check.error };
        }

        try {
            console.log('Opening virtual channel with:', { participantA, participantB, amount, chainId });

            const openResult = await openVirtualChannel(
                sendRequest, 
                participantA, 
                participantB, 
                amount, 
                chainId
            );
            
            if (!openResult.success) {
                const error = openResult.error || 'Failed to open virtual channel';
                throw new Error(error);
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
            
            const closeResult = await closeVirtualChannel(
                sendRequest,
                participantA,
                participantB,
                allocations.participantA,
                allocations.participantB,
                chainId,
            );
            
            if (!closeResult || !closeResult.success) {
                const error = closeResult?.error || 'Failed to close virtual channel';
                throw new Error(error);
            }

            console.log('Virtual channel closed successfully.');
            
            return { success: true };
        } catch (error) {
            console.error('Payment failed:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            setProcessingError(errorMessage);
            
            return { success: false, error: errorMessage };
        }
    }, [isConnected, sendRequest, openVirtualChannel, closeVirtualChannel]);

    return {
        processPayment,
        processingError,
        setProcessingError
    };
}