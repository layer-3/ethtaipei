import { YellowLogo } from '@/assets/images/VaultLogo';
import { HeaderProps } from '@/components/Header';
import { SidebarProps, navigationApp, navigationAppItem } from '@/components/Sidebar/types';
import { navigation, navigationYellow, navigationMobile, navigationPro, navigationVault } from '@/config/navigation';
import { isBrowser } from '@/helpers/isBrowser';
import classNames from 'classnames';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import React, { JSX, PropsWithChildren, useEffect, useMemo } from 'react';
import { Layout as SharedLayout } from './SimpleLayout';
import { LayoutProps } from './types';

const Header = dynamic(() => import('@/widgets/Header')?.then((mod) => mod.Header), { ssr: true });
const CustomFooter = dynamic(() => import('@/components/CustomFooter')?.then((mod) => mod.CustomFooter), {
    ssr: true,
});

function AppLayout({
    className,
    headerOptions,
    hideFooter,
    hideHeader,
    children,
    vaultHeaderProps,
    isVaultLayout = false,
}: PropsWithChildren<LayoutProps>): JSX.Element {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 1);
        }
    }, [pathname]);

    useEffect(() => {
        if (isBrowser()) {
            const element = document.querySelector('a[aria-label="Trade"]');
            const elementWallet = document.querySelector('a[aria-label="Wallet"]');

            if (element && elementWallet) {
                element.className =
                    'no-underline group flex items-center mt-1 px-2 py-2 text-xs font-metro-semibold rounded-md text-neutral-control-layer-color-60 hover:bg-navbar-control-bg-color-10 flex-col';
                elementWallet.className =
                    'no-underline group flex items-center mt-1 px-2 py-2 text-xs font-metro-semibold rounded-md text-neutral-control-layer-color-60 hover:bg-navbar-control-bg-color-10 flex-col';
            }
        }
    }, []);

    const navigations = useMemo((): navigationApp[] => {
        return [
            {
                app: '',
                pathnames: navigationYellow.map<navigationAppItem>((nav: navigationAppItem) => {
                    return {
                        ...nav,
                        name: nav.name,
                        path: nav.path,
                        skipUseCurrentPath: true,
                    };
                }),
            },
            {
                app: 'Vault',
                pathnames: navigationVault
                    .filter((nav: navigationAppItem) => !nav.bottom)
                    .map<navigationAppItem>((nav: navigationAppItem) => {
                        if (nav.submenus?.length) {
                            return {
                                ...nav,
                                name: nav.name,
                                submenus: nav.submenus.map((submenu: any) => {
                                    return {
                                        ...submenu,
                                        name: submenu.name,
                                    };
                                }),
                                skipUseCurrentPath: true,
                            };
                        }

                        return {
                            ...nav,
                            name: nav.name,
                            path: nav.path,
                            skipUseCurrentPath: true,
                        };
                    }),
            },
            {
                app: 'Pro',
                pathnames: navigationPro
                    .filter((nav: navigationAppItem) => !nav.bottom)
                    .map<navigationAppItem>((nav: navigationAppItem) => {
                        if (nav.submenus?.length) {
                            return {
                                ...nav,
                                name: nav.name,
                                submenus: nav.submenus.map((submenu: any) => {
                                    return {
                                        ...submenu,
                                        name: submenu.name,
                                    };
                                }),
                                skipUseCurrentPath: true,
                            };
                        }

                        return {
                            ...nav,
                            name: nav.name,
                            path: nav.path,
                            skipUseCurrentPath: true,
                        };
                    }),
            },
            {
                app: 'settings',
                pathnames: navigation
                    .filter((nav: navigationAppItem) => nav.bottom)
                    .map<navigationAppItem>((nav: navigationAppItem) => {
                        return {
                            ...nav,
                            name: nav.name,
                            path: nav.path,
                            skipUseCurrentPath: true,
                        };
                    }),
                bottom: true,
            },
        ];
    }, []);

    const mobileNavigation = useMemo((): navigationApp[] => {
        if (!navigationMobile) return [];

        return [
            {
                app: 'mainapp',
                pathnames: navigationMobile.map<navigationAppItem>((nav: navigationAppItem) => {
                    if (nav.submenus?.length) {
                        return {
                            ...nav,
                            name: nav.name,
                            submenus: nav.submenus.map((submenu: any) => {
                                return {
                                    ...submenu,
                                    name: submenu.name,
                                };
                            }),
                        };
                    }

                    return {
                        ...nav,
                        name: nav.name,
                        path: nav.path,
                    };
                }),
            },
        ];
    }, []);

    const yellowLogo = useMemo(() => {
        return (
            <YellowLogo classNames="max-sm:w-20 max-lg:w-24 focus:outline-none focus:ring-none text-neutral-control-layer-color-100" />
        );
    }, []);

    const sidebarProps: SidebarProps = useMemo(() => {
        return {
            currentApp: 'mainapp',
            isVault: isVaultLayout,
            navigations,
            mobileNavigation: mobileNavigation,
            classNames: 'bg-navbar-background-color sm:border-r border-divider-color-20 fixed z-[30] with-scrollbar',
            bottomClasses:
                'fixed w-screen bottom-0 z-30 flex-shrink-0 md:hidden flex h-[64px] bg-navbar-background-color border-t border-divider-color-20 w-full left-0',
            navActiveClassNames: 'bg-navbar-control-bg-color-10 text-navbar-control-layer-color-60',
            navInactiveClassNames: 'text-neutral-control-layer-color-60 hover:bg-navbar-control-bg-color-10',
            navOverlayClasses: 'relative bg-navbar-background-color flex-1 flex flex-col max-w-[260px] pt-5 pb-4',
            navOverlayClassNames:
                'relative no-underline duration-150 group flex items-center mt-1 px-2 py-2 text-md font-metro-bold rounded-md',
            navMinimizedClassNames:
                'no-underline group flex items-center mt-1 px-2 py-2 text-xs font-metro-semibold rounded-md',
            isLoggedin: false,
            logo: yellowLogo,
            linkOnLogo: '/',
            showMobileSidebarToggler: true,
            mobileNavbarClasses: 'text-sm font-metro-semibold text-neutral-control-layer-color-50 mx-2.5 my-1 rounded',
            mobileNavbarActiveClasses: 'bg-navbar-control-bg-color-10',
            mobileSpanActiveColor: 'text-navbar-control-layer-color-60',
            showNavGroupTitles: true,
            navMoreLabel: 'More',
            exceptedDefaultActivePathnames: [
                '/404',
                '/trading',
                '/assets',
                '/news',
                '/learn',
                '/research',
                '/articles',
                '/settings',
                '/balances',
                '/seasons',
                '/win',
                '/vault',
                '/quests',
                '/leaderboard',
                '/applications',
            ],
        };
    }, [navigations, mobileNavigation, yellowLogo, isVaultLayout]);

    const customHeaderProps = useMemo(() => {
        let headerProps: HeaderProps = {
            headerLogoIcon: yellowLogo,
        };

        if (headerOptions) {
            headerProps = {
                ...headerProps,
                options: headerOptions,
            };
        }
        return headerProps;
    }, [headerOptions, yellowLogo]);

    const renderLayout = useMemo(() => {
        return (
            <SharedLayout
                containerClassName={classNames(className, {
                    'flex mt-0 flex-col mb-28 mx-auto max-md:px-0 max-xl:px-2 w-full 3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] xl:justify-center':
                        isVaultLayout,
                })}
                sidebarProps={sidebarProps}
                customHeader={
                    hideHeader ? null : (
                        <Header
                            {...vaultHeaderProps}
                            {...customHeaderProps}
                            isVaultLayout={isVaultLayout}
                            actionButtonLabel="Login"
                        />
                    )
                }
                customFooter={hideFooter ? null : <CustomFooter isVaultLayout={isVaultLayout} />}
                mainClassName="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden focus:outline-none md:ml-20">
                {children}
            </SharedLayout>
        );
    }, [hideHeader, vaultHeaderProps, customHeaderProps, sidebarProps, isVaultLayout, children, hideFooter, className]);

    return renderLayout;
}

export const Layout = React.memo(AppLayout);
