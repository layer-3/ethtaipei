'use client';

import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
import { useSnapshot } from 'valtio';
import Image from 'next/image';
import NitroliteStore from '@/store/NitroliteStore';
import { AssetsStore } from '@/store';
import APP_CONFIG from '@/config/app';
import WalletStore from '@/store/WalletStore';
import NetworkSelector from './NetworkSelector';
import { Address } from 'viem';
import SettingsStore from '@/store/SettingsStore';
import { fetchAssets, fetchBalances } from '@/store/AssetsStore';
import { chains } from '@/config/chains';
import { generateKeyPair, createEthersSigner, createWebSocketClient } from '@/websocket';

interface DepositProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Deposit({ isOpen, onClose }: DepositProps) {
    const [value, setValue] = useState<string>('0');
    const { balances, assets } = useSnapshot(AssetsStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    const { walletAddress } = useSnapshot(WalletStore.state);
    const { activeChain } = useSnapshot(SettingsStore.state);

    const usdcBalance = useMemo(() => {
        // First try to find USDC by symbol
        const usdc = balances?.find((asset) => asset.symbol.toUpperCase() === 'USDC');

        if (usdc) return usdc;

        // If no USDC found, return the first token as fallback
        return balances && balances.length > 0 ? balances[0] : null;
    }, [balances, activeChain]);

    // Always set Polygon when component opens
    useEffect(() => {
        if (isOpen) {
            // Always set to Polygon regardless of current selection
            const polygonChain = chains.find((chain) => chain.id === 137);

            if (polygonChain) {
                SettingsStore.setActiveChain(polygonChain);
            }

            // Always fetch assets first when the component opens
            fetchAssets();
        }
    }, [isOpen]);

    // Fetch balances whenever assets or chain changes
    useEffect(() => {
        if (isOpen && walletAddress && activeChain) {
            // Reset value whenever chain changes to avoid confusion
            setValue('0');

            // Fetch balances for the current chain
            fetchBalances(walletAddress as Address, activeChain);
        }
    }, [isOpen, walletAddress, activeChain, assets]);

    // Reset value when component opens
    useEffect(() => {
        if (isOpen) {
            setValue('0');
        }
    }, [isOpen]);

    // Auto-hide deposit panel when transaction is successful
    useEffect(() => {
        if (nitroliteSnapshot.status === 'opened') {
            const timer = setTimeout(() => {
                onClose();
            }, 2500); // Hide after 2.5 seconds

            return () => clearTimeout(timer);
        }
    }, [nitroliteSnapshot.status, onClose]);

    const handleChange = useCallback((newValue: string) => {
        if (!newValue || newValue === '') {
            setValue('0');
            return;
        }

        // Handle decimal points
        if (newValue === '.') {
            setValue('0.');
            return;
        }

        // Handle and fix multiple decimal points
        if (newValue.split('.').length > 2) {
            const [whole, ...fractional] = newValue.split('.');

            setValue(`${whole}.${fractional.join('')}`);
            return;
        }

        // Handle decimal values properly
        if (newValue.includes('.')) {
            // For decimal values, ensure we keep the format correct
            const [whole, fraction] = newValue.split('.');

            if (whole === '' || whole === '00') {
                // If whole part is empty or multiple zeros, replace with '0'
                setValue(`0.${fraction}`);
            } else if (whole.startsWith('0') && whole.length > 1) {
                // Remove leading zeros from the whole part if it's not just '0'
                setValue(`${whole.replace(/^0+/, '')}.${fraction}`);
            } else {
                // Keep as is for normal decimal values
                setValue(newValue);
            }
        } else {
            // For non-decimal values, handle leading zeros
            if (newValue === '0' || newValue === '00') {
                setValue('0');
            } else if (newValue.startsWith('0')) {
                // Remove leading zeros for whole numbers
                setValue(newValue.replace(/^0+/, ''));
            } else {
                setValue(newValue);
            }
        }
    }, []);

    // Helper function to initialize keys and WebSocket
    const initializeKeysAndWebSocket = async () => {
        try {
            console.log('Initializing crypto keys and WebSocket connection');

            // Check if we already have keys
            let keyPair = null;
            const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';
            const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

            if (savedKeys) {
                try {
                    keyPair = JSON.parse(savedKeys);
                    console.log('Using existing crypto keys');
                } catch (error) {
                    console.error('Failed to parse saved keys:', error);
                    keyPair = null;
                }
            }

            // Generate new keys if none exist
            if (!keyPair) {
                console.log('Generating new crypto keys');
                keyPair = await generateKeyPair();

                // Store the keys in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(keyPair));
                }
            }

            // Create a signer with the private key
            const signer = createEthersSigner(keyPair.privateKey);

            NitroliteStore.setStateSigner(signer);

            // Create and connect WebSocket client
            const wsUrl = APP_CONFIG.WEBSOCKET.URL;
            const client = createWebSocketClient(wsUrl, signer, {
                autoReconnect: true,
                reconnectDelay: 1000,
                maxReconnectAttempts: 5,
                requestTimeout: 10000,
            });

            // Connect to WebSocket and authenticate
            try {
                await client.connect();
                console.log('WebSocket connection established and authenticated');
            } catch (wsError) {
                console.error('WebSocket connection failed:', wsError);
                // Continue execution even if WebSocket fails - we still have the keys
            }

            return { keyPair, client };
        } catch (error) {
            console.error('Error initializing keys and WebSocket:', error);
            // We don't throw here to avoid breaking the wallet connection
            // Just log the error and return null
            return null;
        }
    };

