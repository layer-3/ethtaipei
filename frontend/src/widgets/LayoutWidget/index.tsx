'use client';

import { Layout } from '@/components/layout';
import { WalletStore } from '@/store';
import { AppError, ErrorTypes } from '@/utils/errors/AppError';
import { usePrivy } from '@privy-io/react-auth';
import { captureException } from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import React, { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { HeaderOptions, IHeaderProps } from '../Header';

interface ILayoutWidgetProps {
    children: React.ReactNode;
    containerClassName?: string;
    headerOptions?: HeaderOptions;
    hideFooter?: boolean;
    hideHeader?: boolean;
    isVaultLayout?: boolean;
    hideHeaderBorder?: boolean;
}

export const LayoutWidget: FC<ILayoutWidgetProps> = ({
    children,
    containerClassName,
    hideFooter,
    headerOptions,
    hideHeader,
    isVaultLayout,
    hideHeaderBorder,
}) => {
    const { walletAddress } = useSnapshot(WalletStore.state);
    const router = useRouter();
    const { login, isModalOpen, logout } = usePrivy();

    const [accountLoading, setAccountLoading] = useState<boolean>(false);

    useEffect(() => {
        setAccountLoading(isModalOpen);
    }, [isModalOpen]);

    const onLogOut = useCallback(async () => {
        await logout();
        setAccountLoading(false);
        router.push('/');
    }, [logout, router]);

    const handleLogin = useCallback(async () => {
        try {
            setAccountLoading(true);
            login();
        } catch (error) {
            const authError = new AppError(ErrorTypes.Auth, '[AUTH] Error while authorization', {
                originalError: error,
            });

            console.log(authError);
            captureException(authError);
            setAccountLoading(false);
        }
    }, [login, setAccountLoading]);

    const headerProps: IHeaderProps = useMemo(
        () => ({
            onLogOut: onLogOut,
            connect: handleLogin,
            loading: accountLoading,
            accountAddress: walletAddress,
            hideBorder: hideHeaderBorder,
        }),
        [onLogOut, handleLogin, accountLoading, walletAddress, hideHeaderBorder],
    );

    return (
        <Layout
            vaultHeaderProps={headerProps}
            className={containerClassName}
            headerOptions={headerOptions}
            hideFooter={hideFooter}
            hideHeader={hideHeader}
            isVaultLayout={isVaultLayout}>
            {children}
        </Layout>
    );
};

export default memo(LayoutWidget);
