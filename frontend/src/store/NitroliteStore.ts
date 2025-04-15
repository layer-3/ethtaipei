import { WalletSigner } from '@/websocket';
import { AppLogic, ChannelContext, NitroliteClient, Channel, State } from '@erc7824/nitrolite';
import { proxy } from 'valtio';
import { Address } from 'viem';
import { NitroliteState, ChannelId, AccountInfo, Participant } from './types'; // Added Participant
import { WalletStore } from './index';

/**
 * Nitrolite Store
 *
 * Manages Nitrolite client and payment channel state.
 * Responsible for:
 * - Managing Nitrolite client instance
 * - Handling channel operations (deposit, create, close, withdraw)
 * - Tracking channel status and context
 * - Storing account information and open channels
 * - Storing participant information
 */

const state = proxy<NitroliteState>({
    client: null,
    channelContext: null,
    status: 'none',
    stateSigner: null,
    accountInfo: {
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    },
    openChannelIds: [],
    participants: [],
    userAccountFromParticipants: null, // Initialized user account
});

const NitroliteStore = {
    state,

    setClient(client: NitroliteClient | null): boolean {
        if (!client) {
            console.error('Attempted to set null or undefined Nitrolite client');
            return false;
        }
        state.client = client;
        return true;
    },

    setChannelContext(channel: Channel, nitroState: State, app: AppLogic<bigint>): ChannelContext<bigint> {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const channelContext = new ChannelContext<bigint>(state.client, channel, nitroState, app);

            state.channelContext = channelContext;

            const channelId = channelContext.getChannelId();

            this.addOpenChannelId(channelId);

            return channelContext;
        } catch (error) {
            console.error('Failed to set channel context:', error);
            throw error;
        }
    },

    /**
     * Set state signer
     */
    setStateSigner(signer: WalletSigner | null): void {
        if (!signer) {
            console.error('Attempted to set null or undefined state signer');
            return;
        }

        state.stateSigner = signer;
    },

    getChannelContext(): ChannelContext<bigint> | null {
        return state.channelContext;
    },

    updateAccountInfo(info: AccountInfo): void {
        state.accountInfo = info;
    },

    addOpenChannelId(channelId: ChannelId): void {
        if (!state.openChannelIds.includes(channelId)) {
            state.openChannelIds.push(channelId);
            // Update channel count in account info
            state.accountInfo.channelCount = state.openChannelIds.length;
        }
    },

    removeOpenChannelId(channelId: ChannelId): void {
        state.openChannelIds = state.openChannelIds.filter((id) => id !== channelId);
        // Update channel count in account info
        state.accountInfo.channelCount = state.openChannelIds.length;
    },

    setOpenChannelIds(channelIds: ChannelId[]): void {
        state.openChannelIds = channelIds;
    },

    /**
     * Set participants list and find the user's account within it.
     */
    setParticipants(participants: Participant[]): void {
        state.participants = participants;
        const userAddress = WalletStore.state.walletAddress;

        if (userAddress) {
            const userAccount = participants.find((p) => p.address.toLowerCase() === userAddress.toLowerCase());

            state.userAccountFromParticipants = userAccount || null;
        } else {
            state.userAccountFromParticipants = null;
        }
    },

    async deposit(channelId: string, tokenAddress: Address, amount: string): Promise<boolean> {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'deposit_pending';
            await state.channelContext.deposit(tokenAddress, BigInt(amount));
            state.status = 'funded';

            // Update wallet store with token and amount
            WalletStore.openChannel(tokenAddress, amount);

            // Update account info after successful deposit
            if (state.client && WalletStore.state.walletAddress) {
                const updatedInfo = await state.client.getAccountInfo(WalletStore.state.walletAddress, tokenAddress);

                this.updateAccountInfo(updatedInfo);
            }

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to deposit to channel ${channelId}:`, error);
            throw error;
        }
    },

    async createChannel(channelId: string): Promise<boolean> {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'open_pending';
            await state.channelContext.create();
            state.status = 'opened';

            // Add to open channels list
            this.addOpenChannelId(channelId);

            // Update wallet store
            WalletStore.setChannelOpen(true);

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to open channel ${channelId}:`, error);
            throw error;
        }
    },

    async closeChannel(channelId: string, nitroState: State): Promise<boolean> {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'close_pending';
            await state.channelContext.close(nitroState);
            state.status = 'closed';

            // Remove from open channels list
            this.removeOpenChannelId(channelId);

            // Update wallet store
            WalletStore.closeChannel();

            // Update account info if possible
            if (state.client && WalletStore.state.walletAddress && WalletStore.state.selectedTokenAddress) {
                const updatedInfo = await state.client.getAccountInfo(
                    WalletStore.state.walletAddress,
                    WalletStore.state.selectedTokenAddress,
                );

                this.updateAccountInfo(updatedInfo);
            }

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to close channel ${channelId}:`, error);
            throw error;
        }
    },

    /**
     * Withdraw funds from channel
     */
    async withdraw(channelId: string, token: Address, amount: bigint): Promise<boolean> {
        const previousStatus = state.status;

        try {
            if (!state.channelContext) {
                throw new Error(`Channel context not found for channel: ${channelId}`);
            }

            state.status = 'withdraw_pending';
            await state.channelContext.withdraw(token, amount);
            state.status = 'withdrawn';

            // Update account info if possible
            if (state.client && WalletStore.state.walletAddress) {
                const updatedInfo = await state.client.getAccountInfo(WalletStore.state.walletAddress, token);

                this.updateAccountInfo(updatedInfo);
            }

            return true;
        } catch (error) {
            state.status = previousStatus;
            console.error(`Failed to withdraw funds from ${channelId}:`, error);
            throw error;
        }
    },

    /**
     * Get account info
     */
    async getAccountInfo(account: Address, tokenAddress: Address): Promise<AccountInfo> {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const info = await state.client.getAccountInfo(account, tokenAddress);

            // Update our stored account info
            this.updateAccountInfo(info);

            return info;
        } catch (error) {
            console.error('Failed to get account info:', error);
            throw error;
        }
    },

    getLatestState(): State | null {
        if (!state.channelContext) {
            console.error('Channel context not found');
            return null;
        }

        return state.channelContext.getCurrentState();
    },

    appendState(tokenAddress: Address, amounts: [bigint, bigint]): State | null {
        if (!state.channelContext) {
            console.error('Channel context not found');
            return null;
        }

        return state.channelContext.appendAppState(BigInt(0), tokenAddress, amounts);
    },

    reset(): void {
        state.client = null;
        state.channelContext = null;
        state.status = 'none';
        state.stateSigner = null;
        state.accountInfo = {
            deposited: 0n,
            locked: 0n,
            channelCount: 0,
        };
        state.openChannelIds = [];
        state.participants = [];
        state.userAccountFromParticipants = null; // Reset user account
    },
};

export default NitroliteStore;
