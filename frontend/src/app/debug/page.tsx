'use client';

import Privy from '@/providers/privy';
import { NitroliteClientWrapper } from '@/providers/NitroliteClientWrapper';
import { useSnapshot } from 'valtio';
import { NitroliteStore, SettingsStore, WalletStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import APP_CONFIG from '@/config/app';
import { AccountInfo } from '@/store/types';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useChannelClose } from '@/hooks/channel/useChannelClose';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
import { Address, Hex } from 'viem';
import { useWebSocket } from '@/hooks/websocket/useWebSocket';
import Deposit from '@/components/wallet/clearnet/Deposit';
import AppStore from '@/store/AppStore';

export default function Debug() {
    return (
        <Privy>
            <div className="min-h-screen flex flex-col">
                <NitroliteClientWrapper>
                    <main className="min-h-screen bg-gray-50 px-4 pt-4 flex flex-col pb-40">
                        <h1 className="text-3xl font-bold mb-6 text-center">Payment Channel Debug Console</h1>
                        <DebugInterface />
                    </main>
                </NitroliteClientWrapper>
            </div>
        </Privy>
    );
}

// Main debug interface component
function DebugInterface() {
    const appSnap = useSnapshot(AppStore.state);

    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    const walletSnap = useSnapshot(WalletStore.state);
    const activeChain = useSnapshot(SettingsStore.state).activeChain;
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';
    const nitroliteSnap = useSnapshot(NitroliteStore.state);
    const { handleCloseChannel } = useChannelClose();
    const { handleCreateChannel } = useChannelCreate();

    const wsUrl = APP_CONFIG.WEBSOCKET.URL;

    // Expanded WebSocket hook usage with more properties
    const { sendRequest, connect, generateKeys, isConnected, hasKeys, status } = useWebSocket(wsUrl);

    // State for responses from WebSocket
    const [wsResponses, setWsResponses] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

    // State for virtual channel
    const [virtualChannelId, setVirtualChannelId] = useState<string>('');
    const [virtualChannelAmount, setVirtualChannelAmount] = useState<string>('100');

    // State for participants
    const [participants, setParticipants] = useState<any[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<string>('');

    // State for closing virtual channel allocations
    const [allocations, setAllocations] = useState({
        participantA: '0',
        participantB: '200',
    });

    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    });

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
    ]);

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

    const handleWithdrawal = async () => {
        if (!walletSnap.connected) return;

        setIsLoading((prev) => ({ ...prev, withdrawal: true }));
        addToHistory('withdrawal', 'pending', 'Processing withdrawal...');

        try {
            await nitroliteSnap.client.withdraw(APP_CONFIG.TOKENS[activeChain.id], accountInfo.deposited);
            console.log('Withdrawal successful');

            // Update response
            setWsResponses((prev) => ({
                ...prev,
                withdrawal: { success: true, message: 'Withdrawal successful' },
            }));

            addToHistory('withdrawal', 'success', `Successfully withdrew ${currentDeposit} tokens`, {
                amount: currentDeposit,
                token: APP_CONFIG.TOKENS[activeChain.id]
            });

            // Refetch account info after withdrawal
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error withdrawing:', error);
            setWsResponses((prev) => ({
                ...prev,
                withdrawal: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
            
            addToHistory('withdrawal', 'error', `Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, withdrawal: false }));
        }
    };

    const handleClose = async () => {
        if (!walletSnap.connected) return;

        setIsLoading((prev) => ({ ...prev, closeChannel: true }));
        addToHistory('closeChannel', 'pending', 'Closing payment channel...');

        try {
            try {
                // The hook will handle all the state creation and signing
                await handleCloseChannel();

                console.log('Channel closed successfully');

                setWsResponses((prev) => ({
                    ...prev,
                    closeChannel: { success: true, message: 'Channel closed successfully' },
                }));
                
                addToHistory('closeChannel', 'success', 'Payment channel closed successfully');
            } catch (channelError) {
                console.error('Failed to close channel:', channelError);
                setWsResponses((prev) => ({
                    ...prev,
                    closeChannel: {
                        error: channelError instanceof Error ? channelError.message : 'Unknown error',
                    },
                }));
                
                addToHistory('closeChannel', 'error', `Failed to close channel: ${channelError instanceof Error ? channelError.message : 'Unknown error'}`);
            }

            // Refetch account info after closing channels
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error closing channels:', error);
            setWsResponses((prev) => ({
                ...prev,
                closeChannel: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
        } finally {
            setIsLoading((prev) => ({ ...prev, closeChannel: false }));
        }
    };

    const onCreateChannel = async () => {
        if (!walletSnap.connected) return;

        setIsLoading((prev) => ({ ...prev, createChannel: true }));
        addToHistory('createChannel', 'pending', 'Creating payment channel...');

        try {
            const tokenAddress = APP_CONFIG.TOKENS[activeChain.id] as Address;
            const amount = currentDeposit;

            console.log('Creating channel with token:', tokenAddress, 'amount:', amount);

            // Create and deposit in one go
            const channelId = await handleCreateChannel(tokenAddress, amount);

            console.log('Channel created successfully with ID:', channelId);

            setWsResponses((prev) => ({
                ...prev,
                createChannel: {
                    success: true,
                    channelId: channelId,
                    message: 'Channel created successfully',
                },
            }));
            
            addToHistory('createChannel', 'success', `Channel created with ID: ${channelId.substring(0, 10)}...`, {
                channelId,
                amount,
                tokenAddress
            });

            // Refresh account info
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error creating channel:', error);
            setWsResponses((prev) => ({
                ...prev,
                createChannel: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
            
            addToHistory('createChannel', 'error', `Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, createChannel: false }));
        }
    };

    const handleChallenge = async () => {
        if (!walletSnap.connected || !nitroliteSnap.client) return;

        setIsLoading((prev) => ({ ...prev, challenge: true }));

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

            setWsResponses((prev) => ({
                ...prev,
                challenge: {
                    success: true,
                    channelId: channelId,
                    message: 'Channel challenged successfully',
                },
            }));

            // Refresh account info after challenging
            await fetchAccountInfo();
        } catch (error) {
            console.error('Error challenging channel:', error);
            setWsResponses((prev) => ({
                ...prev,
                challenge: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
        } finally {
            setIsLoading((prev) => ({ ...prev, challenge: false }));
        }
    };

    const handleGetListOfParticipants = async () => {
        console.log('Fetching list of participants...');
        console.log('WebSocket connected:', isConnected);

        setIsLoading((prev) => ({ ...prev, participants: true }));
        setWsResponses((prev) => ({ ...prev, participants: null }));

        if (!isConnected) {
            console.log('WebSocket not connected, attempting to connect...');
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponses((prev) => ({
                    ...prev,
                    participants: { error: 'Failed to connect WebSocket' },
                }));
                setIsLoading((prev) => ({ ...prev, participants: false }));
                return;
            }
        }

        const message = {
            token_address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        };

        try {
            const response = await sendRequest('ListOpenParticipants', JSON.stringify([message]));

            console.log('Participants response:', response);

            // Store the full response for debugging
            setWsResponses((prev) => ({ ...prev, participants: response }));

            // Process the participants list - handling the nested array structure
            if (response && Array.isArray(response)) {
                // Handle the case where response is the full websocket response with res and sig
                if (response.res && Array.isArray(response.res[2]) && response.res[2][0]) {
                    setParticipants(response.res[2][0]);
                    if (response.res[2][0].length > 0) {
                        setSelectedParticipant(response.res[2][0][0].address);
                    }
                }
                // Handle the case where response is just the array of participants
                else if (response[0] && Array.isArray(response[0])) {
                    setParticipants(response[0]);
                    if (response[0].length > 0) {
                        setSelectedParticipant(response[0][0].address);
                    }
                }
                // Direct array of participants
                else if (response.length > 0 && response[0].address) {
                    setParticipants(response);
                    setSelectedParticipant(response[0].address);
                }
            }
        } catch (error) {
            console.error('Error getting participants:', error);
            setWsResponses((prev) => ({
                ...prev,
                participants: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
        } finally {
            setIsLoading((prev) => ({ ...prev, participants: false }));
        }
    };

    const handleOpenVirtualChannel = async () => {
        console.log('Opening virtual channel...');

        if (!selectedParticipant) {
            setWsResponses((prev) => ({
                ...prev,
                virtualChannel: { error: 'Please select a participant first' },
            }));
            return;
        }

        setIsLoading((prev) => ({ ...prev, virtualChannel: true }));
        setWsResponses((prev) => ({ ...prev, virtualChannel: null }));

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponses((prev) => ({
                    ...prev,
                    virtualChannel: { error: 'Failed to connect WebSocket' },
                }));
                setIsLoading((prev) => ({ ...prev, virtualChannel: false }));
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

            setWsResponses((prev) => ({ ...prev, virtualChannel: response }));

            // Store channel ID for later use
            if (response && response.channelId) {
                setVirtualChannelId(response.channelId);
                localStorage.setItem('virtual_channel_id', response.channelId);
            }

            // Update allocations for closing with the same amount
            setAllocations({
                participantA: '0',
                participantB: virtualChannelAmount,
            });
        } catch (error) {
            console.error('Error creating virtual channel:', error);
            setWsResponses((prev) => ({
                ...prev,
                virtualChannel: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
        } finally {
            setIsLoading((prev) => ({ ...prev, virtualChannel: false }));
        }
    };

    const handleCloseVirtualChannel = async () => {
        const participantA = nitroliteSnap.stateSigner.address || '';

        console.log('Closing virtual channel...');

        setIsLoading((prev) => ({ ...prev, closeVirtualChannel: true }));
        setWsResponses((prev) => ({ ...prev, closeVirtualChannel: null }));

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponses((prev) => ({
                    ...prev,
                    closeVirtualChannel: { error: 'Failed to connect WebSocket' },
                }));
                setIsLoading((prev) => ({ ...prev, closeVirtualChannel: false }));
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
            setWsResponses((prev) => ({ ...prev, closeVirtualChannel: response }));

            // Clear channel ID after closing
            if (response && response.success) {
                setVirtualChannelId('');
                localStorage.removeItem('virtual_channel_id');
            }
        } catch (error) {
            console.error('Error closing virtual channel:', error);
            setWsResponses((prev) => ({
                ...prev,
                closeVirtualChannel: { error: error instanceof Error ? error.message : 'Unknown error' },
            }));
        } finally {
            setIsLoading((prev) => ({ ...prev, closeVirtualChannel: false }));
        }
    };

    // Helper to display responses
    const renderResponse = (sectionKey: string) => {
        const response = wsResponses[sectionKey];
        const loading = isLoading[sectionKey];

        if (loading) {
            return (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
                </div>
            );
        }

        if (!response) return null;

        if (response.error) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                    <p className="text-red-600">Error: {response.error}</p>
                </div>
            );
        }

        return (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-3">
                <pre className="whitespace-pre-wrap break-words text-sm overflow-x-auto max-h-60">
                    {JSON.stringify(response, null, 2)}
                </pre>
            </div>
        );
    };

    // Helper to display raw responses
    const renderRawResponse = (sectionKey: string) => {
        const response = wsResponses[sectionKey];

        if (!response) return null;

        return (
            <div className="mt-4">
                <details className="cursor-pointer">
                    <summary className="text-sm text-gray-500">Raw Response</summary>
                    <div className="bg-gray-50 p-3 mt-2 rounded-md overflow-x-auto text-xs">
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(response, null, 2)}</pre>
                    </div>
                </details>
            </div>
        );
    };

    // Check if the address belongs to the current user
    const isCurrentUser = (address: string) => {
        return nitroliteSnap.stateSigner && nitroliteSnap.stateSigner.address === address;
    };

    // Add a new state for transaction history
    const [transactionHistory, setTransactionHistory] = useState<Array<{
        id: string;
        type: string;
        timestamp: number;
        status: 'success' | 'error' | 'pending';
        message: string;
        details?: any;
    }>>([]);

    // Function to add a transaction to history
    const addToHistory = useCallback((type: string, status: 'success' | 'error' | 'pending', message: string, details?: any) => {
        setTransactionHistory(prev => [
            {
                id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type,
                timestamp: Date.now(),
                status,
                message,
                details
            },
            ...prev
        ]);
    }, []);

    return (
        <div className="max-w-4xl mx-auto w-full">
            {/* Section 1: Wallet Connection */}
            <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b">1. Connect Wallet</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="mb-2">
                            Status:{' '}
                            <span
                                className={`font-semibold ${walletSnap.connected ? 'text-green-600' : 'text-red-600'}`}>
                                {walletSnap.connected ? 'Connected' : 'Disconnected'}
                            </span>
                        </p>
                        {walletSnap.connected && (
                            <p className="text-sm text-gray-600">Address: {walletSnap.walletAddress}</p>
                        )}
                    </div>
                    <div>{isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}</div>
                </div>
            </section>

            {walletSnap.connected && (
                <>
                    {/* Enhanced Status Dashboard */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4">Status Dashboard</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Channel Status */}
                            <div className="border rounded-md p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-700">Channel Status</h3>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                            accountInfo.channelCount > 0
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {accountInfo.channelCount > 0 ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="text-gray-500">Open Channels:</span> {accountInfo.channelCount}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Locked Amount:</span> ${currentLocked}
                                    </p>
                                    {accountInfo.channelCount > 0 && (
                                        <div className="mt-2">
                                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Virtual Channel Status */}
                            <div className="border rounded-md p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-700">Virtual Channel</h3>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                            virtualChannelId
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {virtualChannelId ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    {virtualChannelId ? (
                                        <>
                                            <p className="truncate">
                                                <span className="text-gray-500">ID:</span>{' '}
                                                {virtualChannelId.substring(0, 10)}...
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Allocation:</span> You:{' '}
                                                {allocations.participantA} | Partner: {allocations.participantB}
                                            </p>
                                            <div className="mt-2">
                                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{
                                                            width: `${(Number(allocations.participantB) / (Number(allocations.participantA) + Number(allocations.participantB) || 1)) * 100}%`,
                                                        }}></div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-500 italic">No active virtual channel</p>
                                    )}
                                </div>
                            </div>

                            {/* Network Status */}
                            <div className="border rounded-md p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-700">Network Status</h3>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs ${
                                            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {isConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <p>
                                        <span className="text-gray-500">WebSocket:</span> {status}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Chain:</span> {activeChain?.name || 'Not set'}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Network ID:</span> {activeChain?.id || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Info */}
                        <div className="mt-4 border-t pt-4">
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                                <div className="flex items-center">
                                    <div
                                        className={`w-2 h-2 rounded-full mr-1.5 ${walletSnap.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span>
                                        Wallet:{' '}
                                        {walletSnap.connected
                                            ? `${walletSnap.walletAddress?.substring(0, 6)}...${walletSnap.walletAddress?.substring(walletSnap.walletAddress.length - 4)}`
                                            : 'Disconnected'}
                                    </span>
                                </div>

                                <div className="flex items-center">
                                    <div
                                        className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span>WebSocket: {wsUrl.substring(0, 20)}...</span>
                                </div>

                                <div className="flex items-center">
                                    <div
                                        className={`w-2 h-2 rounded-full mr-1.5 ${nitroliteSnap.client ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span>
                                        Nitrolite Client: {nitroliteSnap.client ? 'Initialized' : 'Not Initialized'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Deposit */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">2. Deposit Balance</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="mb-2">
                                    Available Balance:{' '}
                                    <span className="font-semibold text-green-600">${currentDeposit}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Use the deposit button to add funds to your account.
                                </p>
                            </div>
                            <ActionButton onClick={handleOpenDeposit}>Deposit</ActionButton>
                        </div>
                    </section>

                    {/* Section 3: Channel Creation */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">3. Create Channel</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="mb-2">
                                    Locked Balance:{' '}
                                    <span className="font-semibold text-blue-600">${currentLocked}</span>
                                </p>
                                <p className="mb-2">
                                    Open Channels: <span className="font-semibold">{accountInfo.channelCount}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Creating a channel will lock your available balance.
                                </p>
                            </div>
                            <div className="flex items-center justify-end">
                                <ActionButton
                                    onClick={onCreateChannel}
                                    disabled={isLoading.createChannel || Number(currentDeposit) <= 0}>
                                    Create Channel
                                </ActionButton>
                            </div>
                        </div>
                        {renderResponse('createChannel')}
                        {renderRawResponse('createChannel')}
                    </section>

                    {/* Section 4: List Participants */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">4. List Participants</h2>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-600">Fetch available participants for virtual channels.</p>
                            <div className="flex items-center space-x-2">
                                {participants.length > 0 && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {
                                            participants.filter(
                                                (p, i, self) => i === self.findIndex((t) => t.address === p.address),
                                            ).length
                                        }{' '}
                                        unique participants
                                    </span>
                                )}
                                <ActionButton onClick={handleGetListOfParticipants} disabled={isLoading.participants}>
                                    Get Participants
                                </ActionButton>
                            </div>
                        </div>

                        {isLoading.participants ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
                            </div>
                        ) : participants.length > 0 ? (
                            <div className="mt-4">
                                <h3 className="font-medium mb-2">Select a participant:</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Address
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Balance
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Select
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {/* Get unique participants by address to avoid duplicates */}
                                            {participants
                                                .filter(
                                                    (participant, index, self) =>
                                                        index ===
                                                        self.findIndex((p) => p.address === participant.address),
                                                )
                                                .map((participant, index) => (
                                                    <tr
                                                        key={index}
                                                        className={
                                                            isCurrentUser(participant.address)
                                                                ? 'bg-blue-50'
                                                                : selectedParticipant === participant.address
                                                                  ? 'bg-green-50'
                                                                  : ''
                                                        }>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                            <div className="flex items-center">
                                                                <span
                                                                    className={
                                                                        isCurrentUser(participant.address)
                                                                            ? 'font-semibold'
                                                                            : ''
                                                                    }>
                                                                    {participant.address}
                                                                    {isCurrentUser(participant.address) && (
                                                                        <span className="ml-1 text-blue-600">
                                                                            (You)
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                            {participant.amount
                                                                ? (participant.amount / 1000).toFixed(2)
                                                                : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                            <input
                                                                type="radio"
                                                                name="participant"
                                                                onChange={() =>
                                                                    setSelectedParticipant(participant.address)
                                                                }
                                                                checked={selectedParticipant === participant.address}
                                                                disabled={isCurrentUser(participant.address)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                {selectedParticipant && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                                        <p className="font-medium text-blue-800">Selected Participant</p>
                                        <p className="text-sm text-blue-700 font-mono mt-1">{selectedParticipant}</p>
                                    </div>
                                )}
                            </div>
                        ) : wsResponses.participants && !wsResponses.participants.error ? (
                            <div className="p-4 bg-yellow-50 rounded-md text-yellow-700 text-center">
                                No participants found
                            </div>
                        ) : null}

                        {/* Show raw response for debugging */}
                        {renderRawResponse('participants')}
                    </section>

                    {/* Section 5: Open Virtual Channel */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">5. Open Virtual Channel</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount to lock in virtual channel:
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <input
                                    type="text"
                                    name="amount"
                                    id="amount"
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                    placeholder="0.00"
                                    value={virtualChannelAmount}
                                    onChange={(e) => setVirtualChannelAmount(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Selected Participant: </p>
                                    <p
                                        className={`text-xs font-mono ${selectedParticipant ? 'text-green-600' : 'text-red-600'}`}>
                                        {selectedParticipant || 'No participant selected'}
                                    </p>
                                </div>
                                <ActionButton
                                    onClick={handleOpenVirtualChannel}
                                    disabled={isLoading.virtualChannel || !selectedParticipant}>
                                    Open Virtual Channel
                                </ActionButton>
                            </div>
                        </div>

                        {renderResponse('virtualChannel')}
                        {renderRawResponse('virtualChannel')}
                    </section>

                    {/* Section 6: Close Virtual Channel */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">6. Close Virtual Channel</h2>
                        <div className="mb-4">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your allocation:
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">$</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                            value={allocations.participantA}
                                            onChange={(e) =>
                                                setAllocations((prev) => ({ ...prev, participantA: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Partner allocation:
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">$</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                            value={allocations.participantB}
                                            onChange={(e) =>
                                                setAllocations((prev) => ({ ...prev, participantB: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Adjust allocations to finalize the virtual payment before closing the channel.
                            </p>

                            <div className="flex items-center justify-between">
                                <p className="text-xs font-mono text-gray-600">
                                    {virtualChannelId
                                        ? `Channel ID: ${virtualChannelId.substring(0, 10)}...`
                                        : 'No active virtual channel'}
                                </p>
                                <ActionButton
                                    onClick={handleCloseVirtualChannel}
                                    disabled={isLoading.closeVirtualChannel || !virtualChannelId}>
                                    Close Virtual Channel
                                </ActionButton>
                            </div>
                        </div>

                        {renderResponse('closeVirtualChannel')}
                        {renderRawResponse('closeVirtualChannel')}
                    </section>

                    {/* Section 7: Challenge */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">7. Challenge Channel</h2>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Challenge a channel if you believe the other party is not cooperating. This uses the
                                state stored in your local storage.
                            </p>

                            <div className="flex items-center justify-end">
                                <ActionButton onClick={handleChallenge} disabled={isLoading.challenge}>
                                    Challenge Channel
                                </ActionButton>
                            </div>
                        </div>

                        {renderResponse('challenge')}
                        {renderRawResponse('challenge')}
                    </section>

                    {/* Section 8: Close Channel */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">8. Close Channel</h2>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Close your payment channel and settle the final balance on-chain.
                            </p>

                            <div className="flex items-center justify-end">
                                <ActionButton
                                    onClick={handleClose}
                                    disabled={isLoading.closeChannel || accountInfo.channelCount === 0}>
                                    Close Channel
                                </ActionButton>
                            </div>
                        </div>

                        {renderResponse('closeChannel')}
                        {renderRawResponse('closeChannel')}
                    </section>

                    {/* Section 9: Withdraw */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">9. Withdraw Funds</h2>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="mb-2">
                                    Available to withdraw:{' '}
                                    <span className="font-semibold text-green-600">${currentDeposit}</span>
                                </p>
                                <p className="text-sm text-gray-600">Withdraw available funds back to your wallet.</p>
                            </div>
                            <ActionButton
                                onClick={handleWithdrawal}
                                disabled={isLoading.withdrawal || Number(currentDeposit) <= 0}>
                                Withdraw All
                            </ActionButton>
                        </div>

                        {renderResponse('withdrawal')}
                        {renderRawResponse('withdrawal')}
                    </section>

                    {/* Updated Transaction History section */}
                    <section className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Transaction History</h2>

                        <div className="space-y-2">
                            {transactionHistory.length > 0 ? (
                                transactionHistory.map((tx) => (
                                    <div key={tx.id} className="p-3 border rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium capitalize">{tx.type}</span>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                    tx.status === 'error'
                                                        ? 'bg-red-100 text-red-800'
                                                        : tx.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-2">{tx.message}</div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>{new Date(tx.timestamp).toLocaleString()}</span>
                                            {tx.details && (
                                                <button
                                                    onClick={() => console.log('Transaction details:', tx.details)}
                                                    className="text-blue-500 hover:text-blue-700">
                                                    Details
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-center py-4">No transactions yet.</p>
                            )}
                        </div>
                        
                        {/* Add a details section for response data */}
                        {Object.keys(wsResponses).length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <details className="cursor-pointer">
                                    <summary className="text-sm text-gray-500 font-medium mb-2">Raw Response Data</summary>
                                    <div className="overflow-x-auto max-h-60 text-xs">
                                        {Object.entries(wsResponses).map(([key, value], index) => 
                                            value ? (
                                                <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                                                    <div className="font-medium mb-1 capitalize">{key}:</div>
                                                    <pre className="whitespace-pre-wrap break-words">
                                                        {JSON.stringify(value, null, 2)}
                                                    </pre>
                                                </div>
                                            ) : null
                                        )}
                                    </div>
                                </details>
                            </div>
                        )}
                    </section>
                </>
            )}
            <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
        </div>
    );
}
