'use client';

import Privy from '@/providers/privy';
import { NitroliteClientWrapper } from '@/providers/NitroliteClientWrapper';
import { DebugInterface } from '@/components/debug/DebugInterface';
import { WebSocketProvider } from '@/context/WebSocketContext';

export default function Debug() {
    return (
        <Privy>
            <WebSocketProvider>
                <div className="min-h-screen flex flex-col">
                    <NitroliteClientWrapper>
                        <main className="min-h-screen bg-gray-50 px-4 pt-4 flex flex-col pb-40">
                            <h1 className="text-3xl font-bold mb-6 text-center">Debug Console</h1>
                            <DebugInterface />
                        </main>
                    </NitroliteClientWrapper>
                </div>
            </WebSocketProvider>
        </Privy>
    );
}
