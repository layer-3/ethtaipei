import { useEffect, useState, useCallback, useMemo } from 'react';
import AppStore from '@/store/AppStore';
import { useSnapshot } from 'valtio';
import { Send, Receive } from './components/SendReceive';
import { NitroliteStore } from '@/store';

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

    const currentBalance = useMemo(() => {
        const nitroState = NitroliteStore.getLatestState();

        if (!nitroState) {
            return 0;
        }

        const creatorAllocation = nitroState.allocations[0];

        return creatorAllocation.amount;
    }, [NitroliteStore, appSnap.isSendOpen]);

    return (
        <div
            className={`fixed inset-0 bg-black z-50 flex flex-col p-6 transition-opacity duration-300 ease-in-out ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}>
            <div className="flex justify-between items-center py-2">
                <div className="flex items-center">
                    <h1 className="text-3xl font-bold text-white">Yuzux</h1>
                </div>
                <button
                    onClick={handleMinimize}
                    className="bg-white hover:bg-gray-200 text-black p-2 rounded-full flex items-center justify-center transition-colors"
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
                    <div className="flex flex-col items-center">
                        <span className="text-[56px] font-bold leading-none text-white">$ {currentBalance}</span>
                    </div>
                </div>
            </div>

            {/* Bottom action buttons */}
            <div className="">
                <div className="flex justify-between max-w-md mx-auto">
                    <button
                        onClick={handleOpenReceive}
                        className="flex-1 mr-2 bg-black text-white py-3 rounded-md hover:bg-gray-900 transition-colors flex items-center justify-center border border-white">
                        Receive
                    </button>
                    <button
                        onClick={handleOpenSend}
                        className="flex-1 ml-2 bg-white text-black py-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center border border-white">
                        Pay
                    </button>
                </div>
            </div>

            {/* Send and Receive overlay components */}
            <Send isOpen={appSnap.isSendOpen || false} onClose={handleCloseSend} />
            <Receive isOpen={appSnap.isReceiveOpen || false} onClose={handleCloseReceive} />
        </div>
    );
}
