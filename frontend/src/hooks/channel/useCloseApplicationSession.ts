import { useCallback } from 'react';

import {
    createCloseAppSessionMessage,
    CloseAppSessionRequest,
    AccountID,
    AppSessionAllocation,
} from '@erc7824/nitrolite';
import { WalletSigner } from '@/websocket/crypto';

/**
 * Hook for closing an application session using createCloseAppSessionMessage.
 */
export function useCloseApplicationSession() {
    const closeApplicationSession = useCallback(
        async (
            signer: WalletSigner,
            sendRequest: (signedMessage: string) => Promise<any>,
            appSessionId: AccountID,
            finalAllocations: AppSessionAllocation[],
        ) => {
            try {
                if (!appSessionId) {
                    throw new Error('Application ID is required to close the session.');
                }

                if (!finalAllocations || finalAllocations.length === 0) {
                    throw new Error('Final allocation amounts are required.');
                }

                const closeRequest: CloseAppSessionRequest = {
                    app_session_id: appSessionId,
                    allocations: finalAllocations,
                };

                const signedMessage = await createCloseAppSessionMessage(signer.sign, [closeRequest]);

                const response = await sendRequest(signedMessage);

                if (response && response[0].app_session_id) {
                    localStorage.removeItem('app_session_id');
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
