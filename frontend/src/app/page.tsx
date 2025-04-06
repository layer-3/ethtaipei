'use client';

import Head from 'next/head';
import Image from 'next/image';
import { useCallback } from 'react';
import { ConnectButton } from '@/components/clearnet/ConnectButton';
import { useNitroliteClient } from '@/hooks';
import Deposit from '@/components/clearnet/Deposit';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import AppStore from '@/store/AppStore';
import { YuzuxApp } from '@/mini-apps';
import { MinimizedApps } from '@/components/MinimizedApps';

import Privy from '@/providers/privy';
import { MetaMaskConnectButton } from '@/components/clearnet/MetaMaskConnectButton';
import CloseChannel from '@/components/clearnet/CloseChannel';
import NetworkSelector from '@/components/clearnet/NetworkSelector';

const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

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

    const handleOpenCloseChannel = useCallback(() => {
        AppStore.openCloseChannel();
    }, []);

    const handleCloseCloseChannel = useCallback(() => {
        AppStore.closeCloseChannel();
    }, []);

    return (
        <Privy>
            <div className="min-h-screen flex flex-col">
                <Head>
                    <title>Clearnet</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                </Head>

                <main className="min-h-screen bg-white px-4 pt-4 flex flex-col pb-40">
                    <div className="flex gap-4 items-center justify-between flex-wrap">
                        <div className="flex gap-4 items-center">
                            {(walletSnap.connected || walletSnap.privyConnected) && !walletSnap.channelOpen && (
                                <button
                                    onClick={handleOpenDeposit}
                                    className="bg-primary text-black py-2 rounded-md hover:bg-primary-hover px-8 transition-colors font-normal">
                                    Deposit
                                </button>
                            )}
                            {(walletSnap.connected || walletSnap.privyConnected) && walletSnap.channelOpen && (
                                <button
                                    onClick={handleOpenCloseChannel}
                                    className="bg-primary text-black py-2 rounded-md hover:bg-primary-hover px-8 transition-colors font-normal">
                                    Close
                                </button>
                            )}
                            {(walletSnap.connected || walletSnap.privyConnected) && (
                                <NetworkSelector className="ml-2" />
                            )}
                        </div>
                        <div className={walletSnap.connected || walletSnap.privyConnected ? '' : 'ml-auto'}>
                            {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center gap-6 mt-20">
                        <Image src="/logo_yuzux.png" alt="Yuzux" className="w-24 h-24" width={128} height={122} />

                        <div className="text-left bg-gray-100 p-4 rounded-sm w-full max-w-md">
                            <h1 className="text-2xl font-bold mb-2">Yuzux</h1>
                            <p className="text-gray-600 mb-6">
                                Pay Anyone, Anywhere. Instantly fast with no merchant fees. Secured by state channels.
                            </p>
                        </div>

                        <button
                            onClick={handleOpenYuzux}
                            className="w-full bg-primary text-black py-2 rounded-md hover:bg-primary-hover transition-all font-normal transform hover:scale-105 duration-200">
                            Open App
                        </button>
                    </div>

                    <hr className="border-gray-300 mt-4" />

                    <div className="grid grid-cols-2 gap-6 mt-4">
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

                <Deposit isOpen={appSnap.isDepositOpen || false} onClose={handleCloseDeposit} />
                <CloseChannel isOpen={appSnap.isCloseChannelOpen || false} onClose={handleCloseCloseChannel} />

                <div
                    className={`fixed inset-0 bg-black z-40 transform transition-all duration-300 ${
                        appSnap.openApp === 'yuzux' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}>
                    {appSnap.openApp === 'yuzux' && <YuzuxApp />}
                </div>

                <MinimizedApps />
            </div>
        </Privy>
    );
}
