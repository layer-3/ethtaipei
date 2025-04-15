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
import { Address, Hex } from 'viem';
import { useWebSocket } from '@/hooks/websocket/useWebSocket';

interface MainHeaderProps {
    onOpenDeposit: () => void;
    onOpenCloseChannel: () => void;
}

export function MainHeader({ onOpenDeposit, onOpenCloseChannel }: MainHeaderProps) {
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
    const [wsResponse, setWsResponse] = useState<any>(null);
    const [showResponse, setShowResponse] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [responseTitle, setResponseTitle] = useState<string>('Response');

    // State for virtual channel
    const [virtualChannelId, setVirtualChannelId] = useState<string>('');

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

        console.log('Current deposit:', accountInfo);

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

        try {
            await nitroliteSnap.client.withdraw(APP_CONFIG.TOKENS[activeChain.id], accountInfo.deposited);
            console.log('Withdrawal successful');

            // Refetch account info after withdrawal
            await fetchAccountInfo();
        } catch (error) {
            alert('Withdrawal failed: ' + error.message);
            console.error('Error withdrawing:', error);
        }
    };

    // const handleClose = async () => {
    //     if (!walletSnap.connected) return;

    //     try {
    //         try {
    //             // The hook will handle all the state creation and signing
    //             await handleCloseChannel(state);

    //             console.log('Channel closed successfully');
    //         } catch (channelError) {
    //             alert('Failed to close channel: ' + channelError.message);
    //             console.error('Failed to close channel:', channelError);
    //         }

    //         console.log('All channels processed');

    //         // Refetch account info after closing channels
    //         await fetchAccountInfo();
    //     } catch (error) {
    //         console.error('Error closing channels:', error);
    //     }
    // };

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
        if (!walletSnap.connected || !nitroliteSnap.client) return;

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
            await nitroliteSnap.client.challengeChannel(channelId, state);

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

    const handleGetListOfParticipants = async () => {
        console.log('Fetching list of participants...');
        console.log('WebSocket connected:', isConnected);

        // Set response title
        setResponseTitle('Participants Response');

        // Reset previous response and show loading
        setWsResponse(null);
        setIsLoading(true);
        setShowResponse(true);

        if (!isConnected) {
            console.log('WebSocket not connected, attempting to connect...');
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponse({ error: 'Failed to connect WebSocket' });
                setIsLoading(false);
                return;
            }
        }

        const message = {
            token_address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        };

        try {
            const response = await sendRequest('ListOpenParticipants', JSON.stringify([message]));

            console.log('Participants response:', response);
            setWsResponse(response);
        } catch (error) {
            console.error('Error getting participants:', error);
            setWsResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenVirtualChannel = async () => {
        console.log('Opening virtual channel...');
        setResponseTitle('Open Virtual Channel');
        setWsResponse(null);
        setIsLoading(true);
        setShowResponse(true);

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponse({ error: 'Failed to connect WebSocket' });
                setIsLoading(false);
                return;
            }
        }

        try {
            // Default to current wallet address as participantA if available
            const participantA = nitroliteSnap.stateSigner.address || '';

            // Sample data based on the example in the comments
            const createVirtualChannelParams = {
                participantA,
                participantB: '0xFecaD186B71b5dC129420927534c97027782cD76', // gmail.com account
                token_address: APP_CONFIG.TOKENS[activeChain?.id] || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                amountA: 200,
                amountB: 0,
                adjudicator: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9',
                challenge: 1,
                nonce: Date.now(),
            };

            const response = await sendRequest('CreateVirtualChannel', JSON.stringify([createVirtualChannelParams]));

            console.log('Virtual channel created:', response);

            // Store channel ID for later use
            // @ts-ignore
            if (response && response.channelId) {
                // @ts-ignore
                setVirtualChannelId(response.channelId);
                // @ts-ignore
                localStorage.setItem('virtual_channel_id', response.channelId);
            }

            setWsResponse(response);
        } catch (error) {
            console.error('Error creating virtual channel:', error);
            setWsResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseVirtualChannel = async () => {
        const participantA = nitroliteSnap.stateSigner.address || '';

        console.log('Closing virtual channel...');
        setResponseTitle('Close Virtual Channel');
        setWsResponse(null);
        setIsLoading(true);
        setShowResponse(true);

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponse({ error: 'Failed to connect WebSocket' });
                setIsLoading(false);
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

            // Sample data based on the example in the comments
            const closeVirtualChannelParams = {
                allocations: [
                    {
                        amount: '0',
                        participant: participantA || '',
                    },
                    {
                        amount: '200',
                        participant: '0xFecaD186B71b5dC129420927534c97027782cD76', // gmail.com
                    },
                ],
                channelId: channelId,
                token_address: APP_CONFIG.TOKENS[activeChain?.id] || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            };

            const response = await sendRequest('CloseVirtualChannel', JSON.stringify([closeVirtualChannelParams]));

            console.log('Virtual channel closed:', response);
            setWsResponse(response);

            // Clear channel ID after closing
            // @ts-ignore
            if (response && response.success) {
                setVirtualChannelId('');
                localStorage.removeItem('virtual_channel_id');
            }
        } catch (error) {
            console.error('Error closing virtual channel:', error);
            setWsResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDirectChannel = async () => {
        console.log('Closing direct channel...');
        setResponseTitle('Close Direct Channel');
        setWsResponse(null);
        setIsLoading(true);
        setShowResponse(true);

        if (!isConnected) {
            try {
                await connect();
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                setWsResponse({ error: 'Failed to connect WebSocket' });
                setIsLoading(false);
                return;
            }
        }

        try {
            // Get channel ID from state or localStorage
            let channelId = '';

            if (!channelId) {
                channelId = localStorage.getItem('nitrolite_channel_id') || '';
                if (!channelId) {
                    throw new Error('No virtual channel ID found. Please create a virtual channel first.');
                }
            }

            // Sample data based on the example in the comments
            const closeVirtualChannelParams = {
                channelId: channelId,
                fundsDestination: walletSnap.walletAddress,
            };

            const response = await sendRequest('CloseDirectChannel', JSON.stringify([closeVirtualChannelParams]));

            console.log('Direct channel closed:', response);
            setWsResponse(response);

            // Clear channel ID after closing
            // @ts-ignore
            if (response && response.success) {
                setVirtualChannelId('');
                // localStorage.removeItem('nitrolite_channel_id');
            }
        } catch (error) {
            console.error('Error closing direct channel:', error);
            setWsResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Close response modal
    const handleCloseResponse = () => {
        setShowResponse(false);
    };

    return (
        <>
            <header className="flex gap-4 items-center justify-between flex-wrap">
                <div className="flex gap-4 items-center">
                    {walletSnap.connected && (
                        <>
                            <span>Channel: $ {currentLocked}</span>
                            <span>Available: $ {currentDeposit}</span>
                            <span className="text-xs">WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</span>
                            <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
                            <ActionButton onClick={onCreateChannel}>Create Channel</ActionButton>
                            <ActionButton onClick={handleWithdrawal}>Withdraw</ActionButton>
                            <ActionButton onClick={handleChallenge}>Challenge</ActionButton>
                            <ActionButton onClick={handleDirectChannel}>Close Direct Channel</ActionButton>
                            {/* <ActionButton onClick={handleClose}>Close Chain Channel</ActionButton> */}
                            <ActionButton onClick={handleGetListOfParticipants}>Get Participants</ActionButton>
                            <ActionButton onClick={handleOpenVirtualChannel}>Open Virtual Channel</ActionButton>
                            <ActionButton onClick={handleCloseVirtualChannel}>Close Virtual Channel</ActionButton>
                        </>
                    )}
                </div>
                <div className={walletSnap.connected ? '' : 'ml-auto'}>
                    {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
                </div>
            </header>

            {/* Response Modal */}
            {showResponse && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">{responseTitle}</h3>
                            <button onClick={handleCloseResponse} className="text-gray-500 hover:text-gray-700">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="bg-gray-100 p-4 rounded overflow-x-auto">
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
                                </div>
                            ) : wsResponse ? (
                                wsResponse.error ? (
                                    <div className="text-red-500">Error: {wsResponse.error}</div>
                                ) : (
                                    <pre className="whitespace-pre-wrap break-words text-sm">
                                        {JSON.stringify(wsResponse, null, 2)}
                                    </pre>
                                )
                            ) : (
                                <div className="text-gray-500">No data available</div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleCloseResponse}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
