/* eslint-disable padding-line-between-statements */
import { useCallback, useState } from 'react';
import { useCreateApplicationSession, useCloseApplicationSession } from '@/hooks/channel';
import { Address, Hex } from 'viem';
import { WalletSigner } from '@/websocket';
import APP_CONFIG from '@/config/app';

interface PaymentFlowOptions {
    isConnected: boolean;
    signer: WalletSigner;
    sendRequest: (payload: string) => Promise<any>;
}

interface PaymentResult {
    success: boolean;
    error?: string;
}

export function usePaymentFlow({ isConnected, signer, sendRequest }: PaymentFlowOptions) {
    const [processingError, setProcessingError] = useState<string | null>(null);
    const { createApplicationSession } = useCreateApplicationSession();
    const { closeApplicationSession } = useCloseApplicationSession();

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

    const processPayment = useCallback(
        async (
            participantA: string,
            participantB: Address,
            amount: string,
            chainId: number,
        ): Promise<PaymentResult> => {
            setProcessingError(null);

            const check = checkRequirements(chainId, participantA, participantB);
            const tokenAddress = APP_CONFIG.TOKENS[chainId] as Hex;

            if (!check.valid) {
                return { success: false, error: check.error };
            }

            if (!tokenAddress) {
                const errorMessage = 'Invalid token address for the active chain.';
                setProcessingError(errorMessage);
                return { success: false, error: errorMessage };
            }

            console.log('signer', signer);

            try {
                const openResult = await createApplicationSession(
                    signer,
                    sendRequest,
                    participantA,
                    participantB,
                    amount,
                    tokenAddress,
                );

                if (!openResult.success) {
                    const error = openResult.error || 'Failed to open virtual channel';
                    throw new Error(error);
                }

                const appId = localStorage.getItem('app_id');

                if (!appId) {
                    throw new Error('Failed to open virtual channel.');
                }

                const allocations = {
                    participantA: '0',
                    participantB: amount,
                };

                //    signer: WalletSigner, // Pass the WalletSigner object which includes the sign method
                //     sendRawMessage: (signedMessage: string) => Promise<any>, // Function to send the pre-signed message string
                //     appId: AccountID, // The ID of the application to close
                //     finalAllocationStr: string[], // Final allocation amounts as strings
                //     tokenAddress: Hex, // Address of the token used in the app (for parsing units)
                const closeResult = await closeApplicationSession(
                    signer,
                    sendRequest,
                    appId as Hex,
                    [allocations.participantA, allocations.participantB],
                    tokenAddress,
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
        },
        [isConnected, signer, sendRequest, createApplicationSession, closeApplicationSession],
    );

    return {
        processPayment,
        processingError,
        setProcessingError,
    };
}
