import { proxy } from 'valtio';
import { Address } from 'viem';
import { WalletState, WalletProvider } from './types';
import { SettingsStore } from './index';

/**
 * Wallet Store
 *
 * Handles wallet connections, addresses, and basic channel state.
 * Responsible for:
 * - Managing wallet connection state
 * - Tracking wallet addresses
 * - Tracking chain ID
 * - Basic channel open/close state
 */

const state = proxy<WalletState>({
    connected: false,
    walletAddress: null,
    chainId: null,
    error: null,
    channelOpen: false,
    selectedTokenAddress: null,
    selectedAmount: null,
    walletProvider: null,
});

const WalletStore = {
    state,

    /**
     * Connect wallet
     * @param address Wallet address
     * @param provider Wallet provider (metamask or privy)
     */
    connect(address: Address, provider: WalletProvider = 'metamask') {
        state.connected = true;
        state.walletAddress = address;
        state.walletProvider = provider;
        state.error = null;
    },

    /**
     * Disconnect wallet
     */
    disconnect() {
        state.connected = false;
        state.walletAddress = null;
        state.walletProvider = null;
        state.error = null;
        // We keep the channel open status since that's managed by the backend
    },

    /**
     * Set error message
     */
    setError(message: string) {
        state.error = message;
    },

    /**
     * Clear error message
     */
    clearError() {
        state.error = null;
    },

    /**
     * Set chain ID and update settings
     */
    setChainId(chainId: number) {
        state.chainId = chainId;
        // Update the active chain in settings if it's different
        if (SettingsStore.state.activeChain?.id !== chainId) {
            const chain = SettingsStore.getChainById(chainId);

            if (chain) {
                SettingsStore.setActiveChain(chain);
            }
        }
    },

    /**
     * Open payment channel
     */
    openChannel(tokenAddress: Address, amount: string) {
        state.channelOpen = true;
        state.selectedTokenAddress = tokenAddress;
        state.selectedAmount = amount;
    },

    /**
     * Close payment channel
     */
    closeChannel() {
        state.channelOpen = false;
        state.selectedTokenAddress = null;
        state.selectedAmount = null;
    },

    /**
     * Set channel open status
     */
    setChannelOpen(isOpen: boolean) {
        state.channelOpen = isOpen;
    },

    /**
     * Switch chain (for metamask)
     */
    async switchChain(chainId: number) {
        try {
            if (typeof window !== 'undefined' && window.ethereum && state.walletProvider === 'metamask') {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${chainId.toString(16)}` }],
                });
            }
            state.chainId = chainId;

            // Update settings
            const chain = SettingsStore.getChainById(chainId);

            if (chain) {
                SettingsStore.setActiveChain(chain);
            }

            return true;
        } catch (error) {
            console.error('Error switching network:', error);
            this.setError('Failed to switch network');
            return false;
        }
    },

    /**
     * Check if wallet is connected
     */
    isWalletConnected(): boolean {
        return state.connected && state.walletAddress !== null;
    },

    /**
     * Get wallet address
     */
    getWalletAddress(): Address | null {
        return state.walletAddress;
    },

    /**
     * Get selected token and amount
     */
    getSelectedToken(): { address: Address | null; amount: string | null } {
        return {
            address: state.selectedTokenAddress,
            amount: state.selectedAmount,
        };
    },
};

export default WalletStore;
