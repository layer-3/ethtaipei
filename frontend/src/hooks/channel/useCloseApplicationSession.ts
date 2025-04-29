import { useCallback } from 'react';
import { Hex } from 'viem';

import { parseTokenUnits } from '@/hooks/utils/tokenDecimals';
import { createCloseAppSessionMessage, Intent, CloseAppSessionRequest, AccountID } from '@erc7824/nitrolite';
import { WalletSigner } from '@/websocket/crypto';

/**
 * Hook for closing an application session using createCloseAppSessionMessage.
 */
export function useCloseApplicationSession() {
    const closeApplicationSession = useCallback(
        async (
            signer: WalletSigner,
            sendRequest: (signedMessage: string) => Promise<any>,
            appId: AccountID,
            finalAllocationStr: string[],
            tokenAddress: Hex,
        ) => {
            try {
                if (!appId) {
                    throw new Error('Application ID is required to close the session.');
                }
                if (!tokenAddress) {
                    throw new Error('Token address is required to parse allocation units.');
                }
                if (!finalAllocationStr || finalAllocationStr.length === 0) {
                    throw new Error('Final allocation amounts are required.');
                }

                const finalAllocations: any = [
                    parseTokenUnits(tokenAddress, finalAllocationStr[0]),
                    finalAllocationStr[1],
                ];

                const closeRequest: CloseAppSessionRequest = {
                    appId: appId,
                    allocations: finalAllocations,
                };

                const finalIntent: Intent = finalAllocations;

                const signedMessage = await createCloseAppSessionMessage(signer.sign, [closeRequest], finalIntent);

                const response = await sendRequest(signedMessage);

                if (response && response[0].app_id) {
                    localStorage.removeItem('app_id');
                    return { success: true, response };
                }
            } catch (error) {
                console.error('Error creating close application session message:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error during close session message preparation/sending',
                };
            }
        },
        [],
    );

    return {
        closeApplicationSession,
    };
}
