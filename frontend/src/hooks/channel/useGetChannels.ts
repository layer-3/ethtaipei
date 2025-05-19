import { useCallback } from 'react';
import NitroliteStore from '@/store/NitroliteStore';
import { LedgerChannel } from '@/store/types';
import { WalletSigner } from '@/websocket/crypto';
import { createGetChannelsMessage } from '@erc7824/nitrolite';

interface useGetLedgerChannelsParams {
    signer: WalletSigner | null;
    sendRequest: (signedMessage: string) => Promise<any>;
}

export function useGetLedgerChannels({ signer, sendRequest }: useGetLedgerChannelsParams) {
    const getLedgerChannels = useCallback(async () => {
        if (!signer) {
            console.error('Signer not available.');
            return;
        }

        try {
            const signedMessage = await createGetChannelsMessage(signer.sign, signer.address);
            const response = await sendRequest(signedMessage);

            let channels: LedgerChannel[] = [];

            if (response && Array.isArray(response) && response.length > 0) {
                if (Array.isArray(response) && Array.isArray(response[0])) {
                    channels = response[0].map((p: any) => ({
                        channel_id: p.channel_id,
                        participant: p.participant,
                        status: p.status,
                        token: p.token,
                        amount: BigInt(p.amount),
                        chain_id: p.chain_id,
                        adjudicator: p.adjudicator,
                        challenge: p.challenge,
                        nonce: p.nonce,
                        version: p.version,
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                    }));
                } else {
                    console.warn('Ledger balances list appears empty or has unexpected format:', response);
                }
            } else {
                console.error('Unexpected response format:', response);
            }

            NitroliteStore.setLedgerChannels(channels);
        } catch (error) {
            console.error('Error getting ledger balances:', error);
            NitroliteStore.setLedgerChannels([]);
        }
    }, [signer, sendRequest]);

    return {
        getLedgerChannels,
    };
}
