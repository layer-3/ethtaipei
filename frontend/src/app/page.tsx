'use client';

import Head from 'next/head';
import Image from 'next/image';
import { MetaMaskConnectButton } from '@/components/clearnet/MetaMaskConnectButton';
import { useNitroliteClient } from '@/hooks';
import { useCallback, useState } from 'react';
import Deposit from '@/components/clearnet/Deposit';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';

export default function Connect() {
    useNitroliteClient();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const walletSnap = useSnapshot(WalletStore.state);

    const handleOpenDeposit = useCallback(() => {
        setIsDepositOpen(true);
    }, []);

    const handleCloseDeposit = useCallback(() => {
        setIsDepositOpen(false);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Head>
                <title>Connect Wallet</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <main className="min-h-screen bg-white px-4 pt-4 flex flex-col justify-between pb-40">
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

                    <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">
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
            <Deposit isOpen={isDepositOpen} onClose={handleCloseDeposit} />
        </div>
    );
}