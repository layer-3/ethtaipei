import { WalletSigner } from '@/websocket';
import { NitroliteClient } from '@erc7824/nitrolite';
import { proxy } from 'valtio';
import { NitroliteState, ChannelId, AccountInfo, Participant } from './types'; // Added Participant
import { SettingsStore, WalletStore } from './index';
import { NotificationService } from '@/utils/notificationService';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import APP_CONFIG from '@/config/app';

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
    status: 'none',
    stateSigner: null,
    accountInfo: {
        available: 0n,
        locked: 0n,
        channelCount: 0n,
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

    updateAccountInfo(info: AccountInfo): void {
        state.accountInfo = info;
    },

    addOpenChannelId(channelId: ChannelId): void {
        if (!state.openChannelIds.includes(channelId)) {
            state.openChannelIds.push(channelId);
            // Update channel count in account info
            // state.accountInfo.channelCount = state.openChannelIds.length;
        }
    },

    removeOpenChannelId(channelId: ChannelId): void {
        state.openChannelIds = state.openChannelIds.filter((id) => id !== channelId);
        // state.accountInfo.channelCount = state.openChannelIds.length;
    },

    setOpenChannelIds(channelIds: ChannelId[]): void {
        state.openChannelIds = channelIds;
    },

    /**
     * Set participants list and find the user's account within it.
     */
    setParticipants(participants: Participant[]): void {
        const userAddress = WalletStore.state.walletAddress;
        const previousUserAccount = state.userAccountFromParticipants;

        if (userAddress && state.stateSigner) {
            const userAccount = participants.find(
                (p) => p.address.toLowerCase() === state.stateSigner.address.toLowerCase(),
            );

            if (previousUserAccount && userAccount && previousUserAccount.amount !== userAccount.amount) {
                const amountDiff = userAccount.amount - previousUserAccount.amount;
                const chainId = SettingsStore.state.activeChain?.id;

                const tokenConfig = APP_CONFIG.TOKENS[chainId];

                const formattedAmount = formatTokenUnits(tokenConfig, amountDiff);

                if (amountDiff > 0n) {
                    this.notifyUser(`You received $ ${formattedAmount}`);
                } else if (amountDiff < 0n) {
                    this.notifyUser(`You sent $ ${formattedAmount.replace('-', '')}`);
                }
            }

            state.userAccountFromParticipants = userAccount || null;
        } else {
            state.userAccountFromParticipants = null;
        }

        state.participants = participants;
    },

    /**
     * Show notification to user
     */
    notifyUser(body: string, title: string = 'Clearnet Transaction'): void {
        try {
            const notificationService = NotificationService.getInstance();

            notificationService.showNotification({
                title,
                body,
                url: '/account',
            });
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    },

    /**
     * Get account info
     */
    async getAccountInfo(): Promise<AccountInfo> {
        try {
            if (!state.client) {
                throw new Error('Nitrolite client not initialized');
            }

            const info = await state.client.getAccountInfo();

            // Update our stored account info
            this.updateAccountInfo(info);

            return info;
        } catch (error) {
            console.error('Failed to get account info:', error);
            throw error;
        }
    },

    reset(): void {
        state.client = null;
        state.status = 'none';
        state.stateSigner = null;
        state.accountInfo = {
            available: 0n,
            locked: 0n,
            channelCount: 0n,
        };
        state.openChannelIds = [];
        state.participants = [];
        state.userAccountFromParticipants = null; // Reset user account
    },
};

export default NitroliteStore;
