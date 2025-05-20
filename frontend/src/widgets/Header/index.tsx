'use client';

import { Spinner } from '@/assets/images/Spinner';
import { YellowLogo } from '@/assets/images/VaultLogo';
import { useSetMobileDevice } from '@/hooks/useMobileDevice';
import classNames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC, JSX, memo, ReactNode, useCallback, useMemo } from 'react';
import { RenderAccountWithVault } from './helpers/RenderAccountWithVault';
import { useSnapshot } from 'valtio';
import { NitroliteStore, SettingsStore, WalletStore } from '@/store';
import APP_CONFIG from '@/config/app';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import { ProfileIcon } from '@/assets/images/ProfileIcon';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';

interface NavItem {
    name: string | ReactNode;
    href: string;
}

export interface HeaderOptions {
    navigations?: NavItem[];
    customHeaderContent?: React.ReactNode;
    responseIsMobile?: boolean;
}

export interface IHeaderProps {
    options?: HeaderOptions;
    headerLogoIcon?: JSX.Element;
    accountAddress?: string;
    loading?: boolean;
    connect?: () => Promise<void>;
    onLogOut?: () => void;
    isVaultLayout?: boolean;
    actionButtonLabel?: string;
    hideBorder?: boolean;
}

const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

const HeaderWidget: FC<IHeaderProps> = ({
    options,
    loading,
    connect,
    onLogOut,
    hideBorder,
    isVaultLayout,
    headerLogoIcon,
    accountAddress,
    actionButtonLabel,
}: IHeaderProps) => {
    const pathname = usePathname();
    const isMobile = useSetMobileDevice(false, 1025);

    const walletSnap = useSnapshot(WalletStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);

    const formattedBalance = useMemo(() => {
        if (!nitroSnap.userAccountFromParticipants || !settingsSnap.activeChain?.id) {
            return '0';
        }

        const chainId = settingsSnap.activeChain.id;
        const tokenAddress = APP_CONFIG.TOKENS[chainId];

        if (!tokenAddress) return '0';

        // Get the user's channel balance
        return formatTokenUnits(tokenAddress, nitroSnap.userAccountFromParticipants.amount);
    }, [
        nitroSnap.userAccountFromParticipants,
        nitroSnap?.userAccountFromParticipants?.amount,
        settingsSnap.activeChain?.id,
    ]);

    const mobileDevice = useMemo(
        () => (isMobile === undefined ? options?.responseIsMobile : !!isMobile),
        [isMobile, options?.responseIsMobile],
    );

    const logoClickHandler = useCallback(() => {
        pathname === '/' ? window?.scrollTo({ top: 0, behavior: 'smooth' }) : null;
    }, [pathname]);

    const renderYuzuxAccountButton = useMemo(() => {
        return !walletSnap.connected || pathname === '/account' ? (
            // Not connected - show Account button that triggers wallet connect
            isPrivyEnabled ? (
                <ConnectButton />
            ) : (
                <MetaMaskConnectButton />
            )
        ) : (
            // Connected - show Account button that links to account page
            <Link href="/account" className="group">
                <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-neutral-control-color-0 rounded-[2px] hover:bg-neutral-control-color-10 transition-colors">
                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-neutral-control-color-30 flex items-center justify-center overflow-hidden">
                        <ProfileIcon />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-text-color-90 font-metro-medium">Account</span>
                        <span className="text-xs font-metro-regular text-text-color-60 group-hover:text-text-color-90 transition-colors">
                            Balance: ${formattedBalance}
                        </span>
                    </div>
                </div>
            </Link>
        );
    }, [formattedBalance, walletSnap.connected, isPrivyEnabled, pathname]);

    // Will be used for the header content in the feature
    // eslint-disable-next-line
    const renderAccountButton = useMemo(() => {
        if (!onLogOut) {
            return null;
        }

        if (!accountAddress) {
            return (
                <div className="flex items-center justify-center md:order-2">
                    <button className="button button--main h-7 sm:h-8 lg:h-9 cursor-pointer" onClick={connect}>
                        <span className="button__inner font-metro-bold h-7 sm:h-8 lg:h-9">
                            {loading ? <Spinner /> : !isVaultLayout ? actionButtonLabel : 'page_header_button_login'}
                        </span>
                    </button>
                </div>
            );
        }

        return <RenderAccountWithVault accountAddress={accountAddress} onLogOut={onLogOut} />;
    }, [accountAddress, connect, loading, onLogOut, isVaultLayout, actionButtonLabel]);

    return (
        <header
            className={classNames(
                {
                    'flex items-center justify-between md:w-[calc(100%-80px)] w-full border-divider-color-20 px-4 md:px-6 sticky top-0 md:py-[0.34rem] md:cr-header z-20 bg-body-background-color h-[60px] min-h-[60px] gap-3':
                        !mobileDevice,
                    'border-b': !hideBorder,
                },
                'md:ml-[80px] relative',
            )}>
            <div
                className={classNames(
                    'leading-8 flex max-xl:justify-between xl:flex-grow items-center md:px-6 max-xl:pt-4 xl:px-0 lg:pb-0',
                    isVaultLayout ? 'max-md:px-4' : 'max-md:px-[18px]',
                )}>
                {((mobileDevice && !accountAddress) || !mobileDevice) && (
                    <Link href="/" className="h-11 w-32" aria-label="Home page" onClick={logoClickHandler}>
                        <div className="cursor-pointer block">
                            {headerLogoIcon || (
                                <YellowLogo classNames="w-[106px] focus:outline-none focus:ring-none text-neutral-control-layer-color-100" />
                            )}
                        </div>
                    </Link>
                )}
                {mobileDevice && renderYuzuxAccountButton}
            </div>
            {!mobileDevice && (
                <div className="flex items-center justify-center md:order-2 max-xl:hidden w-fit min-w-fit">
                    {renderYuzuxAccountButton}
                </div>
            )}
        </header>
    );
};

export const Header = memo(HeaderWidget);
