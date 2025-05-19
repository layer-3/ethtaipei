import {
    BanknotesIcon as CashIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon as ClipboardListIcon,
    HomeIcon,
    ShoppingBagIcon,
    ArrowsRightLeftIcon as SwitchHorizontalIcon,
    RectangleGroupIcon as TemplateIcon,
    XMarkIcon as XIcon,
} from '@heroicons/react/24/solid';
import { navigationApp } from './types';
import Image from 'next/image';

export const navigations: navigationApp[] = [
    {
        app: 'Yellow List',
        pathnames: [
            {
                name: 'Home',
                fallback: 'Home',
                activeIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                defaultIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                path: '/',
            },
        ],
    },
    {
        app: 'Trade',
        pathnames: [
            {
                name: 'Trade',
                fallback: 'Trade',
                activeIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                defaultIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/trade',
            },
        ],
    },
    {
        app: 'Defi',
        pathnames: [
            {
                name: 'Smart Contract',
                fallback: 'Smart Contract',
                activeIcon: (
                    <ClipboardListIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                defaultIcon: (
                    <ClipboardListIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/smart-contract',
            },
        ],
    },
];

export const groupNavigations: navigationApp[] = [
    {
        app: 'Yellow List',
        pathnames: [
            {
                name: 'Home',
                fallback: 'Home',
                activeIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                defaultIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                path: '/',
            },
            {
                name: 'Markets',
                fallback: 'Markets',
                activeIcon: (
                    <ShoppingBagIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                defaultIcon: (
                    <ShoppingBagIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/markets',
            },
        ],
    },
    {
        app: 'Trade',
        pathnames: [
            {
                name: 'Trade',
                fallback: 'Trade',
                defaultIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/trade',
            },
            {
                name: 'Orders',
                fallback: 'Orders',
                defaultIcon: (
                    <CashIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <CashIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/orders',
                submenus: [
                    { name: 'All', path: '/orders/all' },
                    { name: 'Open', path: '/orders/open' },
                ],
            },
            {
                name: 'Wallets',
                fallback: 'Wallets',
                defaultIcon: (
                    <CashIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <CashIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/wallets',
            },
            {
                name: 'Dashboard',
                fallback: 'Dashboard',
                defaultIcon: (
                    <TemplateIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <TemplateIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/dashboard',
            },
        ],
    },
    {
        app: 'Defi',
        pathnames: [
            {
                name: 'Swap',
                fallback: 'Swap',
                defaultIcon: (
                    <SwitchHorizontalIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <SwitchHorizontalIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/swap',
            },
            {
                name: 'Smart Contract',
                fallback: 'Smart Contract',
                defaultIcon: (
                    <ClipboardListIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                activeIcon: (
                    <ClipboardListIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/smart-contract',
            },
        ],
    },
];

export const defaultLogo = (theme: string) => (
    <div className="ml-2 h-7 w-auto relative">
        <Image src={theme === 'dark' ? '/images/logo-dark-mode.svg' : '/images/logo-white-mode.svg'} alt="App" fill />
    </div>
);

export const closeIcon = <XIcon className="h-6 w-6 text-navbar-control-layer-color-60" aria-hidden="true" />;

export const buttonsList = [{ name: 'Login' }, { name: 'Metamask' }];

export const navigationMobile = [
    {
        app: 'mainapp',
        pathnames: [
            {
                name: 'Home',
                fallback: 'Home',
                activeIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                defaultIcon: <HomeIcon className="text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />,
                path: '/',
            },
            {
                name: 'Trade',
                fallback: 'Trade',
                activeIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                defaultIcon: (
                    <ChartBarIcon className="text-neutral-control-layer-color-40 group-hover:text-neutral-control-layer-color-60 flex-shrink-0 h-6 w-6" />
                ),
                path: '/trade',
            },
        ],
    },
];
