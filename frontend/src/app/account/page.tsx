'use client';

import Privy from '@/providers/privy';
import { NitroliteClientWrapper } from '@/providers/NitroliteClientWrapper';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { AccountInterface } from '@/components/account/AccountInterface';

export default function AccountPage() {
    return (
        <Privy>
            <WebSocketProvider>
                <div className="min-h-screen flex flex-col">
                    <NitroliteClientWrapper>
                        <main className="min-h-screen bg-white flex flex-col pb-40">
                            <AccountInterface />
                        </main>
                    </NitroliteClientWrapper>
                </div>
            </WebSocketProvider>
        </Privy>
    );
}
