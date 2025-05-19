import { NitroliteClient } from '@erc7824/nitrolite';
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
    available: bigint;
    channelCount: bigint;
}

export interface Participant {
    asset: string;
    amount: string;
}

export interface LedgerChannel {
    channel_id: string;
    participant: string;
    status: string;
    token: string;
    amount: bigint;
    chain_id: number;
    adjudicator: string;
    challenge: number;
    nonce: number;
    version: number;
    created_at: string;
    updated_at: string;
}

export type ParticipantsResponse = [[Participant]];

export interface NitroliteState {
    client: NitroliteClient | null;
    status: ChannelStatus;
    stateSigner: WalletSigner | null;
    accountInfo: AccountInfo;
    openChannelIds: ChannelId[];
    participants: Participant[];
    ledgerChannels: LedgerChannel[];
    userAccountFromParticipants: Participant | null;
}

// Settings related types
export interface SettingsState {
    testnets: boolean;
    activeChain: Chain | undefined;
    prevChainId: number;
}
