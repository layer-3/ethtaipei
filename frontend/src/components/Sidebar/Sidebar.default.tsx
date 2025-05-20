import { SidebarIcons } from '@/assets/images/SidebarIcons';
import { buttonsList, navigationMobile, navigations } from './Sidebar.constants';
import { ButtonProps, navigationApp } from './types';
import { JSX } from 'react';

export const DEFAULT_NAVIGATIONS: navigationApp[] = navigations;
export const DEFAULT_MOBILE_NAVIGATIONS: navigationApp[] = navigationMobile;

export const DEFAULT_NAV_OVERLAY_TOGGLER_ICON: JSX.Element = (
    <SidebarIcons
        name="menu"
        className="neutral-control-layer-color-40 flex-shrink-0 w-6 h-6"
        primaryColor="var(--neutral-control-layer-color-40)"
    />
);

export const DEFAULT_NAV_OVERLAY_CLASSES =
    'relative bg-navbar-background-color flex-1 flex flex-col max-w-[260px] pt-5 pb-4 bg-white';

export const DEFAULT_BOTTOM_BAR_CLASSES =
    'fixed w-screen bottom-0 z-10 flex-shrink-0 flex h-16 bg-white border-t border-gray-200 w-full left-0';

export const DEFAULT_BUTTONS_LIST: ButtonProps[] = buttonsList;
