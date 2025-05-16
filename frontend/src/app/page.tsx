'use client';

import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { AppStore, NitroliteStore, WalletStore } from '@/store';
import { MinimizedApps, MainHeader, AppCatalog, YuzuxSection, YuzuxAppContainer } from '@/components';
import { Deposit } from '@/components/wallet/clearnet';
import { fetchAssets } from '@/store/AssetsStore';
import { usePrivy } from '@privy-io/react-auth';
import { useWebSocket } from '@/hooks/websocket';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';

function HomePage() {
    const appSnap = useSnapshot(AppStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    const walletSnap = useSnapshot(WalletStore.state);
    const { login, ready } = usePrivy();

    const { isConnected, sendRequest } = useWebSocket();

    const { getParticipants } = useGetParticipants({
        signer: nitroliteSnapshot.stateSigner,
        sendRequest,
    });

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    const handleOpenYuzux = useCallback(() => {
        if (!walletSnap.walletAddress && ready) {
            login();
        } else if (
            walletSnap.walletAddress &&
            nitroliteSnapshot.accountInfo &&
            nitroliteSnapshot.userAccountFromParticipants
        ) {
            AppStore.openApp('yuzux');
        } else {
            AppStore.openDeposit();
        }
    }, [nitroliteSnapshot, walletSnap.walletAddress, ready, login]);

    useEffect(() => {
        fetchAssets();
    }, []);

    // Periodically refresh participants data every 2 seconds
    useEffect(() => {
        if (!walletSnap.connected || !isConnected) return;

        const intervalId = setInterval(() => {
            getParticipants();
        }, 10000);

        return () => clearInterval(intervalId);
    }, [walletSnap.connected, isConnected, getParticipants]);

    return (
        <div className="min-h-screen flex flex-col">
            <main className="min-h-screen bg-white text-gray-900 px-4 md:px-8 lg:px-12 pt-4 flex flex-col pb-40">
                <MainHeader />

                <div className="max-w-7xl mx-auto w-full mt-2 md:mt-4 lg:mt-6">
                    <YuzuxSection onOpenYuzux={handleOpenYuzux} />
                </div>

                <div className="max-w-7xl mx-auto w-full mt-6 md:mt-6 lg:mt-6">
                    <AppCatalog />
                </div>
            </main>

            <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />

            <YuzuxAppContainer />

            <MinimizedApps />
        </div>
    );
}

export default function WrappedHomePage() {
    return <HomePage />;
}
