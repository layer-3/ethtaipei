'use client';

import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { AppStore } from '@/store';
import Privy from '@/providers/privy';
import { NitroliteClientWrapper } from '@/providers/NitroliteClientWrapper';
import { MinimizedApps, MainHeader, AppCatalog, YuzuxSection, YuzuxAppContainer } from '@/components';
import { Deposit } from '@/components/wallet/clearnet';

export default function HomePage() {
    const appSnap = useSnapshot(AppStore.state);

    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    const handleOpenYuzux = useCallback(() => {
        AppStore.openApp('yuzux');
    }, []);

    const handleOpenCloseChannel = useCallback(() => {
        AppStore.openCloseChannel();
    }, []);

    // const handleCloseChannel = useCallback(() => {
    //     AppStore.closeCloseChannel();
    // }, []);

    return (
        <Privy>
            <div className="min-h-screen flex flex-col">
                <NitroliteClientWrapper>
                    <main className="min-h-screen bg-white px-4 pt-4 flex flex-col pb-40">
                        <MainHeader onOpenDeposit={handleOpenDeposit} onOpenCloseChannel={handleOpenCloseChannel} />

                        <YuzuxSection onOpenYuzux={handleOpenYuzux} />

                        <hr className="border-gray-300 mt-8" />

                        <AppCatalog />
                    </main>

                    <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
                    {/* <CloseChannel isOpen={appSnap.isCloseChannelOpen || false} onClose={handleCloseCloseChannel} /> */}

                    <YuzuxAppContainer />

                    <MinimizedApps />
                </NitroliteClientWrapper>
            </div>
        </Privy>
    );
}
