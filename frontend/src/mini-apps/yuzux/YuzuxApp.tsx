import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSnapshot } from 'valtio';

import { AppStore, NitroliteStore, SettingsStore } from '@/store';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';

import { Send, Receive } from './components/SendReceive';
import APP_CONFIG from '@/config/app';
import { useGetAccountInfo } from '@/hooks/channel/useGetAccountInfo';
import { formatSignificantWithSeparators } from '@/components/ui/Decimal';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';
import { useWebSocket } from '@/hooks';

export function YuzuxApp() {
    // WebSocket
    const wsUrl = APP_CONFIG.WEBSOCKET.URL;
    const { sendRequest, connect, isConnected } = useWebSocket(wsUrl);

    const [isExiting, setIsExiting] = useState(false);
    const appSnap = useSnapshot(AppStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    const chainId = useMemo(() => {
        return settingsSnap.activeChain?.id;
    }, [settingsSnap.activeChain]);

    const { getAccountInfo } = useGetAccountInfo({ activeChainId: chainId });
    const { getParticipants } = useGetParticipants({
        wsProps: { isConnected, connect, sendRequest },
        activeChainId: chainId,
    });

    const handleMinimize = () => {
        setIsExiting(true);
        setTimeout(() => {
            AppStore.minimizeApp('yuzux');
            setIsExiting(false);
        }, 300);
    };

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

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    useEffect(() => {
        if (chainId) {
            getAccountInfo();
            getParticipants();
        }
    }, [chainId]);

    const currentBalance = useMemo(() => {
        if (!nitroSnap.accountInfo.locked) return '0';
        const displayValue = formatTokenUnits(APP_CONFIG.TOKENS[chainId], nitroSnap.accountInfo.locked);

        return displayValue;
    }, [appSnap.isSendOpen, chainId, nitroSnap.accountInfo.locked]);

    return (
        <div
            className={`fixed inset-0 bg-black z-50 flex flex-col p-6 transition-opacity duration-300 ease-in-out ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}>
            <div className="flex justify-between items-center py-2">
                <h1 className="text-3xl font-bold text-white">Yuzux</h1>
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
            <div>{JSON.stringify(nitroSnap.participants)}</div>
            test
            <div>{JSON.stringify(nitroSnap.userAccountFromParticipants)}</div>
            <div className="flex-grow flex items-center justify-center">
                <div
                    className={`text-white text-center transform transition-transform duration-300 ${
                        isExiting ? 'scale-95' : 'scale-100'
                    }`}>
                    <div className="flex flex-col items-center">
                        <span className="text-[56px] font-bold leading-none text-white">
                            $ {formatSignificantWithSeparators(String(currentBalance) || '0')}
                        </span>
                    </div>
                </div>
            </div>
            <div>
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
            <Send isOpen={appSnap.isSendOpen || false} onClose={handleCloseSend} />
            <Receive isOpen={appSnap.isReceiveOpen || false} onClose={handleCloseReceive} />
        </div>
    );
}
