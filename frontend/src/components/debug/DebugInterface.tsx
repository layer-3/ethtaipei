import React, { useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Address } from 'viem';
import { WalletStore, SettingsStore, NitroliteStore } from '@/store';
import AppStore from '@/store/AppStore';
import { AccountInfo } from '@/store/types';
import APP_CONFIG from '@/config/app';

// UI sections
import { WalletConnectionSection } from './sections/WalletConnectionSection';
import { StatusDashboardSection } from './sections/StatusDashboardSection';
import { DepositSection } from './sections/DepositSection';
import { ChannelCreateSection } from './sections/ChannelCreateSection';
import { TransactionHistorySection } from './sections/TransactionHistorySection';
import { ListParticipantsSection } from './sections/ListParticipantsSection';
import { VirtualChannelSection } from './sections/VirtualChannelSection';
import { CloseVirtualChannelSection } from './sections/CloseVirtualChannelSection';
import { ChallengeChannelSection } from './sections/ChallengeChannelSection';
import { CloseChannelSection } from './sections/CloseChannelSection';
import { WithdrawSection } from './sections/WithdrawSection';
import Deposit from '@/components/wallet/clearnet/Deposit';

// Hooks
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';
import { useWebSocket } from '@/hooks/websocket/useWebSocket';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useChannelClose } from '@/hooks/channel/useChannelClose';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';

// Our new handlers
import { useDebugAccount } from './handlers/useDebugAccount';
import { useDebugParticipants } from './handlers/useDebugParticipants';
import { useDebugChannels } from './handlers/useDebugChannels';
import { useDebugVirtualChannels } from './handlers/useDebugVirtualChannels';

