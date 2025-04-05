import { chains } from '@/config/chains';
import React, { FC } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { usePathname } from 'next/navigation';

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
                    createOnLogin: 'all-users',
                    showWalletUIs: true,
                },
                legal: {
                    termsAndConditionsUrl: 'https://clearnet.com/terms_of_service',
                    privacyPolicyUrl: 'https://clearnet.com/privacy_policy',
                },
                supportedChains: chains,
            }}>
            {children}
        </PrivyProvider>
    );
};

export default Privy;
