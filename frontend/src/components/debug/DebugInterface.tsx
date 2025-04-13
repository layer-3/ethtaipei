import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { WalletStore, SettingsStore, NitroliteStore } from '@/store';
import AppStore from '@/store/AppStore';
import { AccountInfo } from '@/store/types';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useChannelClose } from '@/hooks/channel/useChannelClose';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
import { Address, Hex } from 'viem';
import { useWebSocket } from '@/hooks/websocket/useWebSocket';
import APP_CONFIG from '@/config/app';
import { WalletConnectionSection } from './sections/WalletConnectionSection';
import { StatusDashboardSection } from './sections/StatusDashboardSection';
import { DepositSection } from './sections/DepositSection';
import { ChannelCreateSection } from './sections/ChannelCreateSection';
import { TransactionHistorySection } from './sections/TransactionHistorySection';
import { useTransactionHistory } from '@/hooks/debug/useTransactionHistory';
import { useResponseTracking } from '@/hooks/debug/useResponseTracking';
import Deposit from '@/components/wallet/clearnet/Deposit';
import { ListParticipantsSection } from './sections/ListParticipantsSection';
import { VirtualChannelSection } from './sections/VirtualChannelSection';
import { CloseVirtualChannelSection } from './sections/CloseVirtualChannelSection';
import { ChallengeChannelSection } from './sections/ChallengeChannelSection';
import { CloseChannelSection } from './sections/CloseChannelSection';
import { WithdrawSection } from './sections/WithdrawSection';

