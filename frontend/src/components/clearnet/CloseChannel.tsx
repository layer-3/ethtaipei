'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import Image from 'next/image';
import NitroliteStore from '@/store/NitroliteStore';
import APP_CONFIG from '@/config/app';
import { WalletStore } from '@/store';
import { useChannelClose } from '@/hooks/channel/useChannelClose';

interface DepositProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CloseChannel({ isOpen, onClose }: DepositProps) {
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    // TODO: take from broker
    const value = 0;

    const chainId = useMemo(() => {
        return WalletStore.state.chainId;
    }, [WalletStore.state.chainId]);

    // Auto-hide deposit panel when transaction is successful
    useEffect(() => {
        if (nitroliteSnapshot.status === 'closed') {
            const timer = setTimeout(() => {
                onClose();
            }, 2500); // Hide after 2.5 seconds

            return () => clearTimeout(timer);
        }
    }, [nitroliteSnapshot.status, onClose]);

    const { handleCloseChannel } = useChannelClose();

    const onCloseChannel = useCallback(() => {
        const tokenAddress = APP_CONFIG.TOKENS[chainId];

        if (!tokenAddress) {
            alert('Token address not found');
            return;
        }

        // TODO: ask broker here about signature
        handleCloseChannel(tokenAddress, String(value));
    }, [handleCloseChannel, chainId, value]);

    const defaultComponent = useMemo(() => {
        return (
            <div className="flex flex-col justify-between h-full">
                <div className="flex-1 flex flex-col items-center justify-center mb-12">
                    <div className="flex gap-2 text-gray-800 items-start">
                        <span className="text-2xl font-bold">$</span>
                        <span className="text-6xl font-bold">{value}</span>
                    </div>
                </div>

                <button
                    onClick={onCloseChannel}
                    className="w-full bg-primary text-black py-2 rounded-md hover:bg-primary-hover disabled:bg-[#fff7cf] transition-colors font-normal mb-8"
                >
                    Confirm Close
                </button>
            </div>
        );
    }, [onCloseChannel, value]);

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
                    <p className="text-gray-600">Your channel is closed</p>
                </div>

                <div className="mt-4 text-sm text-gray-500">Closing in a moment...</div>
            </div>
        );
    }, []);

    // Determine which component to show based on status
    const componentToShow =
        nitroliteSnapshot.status === 'close_pending'
            ? processingComponent
            : nitroliteSnapshot.status === 'closed'
              ? successComponent
              : defaultComponent;

    return (
        <div
            className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 w-full sm:w-96 transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="p-4 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onClose} className="p-2">
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
                    <h1 className="text-black text-sm uppercase tracking-wider font-normal">Close Channel</h1>
                    <div className="w-8" />
                </div>

                <div className="flex-1 overflow-auto">{componentToShow}</div>
            </div>
        </div>
    );
}