    const { handleCreateChannel } = useChannelCreate();

    const onOpenChannel = useCallback(async () => {
        try {
            // First initialize keys and WebSocket connection
            await initializeKeysAndWebSocket();

            const chainId = activeChain?.id || 0;
            const tokenAddress = APP_CONFIG.TOKENS[chainId];

            if (!tokenAddress) {
                alert('Token address not found for this network');
                return;
            }

            // Parse and format the value to ensure proper decimal handling
            const numericValue = parseFloat(value);

            if (isNaN(numericValue) || numericValue <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            // Check if user has sufficient balance
            const availableBalance = parseFloat(usdcBalance?.balance as string) || 0;

            if (numericValue > availableBalance) {
                alert('Insufficient balance');
                return;
            }

            // Use the parsed value with proper string representation for decimals
            const formattedValue = numericValue.toString();

            try {
                await handleCreateChannel(tokenAddress, formattedValue);
            } catch (error) {
                // Check for specific error messages
                const errorMsg = String(error);

                if (errorMsg.includes('not been authorized by the user')) {
                    alert('Transaction was rejected. Please approve the transaction in your wallet to continue.');
                } else if (errorMsg.includes('user rejected transaction')) {
                    alert(
                        "You've rejected the transaction. Please try again and approve the transaction in your wallet.",
                    );
                } else {
                    throw error; // re-throw for general error handling
                }
            }
        } catch (error) {
            console.error('Error creating channel:', error);

            // More descriptive error message to the user
            const errorMsg = String(error).toLowerCase();

            if (errorMsg.includes('insufficient funds') || errorMsg.includes('exceeds balance')) {
                alert('Insufficient funds for gas fees plus deposit amount.');
            } else if (errorMsg.includes('not initialized')) {
                alert('Wallet connection issue. Please reconnect your wallet and try again.');
            } else {
                alert('Failed to create channel. Please try again later.');
            }
        }
    }, [handleCreateChannel, value, activeChain, usdcBalance]);

    const defaultComponent = useMemo(() => {
        const numericValue = parseFloat(value);
        const availableBalance = parseFloat(usdcBalance?.balance as string) || 0;
        const hasInsufficientBalance = numericValue > availableBalance;
        const isValidAmount = numericValue > 0;

        return (
            <div className="flex flex-col justify-between h-full">
                <div className="flex-1 flex flex-col items-center justify-center mb-12">
                    <div className="flex gap-2 text-gray-800 items-start">
                        <span className="text-2xl font-bold">$</span>
                        <span className="text-6xl font-bold">{value}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {hasInsufficientBalance && <span className="text-red-500">Insufficient balance</span>}
                    </div>
                    <div className="mt-6">
                        <NetworkSelector />
                    </div>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                    <span className="font-medium">
                        Available: {availableBalance.toFixed(4)} {usdcBalance?.symbol || 'USDC'}
                    </span>
                </div>

                <button
                    disabled={!isValidAmount || hasInsufficientBalance}
                    onClick={onOpenChannel}
                    className="w-full bg-primary text-black py-2 rounded-md hover:bg-primary-hover disabled:bg-[#fff7cf] transition-colors font-normal mb-8"
                >
                    Confirm
                </button>

                <NumberPad value={value} onChange={handleChange} />
            </div>
        );
    }, [value, onOpenChannel, handleChange, usdcBalance, activeChain]);

    const processingComponent = useMemo(() => {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-6 relative">
                    <Image src="/eclipse.svg" alt="eclipse" width={82} height={82} className="animate-spin" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Image src="/status-online.svg" alt="online" width={36} height={36} />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2 text-gray-800">Processing</h2>
                    <p className="text-gray-600">Setting up the connection</p>
                </div>
            </div>
        );
    }, []);

    const successComponent = useMemo(() => {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-6 relative">
                    <div className="w-16 h-16 border-4 border-green-500 rounded-full flex items-center justify-center">
                        <Image src="/check.svg" alt="check" width={36} height={36} />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2 text-gray-800">Success!</h2>
                    <p className="text-gray-600">Your account is ready</p>
                </div>

                <div className="mt-4 text-sm text-gray-500">Closing in a moment...</div>
            </div>
        );
    }, []);

    // Determine which component to show based on status
    const componentToShow = useMemo(() => {
        if (['open_pending', 'deposit_pending', 'funded'].includes(nitroliteSnapshot.status)) {
            return processingComponent;
        } else if (nitroliteSnapshot.status === 'opened') {
            return successComponent;
        }
        return defaultComponent;
    }, [nitroliteSnapshot.status, processingComponent, successComponent, defaultComponent]);

    return (
        <div
            className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 w-full sm:w-96 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                            />
                        </svg>
                    </button>
                    <h1 className="text-black text-sm uppercase tracking-wider font-normal">Open Account</h1>
                    <div className="w-8" />
                </div>

                <div className="flex-1 overflow-auto">{componentToShow}</div>
            </div>
        </div>
    );
}
