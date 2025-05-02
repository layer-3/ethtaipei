import { useCallback } from 'react';
import NitroliteStore from '@/store/NitroliteStore';
import { Participant } from '@/store/types';
import { Hex } from 'viem';
import { WalletSigner } from '@/websocket/crypto';
import { createGetLedgerBalancesMessage } from '@erc7824/nitrolite';

interface useGetLedgerBalancesParams {
    signer: WalletSigner | null;
    sendRequest: (signedMessage: string) => Promise<any>;
}

export function useGetParticipants({ signer, sendRequest }: useGetLedgerBalancesParams) {
    const getParticipants = useCallback(async () => {
        const channelId = localStorage.getItem('nitrolite_channel_id') as Hex;

        if (!signer) {
            console.error('Signer not available.');
            return;
        }
        if (!channelId) {
            console.error('Channel ID not provided.');
            return;
        }

        try {
            const signedMessage = await createGetLedgerBalancesMessage(signer.sign, channelId);
            const response = await sendRequest(signedMessage);

            let participantsList: Participant[] = [];

            if (response && Array.isArray(response) && response.length > 0) {
                if (Array.isArray(response) && Array.isArray(response[0])) {
                    participantsList = response[0].map((p: any) => ({
                        address: p.address as Hex,
                        amount: BigInt(p.amount),
                    }));
                } else {
                    console.warn('Ledger balances list appears empty or has unexpected format:', response);
                }
            } else {
                console.error('Unexpected response format:', response);
            }

            NitroliteStore.setParticipants(participantsList);
        } catch (error) {
            console.error('Error getting ledger balances:', error);
            NitroliteStore.setParticipants([]);
        }
    }, [signer, sendRequest]);

    return {
        getParticipants,
    };
}
