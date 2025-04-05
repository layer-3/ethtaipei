'use client';

import Head from 'next/head';
import Image from 'next/image';
import { MetaMaskConnectButton } from '@/components/clearnet/MetaMaskConnectButton';
import { useNitroliteClient } from '@/hooks';
import { useCallback } from 'react';
import Deposit from '@/components/clearnet/Deposit';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import AppStore from '@/store/AppStore';
import { YuzuxApp } from '@/mini-apps';
import { MinimizedApps } from '@/components/MinimizedApps';

export default function Connect() {
    useNitroliteClient();
    const walletSnap = useSnapshot(WalletStore.state);
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

    return (
        <div className="min-h-screen flex flex-col">
            <Head>
                <title>Connect Wallet</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <main className="min-h-screen bg-white px-4 pt-4 flex flex-col justify-between pb-4">
                <div className="flex gap-4 items-center justify-between">
                    {walletSnap.connected && (
                        <button
                            onClick={handleOpenDeposit}
                            className="bg-blue-600 text-white px-8 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                            Deposit
                        </button>
                    )}
                    <div className={walletSnap.connected ? '' : 'ml-auto'}>
                        <MetaMaskConnectButton />
                    </div>
                </div>

                <div className="flex flex-col justify-center items-center gap-4">
                    <Image src="/yuzux.svg" alt="Yuzux" className="w-24 h-24" width={128} height={122} />

                    <div className="text-center bg-gray-50">
                        <h1 className="text-2xl font-bold mb-2">Yuzux</h1>
                        <p className="text-gray-600 mb-6">
                            Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.
                        </p>
                    </div>

                    <button 
                        onClick={handleOpenYuzux}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all transform hover:scale-105 duration-200">
                        Open App
                    </button>
                </div>

                <hr />

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="bg-black rounded-2xl aspect-square p-4 flex items-center justify-center">
                            <div className="text-center">
                                <Image src="/snake-game.png" alt="Snake Game" width={128} height={128} />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-semibold text-gray-700">Snake Game</h3>
                            <span className="text-gray-500 text-sm">Arcade/Action</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="bg-black rounded-2xl aspect-square p-4 flex items-center justify-center">
                            <div className="text-center">
                                <Image src="/ping-pong.png" alt="Ping-Pong" width={128} height={128} />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-semibold text-gray-700">Ping-Pong</h3>
                            <span className="text-gray-500 text-sm">Arcade/Action</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Deposit component slides in from right */}
            <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
            
            {/* Yuzux fullscreen component */}
            {appSnap.openApp === 'yuzux' && <YuzuxApp />}
            
            {/* Minimized apps taskbar */}
            <MinimizedApps />
        </div>
    );
}