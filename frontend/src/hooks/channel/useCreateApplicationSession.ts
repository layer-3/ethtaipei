import { useCallback } from 'react';
import { Hex } from 'viem'; // Assuming Hex type is available

import { createAppSessionMessage, AppDefinition, AppSessionAllocation } from '@erc7824/nitrolite';
import { WalletSigner } from '@/websocket/crypto';
import { useSnapshot } from 'valtio';
import { SettingsStore } from '@/store';

const DEFAULT_PROTOCOL = 'nitroliterpc';
const DEFAULT_WEIGHTS = [100, 0];
const DEFAULT_QUORUM = 100;

/**
 * Hook for creating an application session using createAppSessionMessage.
 */
export function useCreateApplicationSession() {
    const activeChainId = useSnapshot(SettingsStore.state).activeChain.id;

    const createApplicationSession = useCallback(
        async (
            signer: WalletSigner,
            sendRequest: (payload: string) => Promise<any>,
            participantA: string,
            participantB: string,
            amount: string,
        ) => {
            try {
                if (!activeChainId) {
                    throw new Error('Active chain ID is not set.');
                }

                const challenge = 0;

                const appDefinition: AppDefinition = {
                    protocol: DEFAULT_PROTOCOL,
                    participants: [participantA, participantB] as Hex[],
                    weights: DEFAULT_WEIGHTS,
                    quorum: DEFAULT_QUORUM,
                    challenge: challenge,
                    nonce: Date.now(),
                };

                const allocations: AppSessionAllocation[] = [
                    {
                        participant: participantA as Hex,
                        asset: 'usdc',
                        amount,
                    },
                    {
                        participant: participantB as Hex,
                        asset: 'usdc',
                        amount: '0',
                    },
                ];

                const signedMessage = await createAppSessionMessage(signer.sign, [
                    {
                        definition: appDefinition,
                        allocations: allocations,
                    },
                ]);
                const response = await sendRequest(signedMessage);

                if (response && response[0].app_session_id) {
                    localStorage.setItem('app_session_id', response[0].app_session_id);
                    return { success: true, app_id: response[0].app_session_id, response };
                } else {
                    return { success: true, response };
                }
            } catch (error) {
                console.error('Error creating application session message:', error);
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error during session creation message preparation/sending',
                };
            }
        },
        [],
    );

    return {
        createApplicationSession,
    };
}