export function DebugInterface() {
    const appSnap = useSnapshot(AppStore.state);
    const walletSnap = useSnapshot(WalletStore.state);
    const activeChain = useSnapshot(SettingsStore.state).activeChain;
    const nitroliteSnap = useSnapshot(NitroliteStore.state);
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    // Custom hooks
    const { transactionHistory, addToHistory } = useTransactionHistory();
    const { responses, loadingStates, setResponse, setLoading } = useResponseTracking();
    const { handleCloseChannel } = useChannelClose();
    const { handleCreateChannel } = useChannelCreate();

    // WebSocket setup
    const wsUrl = APP_CONFIG.WEBSOCKET.URL;
    const { sendRequest, connect, generateKeys, isConnected, hasKeys, status } = useWebSocket(wsUrl);

    // State for UI elements
    const [virtualChannelId, setVirtualChannelId] = useState<string>('');
    const [virtualChannelAmount, setVirtualChannelAmount] = useState<string>('100');
    const [participants, setParticipants] = useState<any[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<string>('');
    const [allocations, setAllocations] = useState({
        participantA: '0',
        participantB: '200',
    });
    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    });

    // Deposit modal handlers
    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    // Extract fetchAccountInfo to be reusable
    const fetchAccountInfo = async () => {
        if (!activeChain || !walletSnap.walletAddress) return;

        try {
            const response = await NitroliteStore.getAccountInfo(
                walletSnap.walletAddress,
                APP_CONFIG.TOKENS[activeChain.id],
            );

            setAccountInfo(response);
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    };

    // Initialize and connect to WebSocket when wallet is connected
    useEffect(() => {
        if (walletSnap.connected && walletSnap.walletAddress && activeChain && nitroliteSnap.client) {
            // Call fetch account info immediately
            fetchAccountInfo();

            // Setup WebSocket connection
            const setupWebSocketConnection = async () => {
                try {
                    // Generate keys if we don't have them
                    if (!hasKeys) {
                        console.log('Generating new WebSocket keys...');
                        await generateKeys();
                    }

                    // Connect to WebSocket server
                    console.log('Connecting to WebSocket server...');
                    await connect();
                    console.log('WebSocket connection established:', status);
                } catch (error) {
                    console.error('WebSocket connection failed:', error);
                }
            };

            setupWebSocketConnection();
        }
    }, [
        walletSnap.connected,
        walletSnap.walletAddress,
        activeChain,
        nitroliteSnap.client,
        hasKeys,
        connect,
        generateKeys,
        status,
    ]);

    // Format account balances
    const currentDeposit = useMemo(() => {
        if (!walletSnap.connected) return '0';

        const deposit = accountInfo.deposited;

        if (!deposit) return '0';

        // Get token address and amount
        const tokenAddress = APP_CONFIG.TOKENS[activeChain?.id];

        if (!tokenAddress) return '0';

        // Use our utility to format with the correct decimals
        const displayValue = formatTokenUnits(tokenAddress, deposit);

        return displayValue;
    }, [accountInfo, walletSnap.connected, activeChain]);

    const currentLocked = useMemo(() => {
        if (!walletSnap.connected) return '0';

        const locked = accountInfo.locked;

        if (!locked) return '0';

        // Get token address and amount
        const tokenAddress = APP_CONFIG.TOKENS[activeChain?.id];

        if (!tokenAddress) return '0';

        // Use our utility to format with the correct decimals
        const displayValue = formatTokenUnits(tokenAddress, locked);

        return displayValue;
    }, [accountInfo, walletSnap.connected, activeChain]);

    // Check if the address belongs to the current user
    const isCurrentUser = (address: string) => {
        return nitroliteSnap.stateSigner && nitroliteSnap.stateSigner.address === address;
    };

    // Channel operations
    const onCreateChannel = async () => {
        if (!walletSnap.connected) return;

        setLoading('createChannel', true);
        addToHistory('createChannel', 'pending', 'Creating payment channel...');

        try {
            const tokenAddress = APP_CONFIG.TOKENS[activeChain.id] as Address;
            const amount = currentDeposit;

            console.log('Creating channel with token:', tokenAddress, 'amount:', amount);

            // Create and deposit in one go
            const channelId = await handleCreateChannel(tokenAddress, amount);

            console.log('Channel created successfully with ID:', channelId);

            setResponse('createChannel', {
                success: true,
                channelId: channelId,
                message: 'Channel created successfully',
            });

            addToHistory('createChannel', 'success', `Channel created with ID: ${channelId.substring(0, 10)}...`, {
                channelId,
                amount,
                tokenAddress,
            });

            // Refresh account info
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error creating channel:', error);
            setResponse('createChannel', { error: error instanceof Error ? error.message : 'Unknown error' });

            addToHistory(
                'createChannel',
                'error',
                `Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('createChannel', false);
        }
    };

    // Withdrawal handler
    const handleWithdrawal = async () => {
        if (!walletSnap.connected || !nitroliteSnap.client) return;

        setLoading('withdrawal', true);
        addToHistory('withdrawal', 'pending', 'Processing withdrawal...');

        try {
            await nitroliteSnap.client.withdraw(APP_CONFIG.TOKENS[activeChain.id], accountInfo.deposited);
            console.log('Withdrawal successful');

            setResponse('withdrawal', { success: true, message: 'Withdrawal successful' });

            addToHistory('withdrawal', 'success', `Successfully withdrew ${currentDeposit} tokens`, {
                amount: currentDeposit,
                token: APP_CONFIG.TOKENS[activeChain.id],
            });

            // Refetch account info after withdrawal
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error withdrawing:', error);
            setResponse('withdrawal', { error: error instanceof Error ? error.message : 'Unknown error' });

            addToHistory(
                'withdrawal',
                'error',
                `Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('withdrawal', false);
        }
    };

    // Close channel handler
    const handleClose = async () => {
        if (!walletSnap.connected) return;

        setLoading('closeChannel', true);
        addToHistory('closeChannel', 'pending', 'Closing payment channel...');

        try {
            try {
                // The hook will handle all the state creation and signing
                await handleCloseChannel();

                console.log('Channel closed successfully');

                setResponse('closeChannel', { success: true, message: 'Channel closed successfully' });

                addToHistory('closeChannel', 'success', 'Payment channel closed successfully');
            } catch (channelError) {
                console.error('Failed to close channel:', channelError);
                setResponse('closeChannel', {
                    error: channelError instanceof Error ? channelError.message : 'Unknown error',
                });

                addToHistory(
                    'closeChannel',
                    'error',
                    `Failed to close channel: ${channelError instanceof Error ? channelError.message : 'Unknown error'}`,
                );
            }

            // Refetch account info after closing channels
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error closing channels:', error);
            setResponse('closeChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setLoading('closeChannel', false);
        }
    };

    // Challenge channel handler
    const handleChallenge = async () => {
        if (!walletSnap.connected || !nitroliteSnap.client) return;

        setLoading('challenge', true);
        addToHistory('challenge', 'pending', 'Challenging channel...');

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
                throw new Error('No channel ID found in localStorage');
            }

            // Get and parse channel state from localStorage
            const savedChannelState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);

            if (!savedChannelState) {
                throw new Error('No channel state found in localStorage');
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
            await nitroliteSnap.client.challengeChannel(channelId, state);

            console.log('Channel challenged successfully');

            setResponse('challenge', {
                success: true,
                channelId: channelId,
                message: 'Channel challenged successfully',
            });

            addToHistory('challenge', 'success', `Channel ${channelId.substring(0, 10)}... challenged successfully`);

            // Refresh account info after challenging
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error challenging channel:', error);
            setResponse('challenge', { error: error instanceof Error ? error.message : 'Unknown error' });

            addToHistory(
                'challenge',
                'error',
                `Challenge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('challenge', false);
        }
    };

    // Get list of participants handler
    const handleGetListOfParticipants = async () => {
        console.log('Fetching list of participants...');
        console.log('WebSocket connected:', isConnected);

        setLoading('participants', true);
        setResponse('participants', null);
        addToHistory('participants', 'pending', 'Fetching available participants...');

        if (!isConnected) {
            console.log('WebSocket not connected, attempting to connect...');
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setResponse('participants', { error: 'Failed to connect WebSocket' });
                setLoading('participants', false);
                addToHistory('participants', 'error', 'Failed to connect to WebSocket server');
                return;
            }
        }

        const message = {
            token_address: APP_CONFIG.TOKENS[activeChain?.id] || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        };

        try {
            const response = await sendRequest('ListOpenParticipants', JSON.stringify([message]));

            console.log('Participants response:', response);

            // Store the full response for debugging
            setResponse('participants', response);

            // Process the participants list - handling the nested array structure
            if (response && Array.isArray(response)) {
                // Handle the case where response is the full websocket response with res and sig
                if (response.res && Array.isArray(response.res[2]) && response.res[2][0]) {
                    setParticipants(response.res[2][0]);
                    if (response.res[2][0].length > 0) {
                        setSelectedParticipant(response.res[2][0][0].address);
                    }
                    addToHistory('participants', 'success', `Found ${response.res[2][0].length} participants`);
                }
                // Handle the case where response is just the array of participants
                else if (response[0] && Array.isArray(response[0])) {
                    setParticipants(response[0]);
                    if (response[0].length > 0) {
                        setSelectedParticipant(response[0][0].address);
                    }
                    addToHistory('participants', 'success', `Found ${response[0].length} participants`);
                }
                // Direct array of participants
                else if (response.length > 0 && response[0].address) {
                    setParticipants(response);
                    setSelectedParticipant(response[0].address);
                    addToHistory('participants', 'success', `Found ${response.length} participants`);
                } else {
                    addToHistory('participants', 'success', 'No participants found');
                }
            } else {
                addToHistory('participants', 'success', 'No participants found');
            }
        } catch (error) {
            console.error('Error getting participants:', error);
            setResponse('participants', { error: error instanceof Error ? error.message : 'Unknown error' });
            addToHistory(
                'participants',
                'error',
                `Failed to get participants: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('participants', false);
        }
    };

    // Open virtual channel handler
    const handleOpenVirtualChannel = async () => {
        console.log('Opening virtual channel...');

        if (!selectedParticipant) {
            setResponse('virtualChannel', { error: 'Please select a participant first' });
            addToHistory('virtualChannel', 'error', 'No participant selected for virtual channel');
            return;
        }

        setLoading('virtualChannel', true);
        setResponse('virtualChannel', null);
        addToHistory('virtualChannel', 'pending', 'Opening virtual channel...');

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setResponse('virtualChannel', { error: 'Failed to connect WebSocket' });
                setLoading('virtualChannel', false);
                addToHistory('virtualChannel', 'error', 'Failed to connect to WebSocket server');
                return;
            }
        }

        try {
            // Default to current wallet address as participantA if available
            const participantA = nitroliteSnap.stateSigner.address || '';

            // Parse the amount from input
            const amountA = parseInt(virtualChannelAmount, 10);

            if (isNaN(amountA)) {
                throw new Error('Invalid amount entered');
            }

            // Create the virtual channel
            const createVirtualChannelParams = {
                participantA,
                participantB: selectedParticipant, // Use the selected participant
                token_address: APP_CONFIG.TOKENS[activeChain?.id] || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                amountA,
                amountB: 0,
                adjudicator: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9',
                challenge: 1,
                nonce: Date.now(),
            };

            const response = await sendRequest('CreateVirtualChannel', JSON.stringify([createVirtualChannelParams]));

            console.log('Virtual channel created:', response);

            setResponse('virtualChannel', response);

            // Store channel ID for later use
            if (response && response.channelId) {
                setVirtualChannelId(response.channelId);
                localStorage.setItem('virtual_channel_id', response.channelId);
                addToHistory(
                    'virtualChannel',
                    'success',
                    `Virtual channel created with ID: ${response.channelId.substring(0, 10)}...`,
                    {
                        channelId: response.channelId,
                        amount: virtualChannelAmount,
                    },
                );
            } else {
                addToHistory('virtualChannel', 'success', 'Virtual channel response received, but no channel ID found');
            }

            // Update allocations for closing with the same amount
            setAllocations({
                participantA: '0',
                participantB: virtualChannelAmount,
            });
        } catch (error) {
            console.error('Error creating virtual channel:', error);
            setResponse('virtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
            addToHistory(
                'virtualChannel',
                'error',
                `Failed to create virtual channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('virtualChannel', false);
        }
    };

    // Close virtual channel handler
    const handleCloseVirtualChannel = async () => {
        const participantA = nitroliteSnap.stateSigner.address || '';

        console.log('Closing virtual channel...');

        setLoading('closeVirtualChannel', true);
        setResponse('closeVirtualChannel', null);
        addToHistory('closeVirtualChannel', 'pending', 'Closing virtual channel...');

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setResponse('closeVirtualChannel', { error: 'Failed to connect WebSocket' });
                setLoading('closeVirtualChannel', false);
                addToHistory('closeVirtualChannel', 'error', 'Failed to connect to WebSocket server');
                return;
            }
        }

        try {
            // Get channel ID from state or localStorage
            let channelId = virtualChannelId;

            if (!channelId) {
                channelId = localStorage.getItem('virtual_channel_id') || '';
                if (!channelId) {
                    throw new Error('No virtual channel ID found. Please create a virtual channel first.');
                }
            }

            // Use the allocations from state
            const closeVirtualChannelParams = {
                allocations: [
                    {
                        amount: allocations.participantA,
                        participant: participantA || '',
                    },
                    {
                        amount: allocations.participantB,
                        participant: selectedParticipant || '0xFecaD186B71b5dC129420927534c97027782cD76',
                    },
                ],
                channelId: channelId,
                token_address: APP_CONFIG.TOKENS[activeChain?.id] || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            };

            const response = await sendRequest('CloseVirtualChannel', JSON.stringify([closeVirtualChannelParams]));

            console.log('Virtual channel closed:', response);
            setResponse('closeVirtualChannel', response);

            addToHistory('closeVirtualChannel', 'success', `Virtual channel ${channelId.substring(0, 10)}... closed`, {
                allocations: {
                    participantA: allocations.participantA,
                    participantB: allocations.participantB,
                },
            });

            // Clear channel ID after closing
            if (response && response.success) {
                setVirtualChannelId('');
                localStorage.removeItem('virtual_channel_id');
            }
        } catch (error) {
            console.error('Error closing virtual channel:', error);
            setResponse('closeVirtualChannel', { error: error instanceof Error ? error.message : 'Unknown error' });
            addToHistory(
                'closeVirtualChannel',
                'error',
                `Failed to close virtual channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        } finally {
            setLoading('closeVirtualChannel', false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            {/* Wallet Connection Section */}
            <WalletConnectionSection isPrivyEnabled={isPrivyEnabled} />

            {walletSnap.connected && (
                <>
                    {/* Status Dashboard */}
                    <StatusDashboardSection
                        accountInfo={accountInfo}
                        currentDeposit={currentDeposit}
                        currentLocked={currentLocked}
                        virtualChannelId={virtualChannelId}
                        allocations={allocations}
                        wsStatus={{ isConnected, status }}
                    />

                    {/* Deposit Section */}
                    <DepositSection currentDeposit={currentDeposit} onOpenDeposit={handleOpenDeposit} />

                    {/* Channel Creation Section */}
                    <ChannelCreateSection
                        currentDeposit={currentDeposit}
                        currentLocked={currentLocked}
                        accountInfo={accountInfo}
                        onCreateChannel={onCreateChannel}
                        isLoading={loadingStates.createChannel || false}
                        response={responses.createChannel}
                    />

                    {/* List Participants Section */}
                    <ListParticipantsSection
                        participants={participants}
                        selectedParticipant={selectedParticipant}
                        onSelectParticipant={setSelectedParticipant}
                        onGetParticipants={handleGetListOfParticipants}
                        isLoading={loadingStates.participants || false}
                        response={responses.participants}
                        isCurrentUser={isCurrentUser}
                    />

                    {/* Open Virtual Channel Section */}
                    <VirtualChannelSection
                        selectedParticipant={selectedParticipant}
                        virtualChannelAmount={virtualChannelAmount}
                        onChangeVirtualChannelAmount={setVirtualChannelAmount}
                        onOpenVirtualChannel={handleOpenVirtualChannel}
                        isLoading={loadingStates.virtualChannel || false}
                        response={responses.virtualChannel}
                    />

                    {/* Close Virtual Channel Section */}
                    <CloseVirtualChannelSection
                        allocations={allocations}
                        setAllocations={setAllocations}
                        virtualChannelId={virtualChannelId}
                        onCloseVirtualChannel={handleCloseVirtualChannel}
                        isLoading={loadingStates.closeVirtualChannel || false}
                        response={responses.closeVirtualChannel}
                    />

                    {/* Challenge Channel Section */}
                    <ChallengeChannelSection
                        onChallenge={handleChallenge}
                        isLoading={loadingStates.challenge || false}
                        response={responses.challenge}
                    />

                    {/* Close Channel Section */}
                    <CloseChannelSection
                        accountInfo={accountInfo}
                        onClose={handleClose}
                        isLoading={loadingStates.closeChannel || false}
                        response={responses.closeChannel}
                    />

                    {/* Withdraw Section */}
                    <WithdrawSection
                        currentDeposit={currentDeposit}
                        onWithdraw={handleWithdrawal}
                        isLoading={loadingStates.withdrawal || false}
                        response={responses.withdrawal}
                    />

                    {/* Transaction History */}
                    <TransactionHistorySection transactions={transactionHistory} responses={responses} />
                </>
            )}

            {/* Deposit Modal */}
            <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
        </div>
    );
}
