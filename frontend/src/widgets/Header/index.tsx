'use client';

import { Spinner } from '@/assets/images/Spinner';
import { YellowLogo } from '@/assets/images/VaultLogo';
import { useSetMobileDevice } from '@/hooks/useMobileDevice';
import classNames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC, JSX, memo, ReactNode, useCallback, useMemo, useRef } from 'react';
import { RenderAccountWithVault } from './helpers/RenderAccountWithVault';

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

    const mobileDevice = useMemo(
        () => (isMobile === undefined ? options?.responseIsMobile : !!isMobile),
        [isMobile, options?.responseIsMobile],
    );

    const logoClickHandler = useCallback(() => {
        pathname === '/' ? window?.scrollTo({ top: 0, behavior: 'smooth' }) : null;
    }, [pathname]);

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
                    'flex items-center justify-between md:w-[calc(100%-80px)] w-full border-divider-color-20 px-4 md:px-6 sticky top-0 md:py-[0.34rem] md:cr-header z-20 bg-body-background-color h-[60px] gap-3':
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
                    <Link
                        href="https://yellow.com/"
                        className="h-11 w-32"
                        aria-label="Home page"
                        onClick={logoClickHandler}>
                        <div className="cursor-pointer block">
                            {headerLogoIcon || (
                                <YellowLogo classNames="w-[106px] focus:outline-none focus:ring-none text-neutral-control-layer-color-100" />
                            )}
                        </div>
                    </Link>
                )}
                {mobileDevice && renderAccountButton}
            </div>
            {!mobileDevice && (
                <div className="flex items-center justify-center md:order-2 max-xl:hidden w-fit min-w-fit">
                    {renderAccountButton}
                </div>
            )}
        </header>
    );
};

export const Header = memo(HeaderWidget);
