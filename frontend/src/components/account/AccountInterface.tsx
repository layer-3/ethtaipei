'use client';

import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import APP_CONFIG from '@/config/app';
import { useChannelClose } from '@/hooks/channel';
import { useGetAccountInfo } from '@/hooks/channel/useGetAccountInfo';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';
import { useResize } from '@/hooks/channel/useResize';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { useWebSocket } from '@/hooks/websocket';
import { AppStore, NitroliteStore, SettingsStore, WalletStore } from '@/store';
import AssetsStore, { fetchAssets } from '@/store/AssetsStore';
import { WalletSigner } from '@/websocket';
import { Allocation, createCloseChannelMessage, createResizeChannelMessage } from '@erc7824/nitrolite';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Address, Hex } from 'viem';
import { ActionButton } from '../ui/ActionButton';
import Deposit from '../wallet/clearnet/Deposit';
import { AddressItem } from './AccountAddressItem';

export function AccountInterface() {
    const walletSnap = useSnapshot(WalletStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const appSnap = useSnapshot(AppStore.state);
    const assetsSnap = useSnapshot(AssetsStore.state);

    const chainId = settingsSnap.activeChain?.id;
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    const { isConnected, sendRequest } = useWebSocket();

    const [loading, setLoading] = useState<{ [key: string]: boolean }>({
        deposit: false,
        create: false,
        challenge: false,
        close: false,
        refresh: false,
        withdrawal: false,
    });
    const [localStorageAddress, setLocalStorageAddress] = useState<string>();

    const { handleCloseChannel } = useChannelClose();
    const { handleResizeChannel } = useResize();

    // Get account info hook
    const { getAccountInfo } = useGetAccountInfo({
        activeChainId: settingsSnap.activeChain?.id,
    });

    const { getParticipants } = useGetParticipants({
        signer: nitroSnap.stateSigner,
        sendRequest,
    });

    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    const balances = useMemo(() => {
        const tokenConfig = APP_CONFIG.TOKENS[chainId];

        return {
            availableBalance: nitroSnap.userAccountFromParticipants
                ? formatTokenUnits(tokenConfig, nitroSnap.userAccountFromParticipants.amount)
                : 0,
            available: nitroSnap.accountInfo?.available
                ? formatTokenUnits(tokenConfig, nitroSnap.accountInfo?.available)
                : 0,
        };
    }, [nitroSnap]);

    useEffect(() => {
        if (chainId && assetsSnap.assets.length) {
            // Load both account info and participants
            getAccountInfo();
            getParticipants();
        }
    }, [chainId, assetsSnap.assets, getAccountInfo, getParticipants]);

    useEffect(() => {
        fetchAssets();
    }, []);

    const refreshAccountInfo = useCallback(() => {
        setLoading((prev) => ({ ...prev, refresh: true }));
        Promise.all([getAccountInfo(), getParticipants()])
            .then(() => {
                setLoading((prev) => ({ ...prev, refresh: false }));
            })
            .catch((error) => {
                console.error('Error refreshing account data:', error);
                setLoading((prev) => ({ ...prev, refresh: false }));
            });
    }, [getAccountInfo, getParticipants]);

    useEffect(() => {
        const crypto_keypair = localStorage.getItem('crypto_keypair');

        if (crypto_keypair) {
            const keypairs = JSON.parse(crypto_keypair);

            setLocalStorageAddress(keypairs.address);
        }
    }, []);

    const handleChallenge = useCallback(async () => {
        if (!isConnected || !walletSnap.walletAddress || !nitroSnap.client) {
            console.error('WebSocket not connected, wallet not connected, or client not initialized');
            return;
        }

        setLoading((prev) => ({ ...prev, challenge: true }));
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

            // Call the challenge function with the channel ID and state from localStorage
            await nitroSnap.client.challengeChannel({
                channelId: channelId,
                candidateState: state,
                proofStates: [state],
            });

            // Refresh account info after challenging
            await Promise.all([getAccountInfo(), getParticipants()]);

            console.log('Channel challenged successfully');
        } catch (error) {
            console.error('Error challenging channel:', error);
        } finally {
            setLoading((prev) => ({ ...prev, challenge: false }));
        }
    }, [isConnected, walletSnap.walletAddress, nitroSnap.client, getAccountInfo, getParticipants]);

    const closeChannel = useCallback(async () => {
        const signer: WalletSigner = nitroSnap.stateSigner;

        if (!isConnected || !walletSnap.walletAddress) {
            console.error('WebSocket not connected or wallet not connected');
            return;
        }

        setLoading((prev) => ({ ...prev, close: true }));

        try {
            const channelId = localStorage.getItem('nitrolite_channel_id') || '';

            if (!channelId) {
                throw new Error('No channel ID found. Please create a channel first.');
            }

            if (!nitroSnap.stateSigner) {
                throw new Error('State signer not initialized. Please create a channel first.');
            }

            const fundDestination = walletSnap.walletAddress;

            const closeChannelMessage = await createCloseChannelMessage(signer.sign, channelId as Hex, fundDestination);

            const response = await sendRequest(closeChannelMessage);

            await handleCloseChannel(response);

            await Promise.all([getAccountInfo(), getParticipants()]);

            console.log('Channel closed successfully');
        } catch (error) {
            console.error('Error closing channel:', error);
        } finally {
            setLoading((prev) => ({ ...prev, close: false }));
        }
    }, [isConnected, walletSnap.walletAddress, sendRequest, handleCloseChannel, getAccountInfo, getParticipants]);

    const resizeChannel = useCallback(async () => {
        const signer: WalletSigner = nitroSnap.stateSigner;

        if (!isConnected || !walletSnap.walletAddress) {
            console.error('WebSocket not connected or wallet not connected');
            return;
        }

        setLoading((prev) => ({ ...prev, close: true }));

        try {
            const channelId = localStorage.getItem('nitrolite_channel_id') || '';
            const state = localStorage.getItem('nitrolite_channel_state') || '';

            if (!state) {
                throw new Error('No channel state found. Please create a channel first.');
            }

            if (!channelId) {
                throw new Error('No channel ID found. Please create a channel first.');
            }

            if (!nitroSnap.stateSigner) {
                throw new Error('State signer not initialized. Please create a channel first.');
            }

            const fundDestination = walletSnap.walletAddress;

            const parsedState = JSON.parse(state, (key, value) => {
                // Convert strings that look like BigInts back to BigInt
                if (typeof value === 'string' && /^\d+n$/.test(value)) {
                    return BigInt(value.substring(0, value.length - 1));
                }
                return value;
            });

            if (!parsedState || !parsedState.allocations || parsedState.allocations.length === 0) {
                throw new Error('Invalid channel state. No allocations found.');
            }

            if (!nitroSnap.userAccountFromParticipants) {
                throw new Error('User account not found in participants.');
            }

            console.log('parsedState.allocations[0]', parsedState.allocations[0]);

            const resizeParams: any = [
                {
                    channel_id: channelId as Hex,
                    participant_change: 0,
                    funds_destination: fundDestination as Address,
                },
            ];

            const resizeChannel = await createResizeChannelMessage(signer.sign, resizeParams);

            const response = await sendRequest(resizeChannel);

            // {
            //     "channel_id": "0x5e9f1bf4f970d3d6f2c30b62c6fb3650ef48a8f170ca2020fb4858ee10f5b377",
            //     "state_data": "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec780000000000000000000000000000000000000000000000000000000000000000",
            //     "intent": 2,
            //     "version": 1,
            //     "allocations": [
            //         {
            //             "destination": "0x47b56a639D1Dbe3eDfb3c34b1BB583Bf4312be97",
            //             "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            //             "amount": 0
            //         },
            //         {
            //             "destination": "0x3c93C321634a80FB3657CFAC707718A11cA57cBf",
            //             "token": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
            //             "amount": 0
            //         }
            //     ],
            //     "state_hash": "0x61cec33449997e8478ae9d3cff96dc33eb7547ce35e2b5b634c4a567d50a8972",
            //     "server_signature": {
            //         "v": "28",
            //         "r": "\"0xb36160607133e8fcb7e85698a9d87836a41e2a6324b4be5edc66b4de4d990897\"",
            //         "s": "\"0x5770fd47cd6f7da77d8a24f9dc0b9732dedf635b776ff1037d616e25f16580a7\""
            //     }
            // }

            const brokerState = response[0];

            const resizeStateData = {
                channelId: brokerState.channel_id,
                stateData: brokerState.state_data,
                version: brokerState.version,
                intent: brokerState.intent,
                allocations: [
                    {
                        destination: brokerState.allocations[0].destination,
                        token: brokerState.allocations[0].token,
                        amount: brokerState.allocations[0].amount,
                    },
                    {
                        destination: brokerState.allocations[1].destination,
                        token: brokerState.allocations[1].token,
                        amount: brokerState.allocations[1].amount,
                    },
                ] as [Allocation, Allocation],
                serverSignature: brokerState['server_signature'],
            };

            // parsedState - is the state of the channel before resize (in our case intiState)
            await handleResizeChannel(resizeStateData, parsedState);

            await Promise.all([getAccountInfo(), getParticipants()]);

            console.log('Channel closed successfully');
        } catch (error) {
            console.error('Error closing channel:', error);
        } finally {
            setLoading((prev) => ({ ...prev, close: false }));
        }
    }, [isConnected, walletSnap.walletAddress, sendRequest, handleCloseChannel, getAccountInfo, getParticipants]);

    const handleWithdrawal = useCallback(async () => {
        if (!isConnected || !walletSnap.walletAddress || !nitroSnap.client || !chainId) {
            console.error('WebSocket not connected, wallet not connected, client not initialized, or no active chain');
            return;
        }

        setLoading((prev) => ({ ...prev, withdrawal: true }));
        try {
            if (!nitroSnap.accountInfo?.available || nitroSnap.accountInfo.available <= 0n) {
                console.warn('No funds to withdraw');
                return;
            }

            await nitroSnap.client.withdrawal(nitroSnap.accountInfo.available);

            await Promise.all([getAccountInfo(), getParticipants()]);

            console.log('Withdrawal successful');
        } catch (error) {
            console.error('Withdrawal failed:', error);
        } finally {
            setLoading((prev) => ({ ...prev, withdrawal: false }));
        }
    }, [
        isConnected,
        walletSnap.walletAddress,
        nitroSnap.client,
        nitroSnap.accountInfo,
        chainId,
        getAccountInfo,
        getParticipants,
    ]);

    return (
        <>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-black hover:text-gray-600 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </Link>
                    </div>
                    <div className="flex items-center">
                        {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
                    </div>
                </div>

                {/* Balance Section */}
                <div className="rounded p-6 mb-6 border border-gray-300">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-semibold text-black mb-4">Account Balance</h2>
                        <button
                            onClick={refreshAccountInfo}
                            disabled={loading.refresh}
                            className="text-sm px-3 py-1 bg-white text-black rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading.refresh ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Available Balance */}
                        <div className="border border-gray-300 rounded-lg p-4">
                            <div className="text-sm text-gray-800 mb-1">Available Balance</div>
                            <div className="text-2xl font-bold text-black">$ {balances.availableBalance}</div>
                        </div>

                        {/* available Amount */}
                        <div className="border border-gray-300 rounded-lg p-4">
                            <div className="text-sm text-gray-800 mb-1">Total available</div>
                            <div className="text-2xl font-bold text-black">$ {balances.available}</div>
                        </div>
                    </div>
                </div>

                {/* Addresses Section */}
                <div className="rounded p-6 mb-6 border border-gray-300">
                    <h2 className="text-xl font-semibold text-dark mb-4">Addresses</h2>

                    {/* Privy Address */}
                    <AddressItem
                        key="EOA Address"
                        title="EOA Address"
                        desc="External Owned Account – use this address to receive funds."
                        address={walletSnap?.walletAddress}
                    />

                    {/* Wallet Address */}
                    <AddressItem
                        debugOnly
                        key="Local Wallet Address"
                        title="Local Wallet Address"
                        desc="Debug only – do NOT send funds here."
                        address={localStorageAddress}
                    />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <ActionButton onClick={resizeChannel} disabled={loading.resize}>
                        {loading.challenge ? 'Resizing...' : 'Resize'}
                    </ActionButton>
                    <ActionButton
                        onClick={handleWithdrawal}
                        disabled={
                            loading.withdrawal ||
                            !nitroSnap.accountInfo?.available ||
                            nitroSnap.accountInfo.available <= 0n
                        }>
                        {loading.withdrawal ? 'Processing...' : 'Withdrawal'}
                    </ActionButton>
                    <ActionButton onClick={handleChallenge} disabled={loading.challenge}>
                        {loading.challenge ? 'Challenging...' : 'Challenge'}
                    </ActionButton>
                    <ActionButton onClick={closeChannel} disabled={loading.close}>
                        {loading.close ? 'Closing...' : 'Close Channel'}
                    </ActionButton>
                </div>
            </div>
            <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
        </>
    );
}
