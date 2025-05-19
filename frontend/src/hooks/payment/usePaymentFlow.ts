/* eslint-disable padding-line-between-statements */
import { useCallback, useState } from 'react';
import { useCreateApplicationSession, useCloseApplicationSession } from '@/hooks/channel';
import { Address, Hex } from 'viem';
import { WalletSigner } from '@/websocket';
import APP_CONFIG from '@/config/app';
import { AppSessionAllocation } from '@erc7824/nitrolite';

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

            try {
                const openResult = await createApplicationSession(
                    signer,
                    sendRequest,
                    participantA,
                    participantB,
                    amount,
                );

                if (!openResult.success) {
                    const error = openResult.error || 'Failed to open virtual channel';
                    throw new Error(error);
                }

                const appSessionId = localStorage.getItem('app_session_id');

                if (!appSessionId) {
                    throw new Error('Failed to open app session id.');
                }

                const allocations: AppSessionAllocation[] = [
                    {
                        participant: participantA as Hex,
                        asset: 'usdc',
                        amount: '0',
                    },
                    {
                        participant: participantB as Hex,
                        asset: 'usdc',
                        amount: amount,
                    },
                ];

                const closeResult = await closeApplicationSession(
                    signer,
                    sendRequest,
                    appSessionId as Hex,
                    allocations,
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
