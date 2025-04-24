'use client';

import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { generateKeyPair, createEthersSigner } from '@/websocket';
import { useChannelCreate } from '@/hooks';

interface DepositProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Deposit({ isOpen, onClose }: DepositProps) {
    const [value, setValue] = useState<string>('0');
    const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success'>('idle');
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const { balances, assets } = useSnapshot(AssetsStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    const { walletAddress } = useSnapshot(WalletStore.state);
    const { activeChain } = useSnapshot(SettingsStore.state);
    const { handleDepositToChannel, handleCreateChannel } = useChannelCreate();

    // Get USDC balance or fallback to first token
    const usdcBalance = useMemo(() => {
        const usdc = balances?.find((asset) => asset.symbol.toUpperCase() === 'USDC');

        return usdc || (balances && balances.length > 0 ? balances[0] : null);
    }, [balances]);

    // Always set Polygon when component opens and fetch assets
    useEffect(() => {
        if (isOpen) {
            const polygonChain = chains.find((chain) => chain.id === 137);

            if (polygonChain) {
                SettingsStore.setActiveChain(polygonChain);
            }
            fetchAssets();
            // Reset status when opening
            setTransactionStatus('idle');
        }
    }, [isOpen]);

    // Fetch balances and reset value when needed
    useEffect(() => {
        if (isOpen && walletAddress && activeChain) {
            setValue('0');
            fetchBalances(walletAddress as Address, activeChain);
        }
    }, [isOpen, walletAddress, activeChain, assets]);

    // Auto-hide deposit panel when transaction is successful
    useEffect(() => {
        if (transactionStatus === 'success' || nitroliteSnapshot.status === 'opened') {
            const timer = setTimeout(() => {
                onClose();
            }, 2500); // Hide after 2.5 seconds

            return () => clearTimeout(timer);
        }
    }, [transactionStatus, nitroliteSnapshot.status, onClose]);

    // Handle number pad input changes with proper formatting
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
            const [whole, fraction] = newValue.split('.');

            if (whole === '' || whole === '00') {
                setValue(`0.${fraction}`);
            } else if (whole.startsWith('0') && whole.length > 1) {
                setValue(`${whole.replace(/^0+/, '')}.${fraction}`);
            } else {
                setValue(newValue);
            }
        } else {
            // For non-decimal values, handle leading zeros
            if (newValue === '0' || newValue === '00') {
                setValue('0');
            } else if (newValue.startsWith('0')) {
                setValue(newValue.replace(/^0+/, ''));
            } else {
                setValue(newValue);
            }
        }
    }, []);

    // Initialize keys and WebSocket connection
    const initializeKeys = useCallback(async () => {
        try {
            // Check if we already have keys
            let keyPair = null;
            const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';
            const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

            if (savedKeys) {
                try {
                    keyPair = JSON.parse(savedKeys);
                } catch (error) {
                    keyPair = null;
                }
            }

            // Generate new keys if none exist
            if (!keyPair) {
                keyPair = await generateKeyPair();
                if (typeof window !== 'undefined') {
                    localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(keyPair));
                }
            }

            // Create a signer with the private key
            const signer = createEthersSigner(keyPair.privateKey);

            NitroliteStore.setStateSigner(signer);

            return { keyPair };
        } catch (error) {
            return null;
        }
    }, []);

    // Handle deposit process
    const onDeposit = useCallback(async () => {
        try {
            // Update status to processing
            setTransactionStatus('processing');

            // Initialize keys and WebSocket
            await initializeKeys();

            const chainId = activeChain?.id || 0;
            const tokenAddress = APP_CONFIG.TOKENS[chainId];

            if (!tokenAddress) {
                alert('Token address not found for this network');
                setTransactionStatus('idle');
                return;
            }

            // Parse and validate the amount
            const numericValue = parseFloat(value);

            if (isNaN(numericValue) || numericValue <= 0) {
                alert('Please enter a valid amount');
                setTransactionStatus('idle');

                return;
            }

            // Check balance
            const availableBalance = parseFloat(usdcBalance?.balance as string) || 0;

            if (numericValue > availableBalance) {
                alert('Insufficient balance');
                setTransactionStatus('idle');
                return;
            }

            // Deposit with formatted value
            const formattedValue = numericValue.toString();

            await handleDepositToChannel(tokenAddress as Address, formattedValue);
            await handleCreateChannel(tokenAddress as Address, '0.001');

            // Success! Set status
            setTransactionStatus('success');
            console.log('Deposit successful');
        } catch (error) {
            const errorMsg = String(error).toLowerCase();

            setTransactionStatus('idle');

            // Handle specific errors with friendly messages
            if (error && typeof error === 'object' && 'message' in error) {
                const msg = String(error.message).toLowerCase();

                if (msg.includes('not been authorized') || msg.includes('approve')) {
                    alert('Transaction was rejected. Please approve the transaction in your wallet to continue.');
                } else if (msg.includes('user rejected') || msg.includes('user denied')) {
                    alert(
                        "You've rejected the transaction. Please try again and approve the transaction in your wallet.",
                    );
                } else if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
                    alert('Insufficient funds for gas fees plus deposit amount.');
                } else if (msg.includes('not initialized')) {
                    alert('Wallet connection issue. Please reconnect your wallet and try again.');
                } else {
                    alert('Failed to deposit. Please try again later.');
                }
            } else {
                alert('An unexpected error occurred. Please try again.');
            }

            console.error('Error depositing funds:', error);
        }
    }, [value, activeChain, usdcBalance, handleDepositToChannel, initializeKeys]);

    // Default component with number pad
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
                    onClick={onDeposit}
                    className="w-full bg-primary text-black py-2 rounded-md hover:bg-primary-hover disabled:bg-[#fff7cf] transition-colors font-normal mb-8">
                    Deposit
                </button>

                <NumberPad value={value} onChange={handleChange} />
            </div>
        );
    }, [value, onDeposit, handleChange, usdcBalance]);

    // Processing component
    const processingComponent = useMemo(
        () => (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-6 relative">
                    <Image src="/eclipse.svg" alt="eclipse" width={82} height={82} className="animate-spin" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Image src="/status-online.svg" alt="online" width={36} height={36} />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2 text-gray-800">Processing</h2>
                    <p className="text-gray-600">Processing your deposit</p>
                </div>
            </div>
        ),
        [],
    );

    // Success component
    const successComponent = useMemo(
        () => (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="mb-6 relative">
                    <div className="w-16 h-16 border-4 border-green-500 rounded-full flex items-center justify-center">
                        <Image src="/check.svg" alt="check" width={36} height={36} />
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2 text-gray-800">Success!</h2>
                    <p className="text-gray-600">Your deposit was successful</p>
                </div>

                <div className="mt-4 text-sm text-gray-500">Closing in a moment...</div>
            </div>
        ),
        [],
    );

    // Determine component to show based on transaction status or nitrolite status
    const componentToShow = useMemo(() => {
        // Local status takes priority
        if (transactionStatus === 'processing') return processingComponent;
        if (transactionStatus === 'success') return successComponent;

        // Fallback to nitrolite status
        if (['open_pending', 'deposit_pending', 'funded'].includes(nitroliteSnapshot.status)) {
            return processingComponent;
        } else if (nitroliteSnapshot.status === 'opened') {
            return successComponent;
        }

        return defaultComponent;
    }, [transactionStatus, nitroliteSnapshot.status, processingComponent, successComponent, defaultComponent]);

    // Handle swipe gesture to close (only for mobile)
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const minSwipeDistance = 100; // Minimum distance required for swipe

        // If swipe from right to left and distance is sufficient
        if (distance > minSwipeDistance) {
            // Prevent default behavior and close the modal
            onClose();
        }

        // Reset touch states
        setTouchStart(null);
        setTouchEnd(null);
    };

    return (
        <div
            className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 w-full sm:w-96 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}>
            <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6">
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
