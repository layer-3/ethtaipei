import { isBrowser } from '@/helpers/isBrowser';
import { useSetMobileDevice } from '@/hooks/useMobileDevice';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import classnames from 'classnames';
import { usePathname, useRouter } from 'next/navigation';
import React, { FC, JSX, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { headerLogoIcon as defaultHeaderLogoIcon } from './Header.constants';
import Link from 'next/link';

interface NavItem {
    name: string | ReactNode;
    href: string;
}

export interface HeaderOptions {
    navigations?: NavItem[];
    customHeaderContent?: React.ReactNode;
}

export interface HeaderProps {
    /**
     * Header menu content
     * navigations: Nested navigation menu
     */
    options?: HeaderOptions;
    /**
     * What class name to use.
     * We have tailwind support that's why
     * you can use their classnames
     */
    className?: string;
    /**
     * icon link
     */
    linkIcon?: string;
    /**
     * button link
     */
    buttonHref?: string;
    /**
     * Site headerLogoIcon
     */
    headerLogoIcon?: JSX.Element;
    /**
     * What class name to use for changing
     * styles for options inside footer.
     */
    optionClassName?: string;
    /**
     * What class name to use for changing
     * styles for dropdown.
     */
    buttonClassName?: string;
    /**
     * What class name to use for changing
     * styles for more social button text.
     */
    buttonTextClassName?: string;
    /**
     * What class name to use for changing
     * styles for more social dropdown.
     */
    socialMoreClassName?: string;
    /**
     * Text label for "More" button
     */
    buttonLabel?: string | ReactNode;
    /**
     * What class name to use for changing
     * styles for active tab.
     */
    activeTabClassName?: string;
    /**
     * What class name to use for changing
     * styles for default tab.
     */
    inactiveTabClassName?: string;
    /**
     * What class name to use for changing
     * styles for navigation row.
     */
    navigationsWrapClassName?: string;
    /**
     * Hides navigation tabs when true
     */
    hideNavigation?: boolean;
    /**
     * Show or hide header
     */
    show?: boolean;
    /**
     * What class name to use for changing
     * styles for dropdown button in header option.
     */
    moreOptionsClassName?: string;
    /**
     * What class name to use for changing
     * styles for item in dropdown button in header option.
     */
    moreOptionsItemClassName?: string;
}

export const Header: FC<HeaderProps> = ({
    options,
    className = 'border-b w-full sm:flex items-center justify-between mx-auto py-1 px-4 sm:px-6 sm:pb-1 md:pb-1 lg:pb-1 lg:px-8',
    optionClassName = 'text-gray-400 px-2 pt-2 relative hover:bg-neutral-control-color-30',
    buttonClassName = 'self-center ml-2 relative bg-gray-100 rounded flex py-1 px-2 cursor-pointer',
    buttonTextClassName = 'self-center text-gray-500 text-sm font-bold',
    buttonLabel = 'More',
    headerLogoIcon = defaultHeaderLogoIcon,
    buttonHref = '/post',
    linkIcon = '/home',
    activeTabClassName = 'bg-neutral-color-90',
    inactiveTabClassName,
    hideNavigation = false,
    navigationsWrapClassName = 'flex',
    show = true,
    moreOptionsClassName = 'flex items-center justify-center cursor-pointer rounded-md bg-neutral-control-color-30 px-1',
    moreOptionsItemClassName,
}: HeaderProps) => {
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    const navigationRef = useRef<HTMLDivElement | null>(null);
    const ref = useRef<HTMLInputElement | null>(null);

    const [currentPathname, setCurrentPathname] = useState<string>('');
    const [navOptions, setNavOptions] = useState<HeaderOptions | undefined>();
    const [dropdownOptions, setDropdownOptions] = useState<NavItem[]>([]);

    const isMobile = useSetMobileDevice();
    const router = useRouter();
    const pathname = usePathname();
    const windowLocationPathname = isBrowser() ? window.location?.pathname : '';

    useEffect(() => {
        setNavOptions(options);
    }, [options]);

    useEffect(() => {
        if (navigationRef && navigationRef.current) {
            const navigationHeight = navigationRef.current.offsetHeight;
            const defaultNavigationHeight = 24;

            if (navigationHeight > defaultNavigationHeight && navOptions?.navigations) {
                handleChangeNavigation(dropdownOptions, navOptions?.navigations);
            }
        }
    }, [dropdownOptions, navigationRef, navOptions]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentPathname(windowLocationPathname);
        }

        return () => {
            setDropdownOptions([]);
        };
    }, [windowLocationPathname]);

    const handleChangeNavigation = useCallback((dropdownList: NavItem[], navigation: NavItem[]) => {
        const newNavigation = navigation;
        const item = newNavigation.pop();
        const newNavOptions = {
            navigations: newNavigation,
        };

        if (item) {
            const newDropdownOptions = [...dropdownList, item];

            setNavOptions(newNavOptions);
            setDropdownOptions(newDropdownOptions);
        }
    }, []);

    const isActivePath = useCallback(
        (path: string) => {
            return (
                (path === '/' && (currentPathname === '/' || currentPathname.includes('/all'))) ||
                (path !== '/' && currentPathname.includes(path))
            );
        },
        [currentPathname],
    );

    const buttonClick = (buttonHref: string) => {
        router.push(`/${buttonHref}`);
    };

    const handleRedirect = React.useCallback(
        (item: any) => {
            const destinationPathParts = pathname?.includes('assets')
                ? {
                      prefix: '/assets',
                      middle: item.href === '/' ? '/all' : item.href,
                      suffix: '/1',
                  }
                : {
                      prefix: '',
                      middle: item.href,
                      suffix: '',
                  };

            router.push(`${destinationPathParts.prefix}${destinationPathParts.middle}${destinationPathParts.suffix}`);
        },
        [pathname],
    );

    const getLinkHref = React.useCallback(
        (item: any) => {
            const destinationPathParts = pathname?.includes('assets')
                ? {
                      prefix: '/assets',
                      middle: item.href === '/' ? '/all' : item.href,
                      suffix: '/1',
                  }
                : {
                      prefix: '',
                      middle: item.href,
                      suffix: '',
                  };

            return `${destinationPathParts.prefix}${destinationPathParts.middle}${destinationPathParts.suffix}`;
        },
        [pathname],
    );

    const closeMenu = () => {
        dropdownRef?.current?.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true,
            }),
        );
    };

    const handleSelect = useCallback(() => {
        closeMenu();
    }, []);

    const renderOptions = (optionsList: HeaderOptions | undefined) => {
        return (
            <>
                {optionsList?.navigations?.map((item: NavItem, index: number) => (
                    <Link
                        key={`header-${index}`}
                        href={getLinkHref(item)}
                        className={classnames(
                            'flex cursor-pointer w-min-fit rounded-md px-1',
                            optionClassName,
                            hideNavigation && 'hidden',
                            isActivePath(item.href) ? activeTabClassName : inactiveTabClassName,
                        )}>
                        {item.name}
                    </Link>
                ))}
                {dropdownOptions && dropdownOptions.length ? (
                    <Combobox value="" onChange={handleSelect}>
                        <div className="relative">
                            <Combobox.Button className={moreOptionsClassName}>
                                <span className="inline-block">More</span>
                                <ChevronDownIcon width={20} />
                            </Combobox.Button>
                            <Transition>
                                <Combobox.Options
                                    ref={dropdownRef}
                                    className="absolute z-50 w-auto no-scrollbar bg-dropdown-background-color shadow-sm border border-divider-color-20 max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto">
                                    {dropdownOptions?.map((category) => (
                                        <Link
                                            key={category.href}
                                            href={getLinkHref(category)}
                                            className={classnames(
                                                'px-4 py-1 block hover:bg-neutral-control-color-30',
                                                moreOptionsItemClassName,
                                                isActivePath(category.href) ? activeTabClassName : '',
                                            )}>
                                            {category.name}
                                        </Link>
                                    ))}
                                </Combobox.Options>
                            </Transition>
                        </div>
                    </Combobox>
                ) : null}
            </>
        );
    };

    if (!show) {
        return null;
    }

    return !isMobile ? (
        <header data-testid="root" className={classnames(options && className)}>
            {options && (
                <>
                    <div className="leading-8 flex items-center justify-center lg:pb-0" ref={ref}>
                        <Link href={linkIcon ? linkIcon : '/'} className="w-auto h-auto" aria-label="Home page">
                            <div className="cursor-pointer block">{headerLogoIcon}</div>
                        </Link>
                        <div ref={navigationRef} className={navigationsWrapClassName}>
                            {options.customHeaderContent ? (
                                <div className="flex items-center">{options.customHeaderContent}</div>
                            ) : (
                                renderOptions(navOptions)
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-center md:order-2">
                        <Link className={buttonClassName} href={buttonHref}>
                            <span className={buttonTextClassName}>{buttonLabel}</span>
                        </Link>
                    </div>
                </>
            )}
        </header>
    ) : (
        <div>
            <div className="leading-8 flex flex-wrap justify-between px-6 pt-4 lg:pb-0" ref={ref}>
                <Link className="w-auto h-auto" href={linkIcon}>
                    <div className="cursor-pointer block">{headerLogoIcon}</div>
                </Link>
                <div onClick={() => buttonClick(buttonHref || '')} className={buttonClassName}>
                    <div className={buttonTextClassName}>{buttonLabel}</div>
                </div>
            </div>
            <div>
                {options && (
                    <>
                        <div className="leading-8 flex pl-4 mt-6 overflow-scroll no-scrollbar lg:pb-0" ref={ref}>
                            {options.navigations?.map((item: NavItem, index: number) => (
                                <div
                                    key={`header-${index}`}
                                    className={classnames(optionClassName, hideNavigation && 'hidden')}>
                                    <div
                                        className={classnames(
                                            'flex items-center w-min-fit cursor-pointer rounded-md hover:bg-neutral-control-color-30 px-1',
                                            item.href !== '' && isActivePath(item.href)
                                                ? activeTabClassName
                                                : inactiveTabClassName,
                                        )}
                                        onClick={() => handleRedirect(item)}>
                                        {item.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
