'use client';

import { ReactNode } from 'react';
import Privy from '@/providers/privy';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { NotificationInitializer } from '@/components/ui/NotificationInitializer';
import { NitroliteClientWrapper } from './NitroliteClientWrapper';

interface ClientProvidersProps {
    children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
    return (
        <Privy>
            <WebSocketProvider>
                <NitroliteClientWrapper>
                    <NotificationInitializer />
                    {children}
                </NitroliteClientWrapper>
            </WebSocketProvider>
        </Privy>
    );
}
