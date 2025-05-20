'use client';

import { AppCatalog, MinimizedApps, YuzuxAppContainer } from '@/components';
import { YellowPayCard } from '@/components/apps/YellowPayCard';
import { Deposit } from '@/components/wallet/clearnet';
import { useGetLedgerChannels } from '@/hooks/channel/useGetChannels';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';
import { useWebSocket } from '@/hooks/websocket';
import { AppStore, NitroliteStore, WalletStore } from '@/store';
import { fetchAssets } from '@/store/AssetsStore';
import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import { useCallback, useEffect } from 'react';
import { useSnapshot } from 'valtio';

const LayoutWidget = dynamic(() => import('@/widgets/LayoutWidget').then((mod) => mod.LayoutWidget), { ssr: true });

export default function HomeClient() {
    const appSnap = useSnapshot(AppStore.state);
    const nitroliteSnapshot = useSnapshot(NitroliteStore.state);
    const walletSnap = useSnapshot(WalletStore.state);
    const { login, ready } = usePrivy();

    const { isConnected, sendRequest } = useWebSocket();

    const { getParticipants } = useGetParticipants({
        signer: nitroliteSnapshot.stateSigner,
        sendRequest,
    });

    const { getLedgerChannels } = useGetLedgerChannels({
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

    useEffect(() => {
        if (!walletSnap.connected || !isConnected) return;

        if (!nitroliteSnapshot.ledgerChannels.length) {
            getLedgerChannels();
        }
    }, [walletSnap.connected, isConnected, getLedgerChannels]);

    return (
        <div className="min-h-screen">
            <LayoutWidget>
                <main className="h-full relative bg-main-background-color text-text-color-100 px-4 md:px-8 lg:px-12 pt-4 flex flex-col pb-40">
                    <div className="max-w-full 3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] mx-auto w-full mt-2 md:mt-4 lg:mt-6">
                        <YellowPayCard onOpenYuzux={handleOpenYuzux} />
                    </div>

                    <div className="max-w-full 3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] mx-auto w-full  mt-20 md:mt-6">
                        <AppCatalog />
                    </div>
                </main>

                <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />

                <YuzuxAppContainer />

                <MinimizedApps />
            </LayoutWidget>
        </div>
    );
}
