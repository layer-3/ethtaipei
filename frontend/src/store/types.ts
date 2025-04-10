import { ChannelContext, NitroliteClient } from '@erc7824/nitrolite';
import { WalletSigner } from '@/websocket';
import { Address, Chain } from 'viem';

// Wallet related types
export type WalletProvider = 'metamask' | 'privy' | null;

export interface WalletState {
    // Connection
    connected: boolean;
    walletAddress: Address | null;
    chainId: number | null;
    error: string | null;
    walletProvider: WalletProvider;

    // Channel
    channelOpen: boolean;
    selectedTokenAddress: Address | null;
    selectedAmount: string | null;
}

// Channel and Nitrolite related types
export type ChannelStatus =
    | 'none'
    | 'deposit_pending'
    | 'funded'
    | 'open_pending'
    | 'opened'
    | 'close_pending'
    | 'closed'
    | 'withdraw_pending'
    | 'withdrawn';

export type ChannelId = string;

export interface AccountInfo {
    deposited: bigint;
    locked: bigint;
    channelCount: number;
}

export interface NitroliteState {
    client: NitroliteClient | null;
    channelContext: ChannelContext<bigint> | null;
    status: ChannelStatus;
    stateSigner: WalletSigner | null;
}

// Settings related types
export interface SettingsState {
    testnets: boolean;
    activeChain: Chain | undefined;
    prevChainId: number;
}
