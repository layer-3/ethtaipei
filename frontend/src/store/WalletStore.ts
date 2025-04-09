import { proxy } from 'valtio';
import { Address } from 'viem';

export interface IWalletState {
    connected: boolean;
    walletAddress: Address | null;
    chainId: number | null;
    error: string | null;
    channelOpen: boolean;
    selectedTokenAddress: Address | null;
    selectedAmount: string | null;
    walletProvider: 'metamask' | 'privy' | null;
}

const state = proxy<IWalletState>({
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

    connect(address: Address, provider: 'metamask' | 'privy' = 'metamask') {
        state.connected = true;
        state.walletAddress = address;
        state.walletProvider = provider;
        state.error = null;
    },

    disconnect() {
        state.connected = false;
        state.walletAddress = null;
        state.walletProvider = null;
        state.error = null;
        // We keep the channel open status since that's managed by the backend
    },

    setError(message: string) {
        state.error = message;
    },

    clearError() {
        state.error = null;
    },

    setChainId(chainId: number) {
        state.chainId = chainId;
    },

    openChannel(tokenAddress: Address, amount: string) {
        state.channelOpen = true;
        state.selectedTokenAddress = tokenAddress;
        state.selectedAmount = amount;
    },

    closeChannel() {
        state.channelOpen = false;
        state.selectedTokenAddress = null;
        state.selectedAmount = null;
    },

    setChannelOpen(isOpen: boolean) {
        state.channelOpen = isOpen;
    },

    switchChain(chainId: number) {
        if (typeof window !== 'undefined' && window.ethereum && state.walletProvider === 'metamask') {
            window.ethereum
                .request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${chainId.toString(16)}` }],
                })
                .catch((error) => {
                    console.error('Error switching network:', error);
                });
        }
        state.chainId = chainId;
    },

    // Helper method to check if wallet is connected regardless of provider
    isWalletConnected() {
        return state.connected && state.walletAddress !== null;
    },

    // Helper to get current wallet address
    getWalletAddress(): Address | null {
        return state.walletAddress;
    },
};

export default WalletStore;
