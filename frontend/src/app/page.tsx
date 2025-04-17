'use client';

import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { AppStore, NitroliteStore, WalletStore } from '@/store';
import Privy from '@/providers/privy';
import { NitroliteClientWrapper } from '@/providers/NitroliteClientWrapper';
import { MinimizedApps, MainHeader, AppCatalog, YuzuxSection, YuzuxAppContainer } from '@/components';
import { Deposit } from '@/components/wallet/clearnet';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { fetchAssets } from '@/store/AssetsStore';
import { usePrivy } from '@privy-io/react-auth';

function HomePage() {
    const appSnap = useSnapshot(AppStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    const WalletSnap = useSnapshot(WalletStore.state);
    const { login, ready } = usePrivy();

    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    const handleOpenYuzux = useCallback(() => {
        if (!WalletSnap.walletAddress && ready) {
            login();
        } else if (
            WalletSnap.walletAddress &&
            nitroliteSnapshot.accountInfo &&
            nitroliteSnapshot.userAccountFromParticipants
        ) {
            AppStore.openApp('yuzux');
        } else {
            AppStore.openDeposit();
        }
    }, [nitroliteSnapshot]);

    const handleOpenCloseChannel = useCallback(() => {
        AppStore.openCloseChannel();
    }, []);

    useEffect(() => {
        fetchAssets();
    }, []);

    return (
        <WebSocketProvider>
            <div className="min-h-screen flex flex-col">
                <NitroliteClientWrapper>
                    <main className="min-h-screen bg-white text-gray-900 px-4 md:px-8 lg:px-12 pt-4 flex flex-col pb-40">
                        <MainHeader onOpenDeposit={handleOpenDeposit} onOpenCloseChannel={handleOpenCloseChannel} />

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
                </NitroliteClientWrapper>
            </div>
        </WebSocketProvider>
    );
}

export default function WrappedHomePage() {
    return (
        <Privy>
            <HomePage />
        </Privy>
    );
}
