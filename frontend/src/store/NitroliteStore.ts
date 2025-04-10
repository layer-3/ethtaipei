import { WalletSigner } from '@/websocket';
import { AppLogic, ChannelContext, NitroliteClient, Channel, State } from '@erc7824/nitrolite';
import { proxy } from 'valtio';
import { Address } from 'viem';
import { NitroliteState, ChannelStatus, ChannelId, AccountInfo } from './types';
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
});

const NitroliteStore = {
    state,

    /**
     * Set Nitrolite client
     */
    setClient(client: NitroliteClient | null): boolean {
        if (!client) {
            console.error('Attempted to set null or undefined Nitrolite client');
            return false;
        }
        state.client = client;
        return true;
    },

    /**
     * Set channel context
     */
    setChannelContext(channel: Channel, nitroState: State, app: AppLogic<bigint>): ChannelContext<bigint> {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const channelContext = new ChannelContext<bigint>(state.client, channel, nitroState, app);

            state.channelContext = channelContext;

            // Add channel ID to open channels list if not already there
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

    /**
     * Get channel context
     */
    getChannelContext(): ChannelContext<bigint> | null {
        return state.channelContext;
    },

    /**
     * Get channel status
     */
    getStatus(): ChannelStatus {
        return state.status;
    },

    /**
     * Update stored account information
     */
    updateAccountInfo(info: AccountInfo): void {
        state.accountInfo = info;
    },

    /**
     * Get stored account information
     */
    getStoredAccountInfo(): AccountInfo {
        return state.accountInfo;
    },

    /**
     * Add a channel ID to open channels list
     */
    addOpenChannelId(channelId: ChannelId): void {
        if (!state.openChannelIds.includes(channelId)) {
            state.openChannelIds.push(channelId);
            // Update channel count in account info
            state.accountInfo.channelCount = state.openChannelIds.length;
        }
    },

    /**
     * Remove a channel ID from open channels list
     */
    removeOpenChannelId(channelId: ChannelId): void {
        state.openChannelIds = state.openChannelIds.filter((id) => id !== channelId);
        // Update channel count in account info
        state.accountInfo.channelCount = state.openChannelIds.length;
    },

    /**
     * Get list of open channel IDs
     */
    getOpenChannelIds(): ChannelId[] {
        return state.openChannelIds;
    },

    /**
     * Set list of open channel IDs
     */
    setOpenChannelIds(channelIds: ChannelId[]): void {
        state.openChannelIds = channelIds;
        // Update channel count in account info
        state.accountInfo.channelCount = channelIds.length;
    },

    /**
     * Deposit into channel
     */
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

    /**
     * Create channel
     */
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

    /**
     * Close channel
     */
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
     * Get channels associated with an account for a specific token
     */
    async getAccountChannels(account: Address): Promise<ChannelId[]> {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const channels = await state.client.getAccountChannels(account);

            // Update our stored list of channel IDs
            this.setOpenChannelIds(channels);

            return channels;
        } catch (error) {
            console.error('Failed to get account channels:', error);
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

    /**
     * Get latest state
     */
    getLatestState(): State | null {
        if (!state.channelContext) {
            console.error('Channel context not found');
            return null;
        }

        return state.channelContext.getCurrentState();
    },

    /**
     * Append state
     */
    appendState(tokenAddress: Address, amounts: [bigint, bigint]): State | null {
        if (!state.channelContext) {
            console.error('Channel context not found');
            return null;
        }

        return state.channelContext.appendAppState(BigInt(0), tokenAddress, amounts);
    },

    /**
     * Reset state (for testing and cleanup)
     */
    reset(): void {
        state.channelContext = null;
        state.status = 'none';
        state.stateSigner = null;
        state.accountInfo = {
            deposited: 0n,
            locked: 0n,
            channelCount: 0,
        };
        state.openChannelIds = [];
        // We don't reset the client as it's expensive to recreate
    },
};

export default NitroliteStore;
