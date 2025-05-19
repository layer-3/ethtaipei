import { JSX, ReactNode } from 'react';

export interface navigationItem {
    name: string;
    href: string;
    icon: JSX.Element;
    sidebar: boolean;
    mobile: boolean;
    bottom?: boolean;
    groupName?: string;
    groupOrder?: number;
}

export interface navigationApp {
    app: string;
    pathnames: navigationAppItem[];
    bottom?: boolean;
}

export interface navigationAppItem {
    name: string;
    fallback: string;
    activeIcon?: JSX.Element;
    defaultIcon: JSX.Element;
    path: string;
    bottom?: boolean;
    submenus?: navigationSubItem[];
    disabled?: boolean;
    skipUseCurrentPath?: boolean;
    newTab?: boolean;
    defaultLocale?: string;
}

export interface navigationSubItem {
    name: string;
    path: string;
}

export interface ButtonProps {
    name: string;
    component?: JSX.Element;
    label?: string;
}

export interface adminButtonProps {
    name: string;
    label: string;
    path: string;
    newTab?: boolean;
}

export interface SidebarProps {
    /**
     * A CSS classes to apply to root element of left navbar
     */
    classNames?: string;
    /**
     * A CSS classes to apply to minimized navigation element
     */
    navMinimizedClassNames?: string;
    /**
     * A CSS classes to apply to overlay navigation element
     */
    navOverlayClassNames?: string;
    /**
     * A CSS classes to apply to navigation element in case if the active path
     */
    navActiveClassNames?: string;
    /**
     * A CSS classes to apply to navigation group element in case if the active path
     */
    navGroupActiveClassNames?: string;
    /**
     * A CSS classes to apply to separator of the navigation group
     */
    navGroupSeparatorClassNames?: string;
    /**
     * A CSS classes to apply to navigation element in case if the inactive path
     */
    navInactiveClassNames?: string;
    /**
     * A CSS classes to apply to submenu of navigation element in case if the active path
     */
    navActiveSubmenuClassNames?: string;
    /**
     * A CSS classes to apply to navigation element whent it`s dissabled
     */
    disabledClassNames?: string;
    /**
     * A CSS classes for mobile bottom navigation menu
     */
    bottomClasses?: string;
    /**
     * Group of navigation URLs
     */
    navigations?: navigationApp[];
    /**
     * Group of navigation URLs for mobile
     */
    mobileNavigation?: navigationApp[];
    /**
     * App name for selecting navigation URLs if u have group navigation to display at bottom of mobile screen
     */
    currentApp?: string;
    /**
     * Site logo
     */
    logo?: JSX.Element;
    /**
     * Link to the page, on which to go on clicking logo
     */
    linkOnLogo?: string;
    /**
     * Is user Logged In
     */
    isLoggedin?: boolean;
    /**
     * buttons list
     */
    buttonsList?: ButtonProps[];
    /**
     * Close icon for navbar overlay
     */
    closeIcon?: JSX.Element;
    /**
     * Show sidebar toggler button in mobile navbar
     */
    showMobileSidebarToggler?: boolean;
    /**
     * CSS classes to apply to mobile navigation item
     */
    mobileNavbarClasses?: string;
    /**
     * CSS classes to apply to mobile navigation item when it is active
     */
    mobileNavbarActiveClasses?: string;
    /**
     * Toggler icon for collapsed navigation
     */
    navOverlayTogglerIcon?: JSX.Element;
    /**
     * A CSS classes to apply to root element of navbar overlay
     */
    navOverlayClasses?: string;
    /**
     * A CSS classes to apply to 'Close' icon
     */
    closeIconClasses?: string;
    /**
     * Label for navigation 'More' icon
     */
    navMoreLabel?: string | ReactNode;
    /**
     * Whether to divide navigation by group titles
     */
    showNavGroupTitles?: string | ReactNode;
    /**
     * Current application theme, could be light or dark
     */
    colorTheme?: string;
    /**
     * Pathes that wouldn`t highlighted as default '/'
     */
    exceptedDefaultActivePathnames?: string[];
    /**
     * Highlighting color of active mobile label
     */
    mobileSpanActiveColor?: string;
    /**
     * Additional link item
     */
    additionalLink?: JSX.Element;
    /**
     * Additional link container classnames
     */
    AdditionalLinkContainerCn?: string;
    /**
     * Classnames for Tooltip component TextWrapperClassname prop
     */
    TooltipTextWrapperClassname?: string;
    /**
     * Classnames for Tooltip component backgroundClassname prop
     */
    tooltipBackgroundClassname?: string;
    /**
     * Classnames for Tooltip component tooltipClassname prop
     */
    tooltipClassname?: string;
    /**
     * Classnames for Tooltip component customArrow prop
     */
    TooltipCustomArrowClassname?: string;
    /**
     * Classnames for Tooltip component boxWrapperClassname prop
     */
    TooltipBoxWrapperClassname?: string;
    /**
     * Is vault layout
     */
    isVault?: boolean;
}
