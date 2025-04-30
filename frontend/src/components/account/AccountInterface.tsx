'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSnapshot } from 'valtio';
import { WalletStore, SettingsStore, NitroliteStore, AppStore } from '@/store';
import { useChannelClose } from '@/hooks/channel';
import { useWebSocket } from '@/hooks/websocket';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import APP_CONFIG from '@/config/app';
import { useGetAccountInfo } from '@/hooks/channel/useGetAccountInfo';
import Deposit from '../wallet/clearnet/Deposit';
import AssetsStore, { fetchAssets } from '@/store/AssetsStore';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '../ui/ActionButton';
import { Address, Hex } from 'viem';
import { createCloseChannelMessage, createResizeChannelMessage } from '@erc7824/nitrolite';
import { WalletSigner } from '@/websocket';

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
            locked: nitroSnap.accountInfo?.locked ? formatTokenUnits(tokenConfig, nitroSnap.accountInfo?.locked) : 0,
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
                proofStates: state,
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
            const participant_change = nitroSnap.userAccountFromParticipants.amount - parsedState.allocations[0].amount;

            const resizeParams: any = [
                {
                    channel_id: channelId as Hex,
                    participant_change: Number(participant_change),
                    funds_destination: fundDestination as Address,
                },
            ];

            const resizeChannel = await createResizeChannelMessage(signer.sign, resizeParams);

            const response = await sendRequest(resizeChannel);

            console.log('Resize channel response:', response);
            // TODO: Add handleResizeChannel function for the onchain resize
            // await handleCloseChannel(response);

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

                        {/* Locked Amount */}
                        <div className="border border-gray-300 rounded-lg p-4">
                            <div className="text-sm text-gray-800 mb-1">Locked in Channels</div>
                            <div className="text-2xl font-bold text-black">$ {balances.locked}</div>
                        </div>
                    </div>
                </div>

                {/* Addresses Section */}
                <div className="rounded p-6 mb-6 border border-gray-300">
                    <h2 className="text-xl font-semibold text-dark mb-4">Addresses</h2>

                    {/* Wallet Address */}
                    <div className="mb-4">
                        <h3 className="text-md text-dark mb-2 text-gray-800">Local Wallet Address</h3>
                        <div className="p-3 rounded border border-gray-300 font-mono text-sm text-gray-800 break-all">
                            {localStorageAddress}
                        </div>
                    </div>

                    {/* Privy Address */}
                    <div className="mb-4">
                        <h3 className="text-md text-dark mb-2 text-gray-800">EOA Address</h3>
                        <div className=" p-3 rounded border border-gray-300 font-mono text-sm text-gray-800 break-all">
                            {walletSnap?.walletAddress ? walletSnap.walletAddress : 'Not connected'}
                        </div>
                    </div>
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
