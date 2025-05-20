'use client';

import { chains } from '@/config/chains';
import React, { FC } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Import PrivyProvider dynamically with ssr disabled to avoid HTMLElement not defined error
const PrivyProvider = dynamic(
    () => import('@privy-io/react-auth').then((mod) => mod.PrivyProvider),
    { ssr: false }
);

interface IPrivyProps {
    children: React.ReactNode;
}

const Privy: FC<IPrivyProps> = ({ children }) => {
    const pathname = usePathname();

    const loginMethods: Array<
        | 'wallet'
        | 'email'
        | 'sms'
        | 'google'
        | 'twitter'
        | 'discord'
        | 'github'
        | 'linkedin'
        | 'spotify'
        | 'instagram'
        | 'tiktok'
        | 'apple'
        | 'farcaster'
        | 'telegram'
    > = pathname === '/join' ? ['email', 'google'] : ['email', 'wallet', 'google', 'discord', 'telegram', 'twitter'];

    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ''}
            config={{
                captchaEnabled: true,
                loginMethods: loginMethods,
                appearance: {
                    theme: 'light',
                },
                embeddedWallets: {
                    createOnLogin: 'users-without-wallets',
                    showWalletUIs: true,
                },
                legal: {
                    termsAndConditionsUrl: 'https://yellow.com/terms_of_service',
                    privacyPolicyUrl: 'https://yellow.com/privacy_policy',
                },
                supportedChains: chains,
            }}>
            {children}
        </PrivyProvider>
    );
};

export default Privy;
