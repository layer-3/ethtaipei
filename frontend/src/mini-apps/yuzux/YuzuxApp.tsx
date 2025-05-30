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
import { MinusIcon } from '@/assets/images/MinusIcon';

function setThemeColor(color: string) {
    let themeMeta = document.querySelector('meta[name="theme-color"]');

    if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', color);
}

export function YuzuxApp() {
    // WebSocket - Use the hook without the URL parameter
    const { sendRequest, connect, isConnected, generateKeys, hasKeys } = useWebSocket(); // Removed wsUrl

    const [isExiting, setIsExiting] = useState(false);
    const appSnap = useSnapshot(AppStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    const chainId = useMemo(() => {
        return settingsSnap.activeChain?.id;
    }, [settingsSnap.activeChain]);

    const { getAccountInfo } = useGetAccountInfo({ activeChainId: chainId });

    const { getParticipants } = useGetParticipants({
        signer: nitroSnap.stateSigner,
        sendRequest,
    });

    // Ensure keys exist and connect WebSocket when the app mounts or becomes visible
    useEffect(() => {
        const initialize = async () => {
            if (!hasKeys) {
                console.log('YuzuxApp: No keys found, generating...');
                await generateKeys(); // Generate keys if they don't exist
            }
            // Attempt to connect if keys are present (or just generated) and not already connected
            if (hasKeys && !isConnected) {
                console.log('YuzuxApp: Keys present, attempting WebSocket connect...');
                await connect();
            }
        };

        initialize();
    }, [hasKeys, isConnected, generateKeys, connect]);

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
        setThemeColor('#000');

        return () => {
            document.body.style.overflow = 'auto';
            setThemeColor('#fff');
        };
    }, []);

    useEffect(() => {
        // Fetch data only if connected and chainId is available
        if (isConnected && chainId && !appSnap?.isReceiveOpen && !appSnap?.isSendOpen) {
            getAccountInfo();
            getParticipants();
        }
    }, [isConnected, chainId, getAccountInfo, getParticipants, appSnap?.isReceiveOpen, appSnap?.isSendOpen]); // Added isConnected dependency

    const currentBalance = useMemo(() => {
        if (!nitroSnap.userAccountFromParticipants) return '0';
        const displayValue = nitroSnap.userAccountFromParticipants.amount;

        return displayValue;
    }, [nitroSnap.userAccountFromParticipants]);

    return (
        <div
            className={`fixed inset-0 bg-black z-50 flex flex-col p-6 transition-opacity duration-300 ease-in-out ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}>
            <div className="flex justify-between items-center py-2">
                <h1 className="text-3xl font-gilmer-bold text-white">Yuzux</h1>
                <button
                    onClick={handleMinimize}
                    className="bg-white hover:bg-gray-200 text-black p-2 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Minimize">
                    <MinusIcon className="w-5 h-5" />
                </button>
            </div>
            {/* <div className="text-white">{JSON.stringify(nitroSnap.participants)}</div> */}
            {/* <div className="text-white">{JSON.stringify(nitroSnap.userAccountFromParticipants)}</div> */}
            <div className="flex-grow flex items-center justify-center">
                <div
                    className={`text-white text-center transform transition-transform duration-300 ${
                        isExiting ? 'scale-95' : 'scale-100'
                    }`}>
                    <div className="flex flex-col items-center">
                        <span className="text-6xl font-gilmer-bold leading-none text-white">
                            $ {formatSignificantWithSeparators(String(currentBalance) || '0')}
                        </span>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex justify-between max-w-md mx-auto">
                    <button
                        onClick={handleOpenReceive}
                        className="flex-1 mr-2 bg-black text-white py-3 rounded-md hover:bg-gray-900 transition-colors flex items-center justify-center border border-white font-metro-semibold">
                        Receive
                    </button>
                    <button
                        onClick={handleOpenSend}
                        className="flex-1 ml-2 bg-white text-black py-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center border border-white font-metro-semibold">
                        Pay
                    </button>
                </div>
            </div>
            <Send isOpen={appSnap.isSendOpen || false} onClose={handleCloseSend} />
            <Receive isOpen={appSnap.isReceiveOpen || false} onClose={handleCloseReceive} />
        </div>
    );
}
