'use client';

import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
import { useSnapshot } from 'valtio';
import Image from 'next/image';
import NitroliteStore from '@/store/NitroliteStore';
import { AssetsStore } from '@/store';
import APP_CONFIG, { DEFAULT_ADDRESS } from '@/config/app';
import WalletStore from '@/store/WalletStore';
import NetworkSelector from './NetworkSelector';

interface DepositProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Deposit({ isOpen, onClose }: DepositProps) {
    const [value, setValue] = useState<string>('0');
    const { balances } = useSnapshot(AssetsStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);

    const yuzuBalance = useMemo(() => {
        return balances?.find((asset) => asset.symbol === DEFAULT_ADDRESS);
    }, [balances]);
    const chainId = useMemo(() => {
        return WalletStore.state.chainId;
    }, [WalletStore.state.chainId]);

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
        if (newValue === '') {
            setValue('0');
        } else {
            setValue(newValue.replaceAll(/^0/g, ''));
        }
    }, []);

    const { handleCreateChannel } = useChannelCreate();

    const onOpenChannel = useCallback(() => {
        const tokenAddress = APP_CONFIG.TOKENS[chainId];

        if (!tokenAddress) {
            alert('Token address not found');
            return;
        }

        handleCreateChannel(tokenAddress, String(+value));
    }, [handleCreateChannel, value, chainId]);

    const defaultComponent = useMemo(() => {
        return (
            <div className="flex flex-col justify-between h-full">
                <div className="flex-1 flex flex-col items-center justify-center mb-12">
                    <div className="flex gap-2 text-gray-800 items-start">
                        <span className="text-2xl font-bold">$</span>
                        <span className="text-6xl font-bold">{value}</span>
                    </div>
                    <div className="mt-6">
                        <NetworkSelector />
                    </div>
                </div>

                <span>
                    Available: {yuzuBalance?.balance} {yuzuBalance?.symbol}
                </span>
                <button
                    disabled={!+value}
                    onClick={onOpenChannel}
                    className="w-full bg-primary text-black py-2 rounded-md hover:bg-primary-hover disabled:bg-[#fff7cf] transition-colors font-normal mb-8">
                    Confirm
                </button>

                <NumberPad value={value} onChange={handleChange} />
            </div>
        );
    }, [value, onOpenChannel, handleChange]);

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
    const componentToShow =
        nitroliteSnapshot.status === 'open_pending' ||
        nitroliteSnapshot.status === 'deposit_pending' ||
        nitroliteSnapshot.status === 'funded'
            ? processingComponent
            : nitroliteSnapshot.status === 'opened'
              ? successComponent
              : defaultComponent;

    return (
        <div
            className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 w-full sm:w-96 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
            <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onClose} className="p-2">
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
