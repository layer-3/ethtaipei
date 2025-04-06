import { proxy } from 'valtio';
import { Address } from 'viem';

export interface IWalletState {
    connected: boolean;
    account: Address | null;
    chainId: number | null;
    error: string | null;
    channelOpen: boolean;
    selectedTokenAddress: Address | null;
    selectedAmount: string | null;
    privyConnected: boolean;
    privyUserId: string | null;
}

const state = proxy<IWalletState>({
    connected: false,
    account: null,
    chainId: null,
    error: null,
    channelOpen: false,
    selectedTokenAddress: null,
    selectedAmount: null,
    privyConnected: false,
    privyUserId: null,
});

const WalletStore = {
    state,

    connect(account: Address, chainId: number) {
        state.connected = true;
        state.account = account;
        state.chainId = chainId;
        state.error = null;
    },

    disconnect() {
        state.connected = false;
        state.account = null;
        state.error = null;
        // We keep the channel open status since that's managed by the backend
    },
    
    connectPrivy(userId: string) {
        state.privyConnected = true;
        state.privyUserId = userId;
        state.error = null;
    },
    
    disconnectPrivy() {
        state.privyConnected = false;
        state.privyUserId = null;
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
        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainId.toString(16)}` }],
            }).catch((error) => {
                console.error('Error switching network:', error);
            });
        }
        state.chainId = chainId;
    },
};

export default WalletStore;