export function DebugInterface() {
    // Snapshots
    const appSnap = useSnapshot(AppStore.state);
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);

    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    // Basic hooks for responses & history
    const { responses, loadingStates } = useResponseTracking();
    const { transactionHistory } = useTransactionHistory();

    // WebSocket
    const wsUrl = APP_CONFIG.WEBSOCKET.URL;
    const { sendRequest, connect, generateKeys, isConnected, hasKeys, status } = useWebSocket(wsUrl);

    // Local UI States
    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    });
    const [participants, setParticipants] = useState<any[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [virtualChannelAmount, setVirtualChannelAmount] = useState('100');
    const [virtualChannelId, setVirtualChannelId] = useState('');
    const [allocations, setAllocations] = useState({ participantA: '0', participantB: '200' });

    // Handlers from custom hooks
    const { fetchAccountInfo } = useDebugAccount({
        activeChainId: settingsSnap.activeChain?.id,
        setAccountInfo,
    });

    const { getParticipants } = useDebugParticipants({
        wsProps: { isConnected, connect, sendRequest },
        activeChainId: settingsSnap.activeChain?.id,
    });

    const {
        createChannel,
        closeChannel,
        challengeChannel,
        withdraw,
        fetchAccountInfo: fetchAccountInfo2, // optional if we want the same method
    } = useDebugChannels({
        accountInfo,
        setAccountInfo,
        activeChainId: settingsSnap.activeChain?.id,
    });

    const { openVirtualChannel, closeVirtualChannel } = useDebugVirtualChannels({
        isConnected,
        connect,
    });

    // Original channel hooks
    const { handleCloseChannel } = useChannelClose();
    const { handleCreateChannel } = useChannelCreate();

    // Modal handlers
    const handleOpenDeposit = () => AppStore.openDeposit();
    const handleCloseDeposit = () => AppStore.closeDeposit();

    // Computed deposit/locked
    const currentDeposit = useMemo(() => {
        if (!walletSnap.connected) return '0';
        const chainId = settingsSnap.activeChain?.id;

        if (!chainId) return '0';
        const token = APP_CONFIG.TOKENS[chainId];

        return token ? formatTokenUnits(token, accountInfo.deposited) : '0';
    }, [walletSnap.connected, settingsSnap.activeChain, accountInfo.deposited]);

    const currentLocked = useMemo(() => {
        if (!walletSnap.connected) return '0';
        const chainId = settingsSnap.activeChain?.id;

        if (!chainId) return '0';
        const token = APP_CONFIG.TOKENS[chainId];

        return token ? formatTokenUnits(token, accountInfo.locked) : '0';
    }, [walletSnap.connected, settingsSnap.activeChain, accountInfo.locked]);

    // Utility
    const isCurrentUser = (address: string) => {
        return nitroSnap.stateSigner?.address === address;
    };

    // Example: load participants
    const handleGetListOfParticipants = () => {
        getParticipants(setParticipants, setSelectedParticipant);
    };

    // Example: create channel
    const onCreateChannel = async () => {
        const chainId = settingsSnap.activeChain?.id;

        if (!walletSnap.connected || !chainId) return;
        const tokenAddress = APP_CONFIG.TOKENS[chainId] as Address;

        await handleCreateChannel(tokenAddress, currentDeposit);
    };

    // useEffect to connect WS and fetch info
    useEffect(() => {
        if (walletSnap.connected && walletSnap.walletAddress && settingsSnap.activeChain && nitroSnap.client) {
            fetchAccountInfo();

            const setupWebSocket = async () => {
                if (!hasKeys) {
                    await generateKeys();
                }
                await connect();
            };

            setupWebSocket().catch((err) => {
                console.error('WebSocket connection failed:', err);
            });
        }
    }, [
        walletSnap.connected,
        walletSnap.walletAddress,
        settingsSnap.activeChain,
        nitroSnap.client,
        fetchAccountInfo,
        hasKeys,
        connect,
        generateKeys,
    ]);

    return (
        <div className="max-w-4xl mx-auto w-full">
            <WalletConnectionSection isPrivyEnabled={isPrivyEnabled} />

            {walletSnap.connected && (
                <>
                    <StatusDashboardSection
                        accountInfo={accountInfo}
                        currentDeposit={currentDeposit}
                        currentLocked={currentLocked}
                        virtualChannelId={virtualChannelId}
                        allocations={allocations}
                        wsStatus={{ isConnected, status }}
                    />

                    <DepositSection currentDeposit={currentDeposit} onOpenDeposit={handleOpenDeposit} />

                    <ChannelCreateSection
                        currentDeposit={currentDeposit}
                        currentLocked={currentLocked}
                        accountInfo={accountInfo}
                        onCreateChannel={onCreateChannel}
                        isLoading={loadingStates.createChannel || false}
                        response={responses.createChannel}
                    />

                    <ListParticipantsSection
                        participants={participants}
                        selectedParticipant={selectedParticipant}
                        onSelectParticipant={setSelectedParticipant}
                        onGetParticipants={handleGetListOfParticipants}
                        isLoading={loadingStates.participants || false}
                        response={responses.participants}
                        isCurrentUser={isCurrentUser}
                    />

                    <VirtualChannelSection
                        selectedParticipant={selectedParticipant}
                        virtualChannelAmount={virtualChannelAmount}
                        onChangeVirtualChannelAmount={setVirtualChannelAmount}
                        onOpenVirtualChannel={async () => {
                            const chainId = settingsSnap.activeChain?.id;

                            if (!chainId) return;
                            const participantA = nitroSnap.stateSigner?.address || '';

                            await openVirtualChannel(
                                sendRequest,
                                participantA,
                                selectedParticipant,
                                virtualChannelAmount,
                                chainId,
                            );
                        }}
                        isLoading={loadingStates.virtualChannel || false}
                        response={responses.virtualChannel}
                    />

                    <CloseVirtualChannelSection
                        allocations={allocations}
                        setAllocations={setAllocations}
                        virtualChannelId={virtualChannelId}
                        onCloseVirtualChannel={async () => {
                            const chainId = settingsSnap.activeChain?.id;

                            if (!chainId) return;
                            const participantA = nitroSnap.stateSigner?.address || '';

                            await closeVirtualChannel(
                                sendRequest,
                                virtualChannelId || localStorage.getItem('virtual_channel_id') || '',
                                participantA,
                                selectedParticipant,
                                allocations.participantA,
                                allocations.participantB,
                                chainId,
                            );
                        }}
                        isLoading={loadingStates.closeVirtualChannel || false}
                        response={responses.closeVirtualChannel}
                    />

                    <ChallengeChannelSection
                        onChallenge={challengeChannel}
                        isLoading={loadingStates.challenge || false}
                        response={responses.challenge}
                    />

                    <CloseChannelSection
                        accountInfo={accountInfo}
                        onClose={async () => {
                            // Or call closeChannel from our custom hook
                            await handleCloseChannel();
                        }}
                        isLoading={loadingStates.closeChannel || false}
                        response={responses.closeChannel}
                    />

                    <WithdrawSection
                        currentDeposit={currentDeposit}
                        onWithdraw={async () => {
                            await withdraw(currentDeposit);
                        }}
                        isLoading={loadingStates.withdrawal || false}
                        response={responses.withdrawal}
                    />

                    <TransactionHistorySection transactions={transactionHistory} responses={responses} />
                </>
            )}

            <Deposit isOpen={appSnap.isDepositOpen} onClose={handleCloseDeposit} />
        </div>
    );
}
