import React, { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');

    useEffect(() => {
        if (isOpen && animationState === 'exited') {
            setAnimationState('entering');
            setTimeout(() => setAnimationState('entered'), 10); // Small delay to trigger animation
        } else if (!isOpen && (animationState === 'entered' || animationState === 'entering')) {
            setAnimationState('exiting');
            // Match this timeout with the CSS transition duration
            setTimeout(() => setAnimationState('exited'), 300);
        }
    }, [isOpen, animationState]);

    const handleClose = () => {
        setAnimationState('exiting');
        // Match this timeout with the CSS transition duration
        setTimeout(() => {
            setAnimationState('exited');
            onClose();
        }, 300);
    };

    if (animationState === 'exited' && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
                    animationState === 'entering' || animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
                }`}
            />

            <div
                className={`fixed inset-0 z-10 flex flex-col bg-black overflow-hidden transition-transform duration-300 ease-in-out transform ${
                    animationState === 'entering'
                        ? 'translate-x-full'
                        : animationState === 'entered'
                          ? 'translate-x-0'
                          : animationState === 'exiting'
                            ? 'translate-x-full'
                            : 'translate-x-full'
                }`}>
                <div className="flex items-center p-4 border-b border-white">
                    <button onClick={handleClose} className="mr-4 text-white hover:text-gray-200">
                        <svg
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
                    </button>
                    <h2 className="text-xl font-semibold text-white">Send</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6 max-w-md mx-auto">
                        <div className="rounded-lg border border-white p-4">
                            <label className="block text-sm font-normal text-white mb-2">Recipient Address</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                className="block w-full px-3 py-3 bg-black border border-white rounded-md text-white shadow-sm focus:outline-none focus:ring-white focus:border-white"
                            />
                        </div>

                        <div className="rounded-lg border border-white p-4">
                            <label className="block text-sm font-normal text-white mb-2">Amount</label>
                            <div className="flex rounded-md shadow-sm">
                                <input
                                    type="number"
                                    placeholder="0.0"
                                    className="block w-full flex-1 px-3 py-3 bg-black border border-white rounded-l-md text-white focus:outline-none focus:ring-white focus:border-white"
                                />
                                <span className="inline-flex items-center px-4 py-3 border border-l-0 border-white bg-black text-white rounded-r-md">
                                    YUZU
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white">
                    <button className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ReceiveProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Receive: React.FC<ReceiveProps> = ({ isOpen, onClose }) => {
    const walletSnap = useSnapshot(WalletStore.state);
    const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');

    useEffect(() => {
        if (isOpen && animationState === 'exited') {
            setAnimationState('entering');
            setTimeout(() => setAnimationState('entered'), 10); // Small delay to trigger animation
        } else if (!isOpen && (animationState === 'entered' || animationState === 'entering')) {
            setAnimationState('exiting');
            // Match this timeout with the CSS transition duration
            setTimeout(() => setAnimationState('exited'), 300);
        }
    }, [isOpen, animationState]);

    const handleClose = () => {
        setAnimationState('exiting');
        // Match this timeout with the CSS transition duration
        setTimeout(() => {
            setAnimationState('exited');
            onClose();
        }, 300);
    };

    if (animationState === 'exited' && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
                    animationState === 'entering' || animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
                }`}
            />

            <div
                className={`fixed inset-0 z-10 flex flex-col bg-black overflow-hidden transition-transform duration-300 ease-in-out transform ${
                    animationState === 'entering'
                        ? 'translate-x-full'
                        : animationState === 'entered'
                          ? 'translate-x-0'
                          : animationState === 'exiting'
                            ? 'translate-x-full'
                            : 'translate-x-full'
                }`}>
                <div className="flex items-center p-4 border-b border-white">
                    <button onClick={handleClose} className="mr-4 text-white hover:text-gray-200">
                        <svg
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
                    </button>
                    <h2 className="text-xl font-semibold text-white">Receive</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8 flex flex-col items-center justify-center h-full">
                        {walletSnap.address && (
                            <div className="p-6 border-4 border-white rounded-lg mx-auto">
                                {/* This is a placeholder for a QR code */}
                                <div className="w-64 h-64 bg-black border border-white flex items-center justify-center">
                                    <span className="text-white">QR Code</span>
                                </div>
                            </div>
                        )}

                        <div className="text-center w-full max-w-md">
                            <h3 className="font-normal text-white mb-2">Your Address</h3>
                            <div className="bg-black border border-white px-4 py-3 rounded-lg">
                                <p className="font-mono text-sm break-all text-white">
                                    {walletSnap.address || 'Not connected'}
                                </p>
                            </div>

                            <button className="mt-6 inline-flex items-center px-6 py-3 border border-white rounded-md shadow-sm text-sm font-normal text-black bg-white hover:bg-gray-200 focus:outline-none">
                                <svg
                                    className="-ml-1 mr-2 h-5 w-5 text-black"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true">
                                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 010 2h-2v-2z" />
                                </svg>
                                Copy Address
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
