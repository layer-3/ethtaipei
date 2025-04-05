import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import AppStore from '@/store/AppStore';
import { useSnapshot } from 'valtio';
import { Send, Receive } from './components/SendReceive';

export function YuzuxApp() {
    const [isExiting, setIsExiting] = useState(false);
    const appSnap = useSnapshot(AppStore.state);

    // Handle exit animation
    const handleMinimize = () => {
        setIsExiting(true);
        setTimeout(() => {
            AppStore.minimizeApp('yuzux');
            setIsExiting(false);
        }, 300); // Match this timing with CSS transition duration
    };

    // Send and Receive handlers
    const handleOpenSend = useCallback(() => {
        AppStore.openSend();
    }, []);

    const handleCloseSend = useCallback(() => {
        AppStore.closeSend();
    }, []);

    const handleOpenReceive = useCallback(() => {
        AppStore.openReceive();
    }, []);

    const handleCloseReceive = useCallback(() => {
        AppStore.closeReceive();
    }, []);

    // Prevent scroll on body when component is mounted
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div
            className={`fixed inset-0 bg-black z-50 flex flex-col transition-opacity duration-300 ease-in-out ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}>
            <div className="flex justify-between items-center py-2 px-6">
                <div className="flex items-center">
                    <h1 className="text-3xl font-bold text-white">Yuzux</h1>
                </div>
                <button
                    onClick={handleMinimize}
                    className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Minimize">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M5 10a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            </div>

            <div className="flex-grow flex items-center justify-center">
                <div
                    className={`text-white text-center transform transition-transform duration-300 ${
                        isExiting ? 'scale-95' : 'scale-100'
                    }`}>
                    <div className="mb-6">
                        <Image src="/yuzux.svg" alt="Yuzux" width={180} height={180} className="mx-auto" />
                    </div>

                    <div className="flex flex-col items-center mt-4">
                        <span className="text-[56px] font-bold leading-none bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                            200
                        </span>
                        <span className="text-[18px] mt-2 opacity-80 tracking-widest">YUZU</span>
                    </div>
                </div>
            </div>

            {/* Bottom action buttons */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex justify-between max-w-md mx-auto">
                    <button
                        onClick={handleOpenReceive}
                        className="flex-1 mr-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-md hover:from-blue-600 hover:to-purple-700 transition-colors flex items-center justify-center">
                        <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <polyline points="8 12 12 16 16 12" />
                            <line x1="12" y1="4" x2="12" y2="16" />
                            <line x1="4" y1="20" x2="20" y2="20" />
                        </svg>
                        Receive
                    </button>
                    <button
                        onClick={handleOpenSend}
                        className="flex-1 ml-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-md hover:from-blue-600 hover:to-purple-700 transition-colors flex items-center justify-center">
                        <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <polyline points="16 12 12 8 8 12" />
                            <line x1="12" y1="20" x2="12" y2="8" />
                            <line x1="4" y1="4" x2="20" y2="4" />
                        </svg>
                        Send
                    </button>
                </div>
            </div>

            {/* Send and Receive overlay components */}
            <Send isOpen={appSnap.isSendOpen || false} onClose={handleCloseSend} />
            <Receive isOpen={appSnap.isReceiveOpen || false} onClose={handleCloseReceive} />
        </div>
    );
}
