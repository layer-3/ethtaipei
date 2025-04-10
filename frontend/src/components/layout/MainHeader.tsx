import { useSnapshot } from 'valtio';
import { NitroliteStore, SettingsStore, WalletStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { useEffect, useMemo, useState } from 'react';
import APP_CONFIG from '@/config/app';
import { AccountInfo } from '@/store/types';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useChannelClose } from '@/hooks/channel/useChannelClose';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
import { Address, Hex, parseSignature } from 'viem';
import { Channel, State } from '@erc7824/nitrolite';
import { AdjudicatorApp } from '@/services';

interface MainHeaderProps {
    onOpenDeposit: () => void;
    onOpenCloseChannel: () => void;
}

export function MainHeader({ onOpenDeposit, onOpenCloseChannel }: MainHeaderProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const activeChain = useSnapshot(SettingsStore.state).activeChain;
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';
    const nitroliteStore = useSnapshot(NitroliteStore.state);
    const { handleCloseChannel } = useChannelClose();
    const { handleCreateChannel } = useChannelCreate();

    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    });

    // Extract fetchAccountInfo to be reusable
    const fetchAccountInfo = async () => {
        if (!activeChain || !walletSnap.walletAddress) return;

        try {
            const response = await nitroliteStore.client.getAccountInfo(
                walletSnap.walletAddress,
                APP_CONFIG.TOKENS[activeChain.id],
            );

            setAccountInfo(response);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    };

    useEffect(() => {
        fetchAccountInfo();
    }, [nitroliteStore]);

    console.log('accountInfo', accountInfo);

    const currentDeposit = useMemo(() => {
        const deposit = accountInfo.deposited;

        if (!deposit) return '0';

        // Get token address and amount
        const tokenAddress = APP_CONFIG.TOKENS[activeChain.id];

        // Use our utility to format with the correct decimals
        const displayValue = formatTokenUnits(tokenAddress, deposit);

        return displayValue;
    }, [accountInfo]);

    const currentLocked = useMemo(() => {
        const locked = accountInfo.locked;

        if (!locked) return '0';

        // Get token address and amount
        const tokenAddress = APP_CONFIG.TOKENS[activeChain.id];

        // Use our utility to format with the correct decimals
        const displayValue = formatTokenUnits(tokenAddress, locked);

        return displayValue;
    }, [accountInfo]);

    const handleWithdrawal = async () => {
        if (!walletSnap.connected) return;

        try {
            await nitroliteStore.client.withdraw(APP_CONFIG.TOKENS[activeChain.id], accountInfo.deposited);
            console.log('Withdrawal successful');

            // Refetch account info after withdrawal
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error withdrawing:', error);
        }
    };

    const handleClose = async () => {
        if (!walletSnap.connected) return;

        try {
            try {
                // The hook will handle all the state creation and signing
                await handleCloseChannel();

                console.log('Channel closed successfully');
            } catch (channelError) {
                console.error('Failed to close channel:', channelError);
            }

            console.log('All channels processed');

            // Refetch account info after closing channels
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error closing channels:', error);
        }
    };

    const onCreateChannel = async () => {
        if (!walletSnap.connected) return;

        try {
            // Using a hardcoded amount of 0.3 like in your close function
            const tokenAddress = APP_CONFIG.TOKENS[activeChain.id] as Address;
            const amount = currentDeposit;

            console.log('Creating channel with token:', tokenAddress, 'amount:', amount);

            // Create and deposit in one go
            const channelId = await handleCreateChannel(tokenAddress, amount);

            console.log('Channel created successfully with ID:', channelId);

            // Refresh account info
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error creating channel:', error);
        }
    };

    const handleChallenge = async () => {
        if (!walletSnap.connected || !nitroliteStore.client) return;

        try {
            // Define localStorage keys - must match those in useChannelCreate and useChannelClose
            const STORAGE_KEYS = {
                CHANNEL: 'nitrolite_channel',
                CHANNEL_STATE: 'nitrolite_channel_state',
                CHANNEL_ID: 'nitrolite_channel_id',
            };

            // Get channel ID from localStorage
            const channelId = localStorage.getItem(STORAGE_KEYS.CHANNEL_ID) as Hex;

            if (!channelId) {
                console.error('No channel ID found in localStorage');
                return;
            }

            // Get and parse channel state from localStorage
            const savedChannelState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

            if (!savedChannelState) {
                console.error('No channel state found in localStorage');
                return;
            }

            // Parse the state with BigInt handling
            const state = JSON.parse(savedChannelState, (key, value) => {
                // Convert strings that look like BigInts back to BigInt
                if (typeof value === 'string' && /^\d+n$/.test(value)) {
                    return BigInt(value.substring(0, value.length - 1));
                }
                return value;
            });

            console.log('Challenging channel with ID:', channelId);
            console.log('Using state:', state);

            // Call the challenge function with the channel ID and state from localStorage
            await nitroliteStore.client.challengeChannel(channelId, state);

            console.log('Channel challenged successfully');

            // Refresh account info after challenging
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error challenging channel:', error);

            // Show user friendly message
            if (error instanceof Error) {
                alert(`Challenge failed: ${error.message}`);
            } else {
                alert('Challenge failed with an unknown error');
            }
        }
    };

    return (
        <header className="flex gap-4 items-center justify-between flex-wrap">
            <div className="flex gap-4 items-center">
                <span>Channel: $ {currentLocked}</span>
                <span>Available: $ {currentDeposit}</span>
                {walletSnap.connected && !walletSnap.channelOpen && (
                    <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
                )}
                {walletSnap.connected && <ActionButton onClick={onCreateChannel}>Create Channel</ActionButton>}
                {walletSnap.connected && <ActionButton onClick={handleWithdrawal}>Withdraw</ActionButton>}
                {walletSnap.connected && <ActionButton onClick={handleChallenge}>Challenge</ActionButton>}
                {walletSnap.connected && <ActionButton onClick={handleClose}>Close Channel</ActionButton>}
            </div>
            <div className={walletSnap.connected ? '' : 'ml-auto'}>
                {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
            </div>
        </header>
    );
}
