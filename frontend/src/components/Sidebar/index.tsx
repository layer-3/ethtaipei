import { closeIcon as defaultCloseIcon, defaultLogo } from '@/components/Sidebar/Sidebar.constants';
import {
    DEFAULT_BOTTOM_BAR_CLASSES,
    DEFAULT_NAVIGATIONS,
    DEFAULT_NAV_OVERLAY_CLASSES,
    DEFAULT_NAV_OVERLAY_TOGGLER_ICON,
} from '@/components/Sidebar/Sidebar.default';
import { SidebarProps, navigationAppItem } from '@/components/Sidebar/types';
import { useSetMobileDevice } from '@/hooks/useMobileDevice';
import { Dialog, DialogBackdrop, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import classnames from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Primary UI component for user interaction
 */
const SidebarComponent = ({
    classNames,
    bottomClasses = DEFAULT_BOTTOM_BAR_CLASSES,
    navigations = DEFAULT_NAVIGATIONS,
    mobileNavigation,
    currentApp = DEFAULT_NAVIGATIONS[0].app,
    linkOnLogo = '/trading',
    logo,
    navMinimizedClassNames = 'no-underline duration-150 group flex items-center mt-0.5 px-2 py-2 text-xs font-semibold rounded-md',
    navOverlayClassNames = 'relative no-underline duration-150 group flex items-center mt-0.5 px-2 py-2 text-md font-bold rounded-md',
    navActiveClassNames = 'bg-indigo-50 text-indigo-600',
    navGroupSeparatorClassNames = 'w-10 mx-auto my-2',
    navGroupActiveClassNames = 'bg-navbar-control-bg-color-10 rounded-lg',
    navActiveSubmenuClassNames = 'text-navbar-control-layer-color-60 before:w-0.5 before:bg-primary-cta-color-60 before:rounded-lg before:h-5 before:absolute before:left-0',
    navInactiveClassNames = 'text-gray-500',
    disabledClassNames = 'opacity-20 cursor-default',
    closeIcon = defaultCloseIcon,
    showMobileSidebarToggler,
    mobileNavbarClasses = 'text-gray-600 hover:bg-navbar-control-bg-color-10 hover:text-gray-900 text-sm font-medium',
    mobileNavbarActiveClasses = 'pointer-events-none bg-navbar-control-bg-color-10',
    navOverlayTogglerIcon = DEFAULT_NAV_OVERLAY_TOGGLER_ICON,
    navOverlayClasses = DEFAULT_NAV_OVERLAY_CLASSES,
    closeIconClasses = 'flex justify-center w-8 h-8 bg-navbar-control-bg-color-10',
    navMoreLabel,
    showNavGroupTitles,
    colorTheme,
    exceptedDefaultActivePathnames,
    mobileSpanActiveColor = 'text-primary-cta-color-60',
    additionalLink,
    AdditionalLinkContainerCn,
}: SidebarProps) => {
    const [hiddenNavGroups, setHiddenNavGroups] = useState<string[]>([]);
    const [showNavOverlay, setShowNavOverlay] = useState<boolean>(false);

    const pathname = usePathname();
    const walletBtnRef = useRef(null);
    const isMobile = useSetMobileDevice();

    useEffect(() => {
        return () => {
            setHiddenNavGroups([]);
        };
    }, [typeof window]);

    const isActivePath = useCallback(
        (path: string, submenu?: string) => {
            if (submenu) {
                return pathname?.includes(submenu);
            }

            // If it's admin path, then remove '/super' to make the path unique
            // to detect active path properly
            const processedPath = path.includes('/super') ? path.replace('/super', '') : path;
            const majorPath = processedPath.split('/')[1];

            if (pathname?.includes('/authors')) {
                return false;
            }

            return (
                (processedPath == '/' &&
                    (pathname || '')?.split('/').length <= 2 &&
                    !exceptedDefaultActivePathnames?.includes(pathname || '')) ||
                (processedPath !== '/' && majorPath && pathname?.indexOf(majorPath) === 1) ||
                // to detect major path with or without (s)
                (processedPath !== '/' &&
                    majorPath.charAt(majorPath.length - 1) === 's' &&
                    pathname?.includes(majorPath.slice(0, -1)))
            );
        },
        [pathname],
    );

    const toggleNavCollapse = useCallback(
        (name: string) => {
            if (hiddenNavGroups.find((n) => n === name)) {
                setHiddenNavGroups([...hiddenNavGroups.filter((n) => n !== name)]);
            } else {
                setHiddenNavGroups([...hiddenNavGroups, name]);
            }
        },
        [hiddenNavGroups],
    );

    const renderChevron = useCallback(
        (name: string) => {
            return hiddenNavGroups.find((n) => n === name) ? (
                <ChevronDownIcon className="h-6 w-6 ml-2 cursor-pointer" onClick={() => toggleNavCollapse(name)} />
            ) : (
                <ChevronUpIcon className="h-6 w-6 ml-2 cursor-pointer" onClick={() => toggleNavCollapse(name)} />
            );
        },
        [hiddenNavGroups, toggleNavCollapse],
    );

    const renderNavGroup = useCallback(
        (item: navigationAppItem, asNavOverlay: any) => {
            if (!item) {
                return null;
            }

            const navGroup = (
                <Fragment key={item.name}>
                    <li className="list-none">
                        <Link
                            aria-label={item.name}
                            className={classnames(
                                asNavOverlay ? navOverlayClassNames : navMinimizedClassNames,
                                isActivePath(item.path)
                                    ? !item.submenus
                                        ? navActiveClassNames
                                        : !asNavOverlay && navActiveClassNames
                                    : item.disabled
                                      ? disabledClassNames
                                      : navInactiveClassNames,
                                !asNavOverlay && 'flex-col',
                            )}
                            target={item.newTab ? '_blank' : '_self'}
                            href={
                                item.disabled || (isActivePath(item.path) && !item.skipUseCurrentPath) ? '' : item.path
                            }
                            locale={item?.defaultLocale}
                            rel="noopener noreferrer">
                            <div
                                className="w-8 flex justify-center items-center"
                                data-tip
                                data-for={`${item.name}Tooltip`}>
                                {isActivePath(item.path) && item.activeIcon ? item.activeIcon : item.defaultIcon}
                            </div>
                            <span className={classnames(asNavOverlay ? 'ml-4' : 'mt-1 text-center')}>
                                {asNavOverlay
                                    ? item.name
                                    : item.submenus && isActivePath(item.path)
                                      ? item.submenus?.map((submenu) => {
                                            if (isActivePath(item.path, submenu.path)) {
                                                return submenu.name;
                                            }
                                        })
                                      : item.name}
                            </span>
                        </Link>
                    </li>
                    {asNavOverlay &&
                        item.submenus &&
                        item.submenus.map((submenu, index) => (
                            <li className="list-none" key={`${index}-${submenu.name}`}>
                                <Link
                                    key={`${index}-${submenu.name}`}
                                    href={submenu.path}
                                    className={classnames(
                                        asNavOverlay ? navOverlayClassNames : navMinimizedClassNames,
                                        isActivePath(item.path, submenu.path)
                                            ? navActiveSubmenuClassNames
                                            : item.disabled
                                              ? disabledClassNames
                                              : navInactiveClassNames,
                                    )}>
                                    <div className="w-full h-5 pl-12">{submenu.name}</div>
                                </Link>
                            </li>
                        ))}
                </Fragment>
            );

            if (asNavOverlay && item.submenus && isActivePath(item.path)) {
                return (
                    <div key={item.name} className={navGroupActiveClassNames}>
                        {navGroup}
                    </div>
                );
            }

            return navGroup;
        },
        [isActivePath],
    );

    const renderNavGroupSeparator = useCallback(
        (name: any, asNavOverlay: any) => {
            if ((!showNavGroupTitles && asNavOverlay) || !name) {
                return null;
            }

            if (!asNavOverlay) {
                return <hr key={`group-${name}`} className={navGroupSeparatorClassNames} />;
            }

            return (
                <div key={`group-${name}`} className="text-neutral-control-layer-color-60 flex items-center py-3 px-1">
                    <div className={classnames('text-xs font-bold uppercase', name && 'mr-3')}>{name}</div>
                    <div className="flex flex-grow">
                        <hr className="w-full" />
                    </div>
                    {isMobile && renderChevron(name)}
                </div>
            );
        },
        [renderChevron, isMobile, showNavGroupTitles],
    );

    const renderNavGroups = useCallback(
        (asNavOverlay: boolean) => {
            const navigation = (navigations || []).filter((n) => !n.bottom);

            const navList = navigation?.map((g) => {
                if (hiddenNavGroups.find((n) => n === g.app) && isMobile) {
                    return [renderNavGroupSeparator(g.app, asNavOverlay)];
                }

                return [
                    renderNavGroupSeparator(g.app, asNavOverlay),
                    ...g.pathnames.map((n) => renderNavGroup(n, asNavOverlay)),
                ];
            });

            return navList;
        },
        [navigations, hiddenNavGroups, renderNavGroupSeparator, renderNavGroup],
    );

    const renderBottomNavGroups = useCallback(
        (asNavOverlay: boolean) => {
            const navigation = (navigations || []).filter((n) => n.bottom);

            const navList = navigation?.map((g) => {
                if (g.pathnames.length < 2) {
                    return [renderNavGroup(g.pathnames[0], asNavOverlay)];
                }

                if (hiddenNavGroups.find((n) => n === g.app) && isMobile) {
                    return [renderNavGroupSeparator(g.app, asNavOverlay)];
                }

                return [
                    renderNavGroupSeparator(g.app, asNavOverlay),
                    ...g.pathnames.map((n) => renderNavGroup(n, asNavOverlay)),
                ];
            });

            return navList;
        },
        [navigations, hiddenNavGroups, renderNavGroupSeparator, renderNavGroup],
    );

    const renderBottomNavLink = useCallback(
        (pathname: navigationAppItem) => (
            <Link
                key={pathname.name}
                href={pathname.path}
                className={classnames(
                    'group flex flex-1 flex-col justify-center items-center',
                    mobileNavbarClasses,
                    isActivePath(pathname.path) && mobileNavbarActiveClasses,
                )}>
                <div className="w-8 h-8 flex justify-center items-center rounded">
                    {isActivePath(pathname.path) ? pathname.activeIcon : pathname.defaultIcon}
                </div>
                <span className={classnames('mt-0.5', isActivePath(pathname.path) && mobileSpanActiveColor)}>
                    {pathname.name}
                </span>
            </Link>
        ),
        [isActivePath],
    );

    const renderBottomNav = useMemo(() => {
        return mobileNavigation?.map((appNav) =>
            appNav?.pathnames.map((pathname) => {
                return renderBottomNavLink(pathname);
            }),
        );
    }, [currentApp, mobileNavigation, pathname]);

    const renderLogo = useMemo(() => {
        return logo ? logo : defaultLogo(colorTheme ? colorTheme : 'light');
    }, [logo, colorTheme]);

    return (
        <>
            {/* navbar overlay*/}
            <Transition.Root show={showNavOverlay} as={Fragment}>
                <Dialog
                    as="div"
                    static
                    className={classnames('fixed inset-0 flex z-30', isMobile && 'flex-row-reverse')}
                    initialFocus={walletBtnRef}
                    open={showNavOverlay}
                    onClose={() => setShowNavOverlay(false)}>
                    <DialogBackdrop
                        onClick={setShowNavOverlay?.bind(this, false)}
                        className="fixed inset-0 bg-black opacity-[.15]"
                    />
                    <Transition.Child
                        as={Fragment}
                        enter="transition ease-in-out duration-150 transform"
                        enterFrom={isMobile ? 'translate-x-full' : '-translate-x-full'}
                        enterTo={isMobile ? '-translate-x-0' : 'translate-x-0'}
                        leave="transition ease-in-out duration-150 transform"
                        leaveFrom={isMobile ? 'translate-x-0' : '-translate-x-0'}
                        leaveTo={isMobile ? 'translate-x-full' : '-translate-x-full'}>
                        <div className={navOverlayClasses}>
                            <Link href={linkOnLogo || ''}>
                                <div className="cursor-pointer flex-shrink-0 flex px-4">{renderLogo}</div>
                            </Link>
                            <div className="mt-5 flex-1 h-0 overflow-y-auto">
                                <nav className="px-2">{renderNavGroups(true)}</nav>
                            </div>
                            <div className={AdditionalLinkContainerCn}>{additionalLink && additionalLink}</div>
                            <div className={classnames('px-2', isMobile && 'py-4')}>{renderBottomNavGroups(true)}</div>
                            {isMobile && (
                                <div className="flex justify-end mr-8 pb-4 text-neutral-control-layer-color-60">
                                    <button
                                        className="ml-1 flex flex-col items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                        onClick={() => setShowNavOverlay(false)}>
                                        <span className="sr-only">Close sidebar</span>
                                        <span className={closeIconClasses}>{closeIcon}</span>
                                        <span className="text-xs font-bold">Close</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </Transition.Child>
                    <div className="flex-shrink-0 w-14" aria-hidden="true" />
                </Dialog>
            </Transition.Root>

            {/* desktop sidebar */}
            <div className={classNames}>
                <div className="hidden md:flex md:flex-shrink-0 h-screen">
                    <div className="flex flex-col w-20">
                        <div className="flex flex-col flex-grow pt-1 overflow-y-auto with-scrollbar">
                            <div className="flex justify-center items-center px-4">
                                <span
                                    aria-label={showNavOverlay ? 'sidebarOpen' : 'sidebarClosed'}
                                    data-testid="root-collapseButton"
                                    className="p-2 transition duration-150 ease-in rounded-md hover:bg-navbar-control-bg-color-10 cursor-pointer block"
                                    onClick={() => setShowNavOverlay(true)}>
                                    {navOverlayTogglerIcon}
                                </span>
                            </div>
                            <div className="mt-1 flex-grow flex flex-col">
                                <nav className="flex-1 px-1.5" aria-label="Main navigation">
                                    <ul>{renderNavGroups(false)}</ul>
                                </nav>
                            </div>
                            <nav className="flex-1 px-2 flex flex-col justify-end mb-4">
                                <ul>{renderBottomNavGroups(false)}</ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* mobile sidebar */}
            {isMobile && (
                <div className={bottomClasses}>
                    <div className="flex-1 flex justify-between">
                        <nav className="flex-1 flex flex-row">
                            {renderBottomNav}
                            {showMobileSidebarToggler && (
                                <button
                                    className={classnames(
                                        'group flex flex-1 flex-col justify-center items-center',
                                        mobileNavbarClasses,
                                    )}
                                    onClick={() => setShowNavOverlay(true)}>
                                    <div className="w-8 h-8 flex justify-center items-center rounded">
                                        {navOverlayTogglerIcon}
                                    </div>
                                    {navMoreLabel}
                                </button>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
};

export const Sidebar = memo(SidebarComponent);
