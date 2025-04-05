import { Message } from '@/types';
import { AppLogic, ChannelContext, NitroliteClient, Signature, Channel as NitroliteChannel } from '@erc7824/nitrolite';
import { proxy } from 'valtio';
import { Address } from 'viem';

type NitroliteChannelStatus =
    | 'none'
    | 'deposit_pending'
    | 'funded'
    | 'open_pending'
    | 'opened'
    | 'close_pending'
    | 'closed'
    | 'withdraw_pending'
    | 'withdrawn';

export interface IWalletState {
    client: NitroliteClient;

    channelContext: ChannelContext<Message> | null;
    status: NitroliteChannelStatus;
}

const state = proxy<IWalletState>({
    client: null,
    channelContext: null,
    status: 'none',
});

const NitroliteStore = {
    state,

    setClient(client: NitroliteClient) {
        if (!client) {
            console.error('Attempted to set null or undefined Nitrolite client');
            return false;
        }
        state.client = client;
        return true;
    },

    setChannelContext(guest: Address, app: AppLogic<Message>): ChannelContext {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const channel = new ChannelContext<Message>(state.client, guest, app);

            state.channelContext = channel;
            return channel;
        } catch (error) {
            console.error('Failed to set channel context:', error);
            throw error;
        }
    },

    getChannelContext(channelId: string): ChannelContext | null {
        return state.channelContext;
    },

    async deposit(channelId: string, tokenAddress: Address, amount: string) {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'deposit_pending';
            await state.channelContext.deposit(tokenAddress, BigInt(amount));
            state.status = 'funded';

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to deposit to channel ${channelId}:`, error);
            throw error;
        }
    },

    async openChannel(
        channelId: string,
        appState: Message,
        token: Address,
        allocations: [bigint, bigint],
        signatures: Signature[] = [],
    ) {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'open_pending';
            await state.channelContext.open(appState, token, allocations, signatures);
            state.status = 'opened';

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to open channel ${channelId}:`, error);
            throw error;
        }
    },

    async closeChannel(
        channelId: string,
        appState: Message,
        token: Address,
        allocations: [bigint, bigint],
        signatures: Signature[] = [],
    ) {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'close_pending';
            await state.channelContext.close(appState, token, allocations, signatures);
            state.status = 'closed';

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to close channel ${channelId}:`, error);
            throw error;
        }
    },

    async withdraw(channelId: string, token: Address, amount: bigint) {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'withdraw_pending';
            await state.channelContext.withdraw(token, amount);
            state.status = 'withdrawn';

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to withdraw funds from ${channelId}:`, error);
            throw error;
        }
    },
};

export default NitroliteStore;
