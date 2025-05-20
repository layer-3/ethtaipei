import { CaretDown, CaretUp } from '@/assets/images/Arrow';
import { FC, memo, useCallback, useMemo, useState } from 'react';
import { YellowLogo } from '@/assets/images/VaultLogo';
import { FOOTER_OPTIONS } from '@/config/footer';
import Link from 'next/link';
import { useDeviceDetection } from '@/hooks';

const CustomFooterComponent: FC<any> = ({ isVaultLayout }) => {
    const { isMobile } = useDeviceDetection();
    const footerNavigationHeight = FOOTER_OPTIONS.navigations.length + 1;
    const [dropdownState, setDropdownState] = useState<boolean[]>(
        Array(footerNavigationHeight).fill(true, 0, footerNavigationHeight),
    );

    const toggleDropdown = useCallback(
        (index: number) => {
            const newDropdownState = Array.from(dropdownState);

            newDropdownState[index] = !newDropdownState[index];
            setDropdownState(newDropdownState);
        },
        [dropdownState],
    );

    const desktopFooter = useMemo(
        () => (
            <>
                <div className="flex w-full justify-between">
                    <div className="flex py-4">
                        <YellowLogo classNames="text-neutral-control-layer-color-100" />
                    </div>
                </div>
                <div className="pb-8 lg:pr-12 2xl:pr-14 grid md:grid-rows-2 gap-y-12 lg:grid-rows-1 grid-flow-col lg:justify-between">
                    {FOOTER_OPTIONS.navigations.map((navigation, index) => (
                        <div key={index} className="flex flex-col">
                            <div className="uppercase text-xxs text-neutral-control-layer-color-40 font-metro-bold my-2">
                                {navigation.name}
                            </div>
                            {navigation.submenu.map((menu, menuIndex) => (
                                <Link
                                    key={menuIndex}
                                    className="text-neutral-control-layer-color-60 font-metro-semibold py-0.5 px-2 -ml-2 duration-100 hover:bg-neutral-control-color-20"
                                    href={menu.href}
                                    target={menu.target}>
                                    {menu.name}
                                </Link>
                            ))}
                        </div>
                    ))}
                    <div className="flex flex-col w-1/2 lg:w-auto">
                        <div className="uppercase text-xxs text-neutral-control-layer-color-40 font-metro-bold my-2">
                            Socials
                        </div>
                        <div className="grid grid-cols-5 lg:grid-cols-4 3xl:grid-cols-5 gap-3 py-1">
                            {FOOTER_OPTIONS.socials.map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    target={social.target}
                                    rel="noopener noreferrer"
                                    className="duration-100 text-neutral-control-layer-color-20 hover:text-neutral-control-layer-color-60">
                                    {social.icon()}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </>
        ),
        [isVaultLayout],
    );

    const mobileFooter = useMemo(
        () => (
            <>
                <div className="flex py-4">
                    <YellowLogo classNames="text-neutral-control-layer-color-100" />
                </div>
                <div className="flex flex-col">
                    {FOOTER_OPTIONS.navigations.map((navigation, index) => (
                        <div key={index} className="flex flex-col mb-5">
                            <div className="flex items-center uppercase text-xxs text-neutral-control-layer-color-40 font-metro-bold my-2 footer-title-mobile">
                                {navigation.name}
                                <div className="h-px w-full bg-divider-color-20 mx-3" />
                                <span
                                    className="text-text-color-90"
                                    onClick={() => {
                                        toggleDropdown(index);
                                    }}>
                                    {dropdownState[index] ? <CaretUp /> : <CaretDown />}
                                </span>
                            </div>
                            {dropdownState[index] &&
                                navigation.submenu.map((menu, menuIndex) => (
                                    <Link
                                        key={menuIndex}
                                        className="text-neutral-control-layer-color-60 font-metro-semibold py-1"
                                        href={menu.href}
                                        target={menu.target}>
                                        {menu.name}
                                    </Link>
                                ))}
                        </div>
                    ))}
                    <div className="flex flex-col">
                        <div className="flex items-center uppercase text-xxs text-neutral-control-layer-color-40 font-metro-bold my-2 footer-title-mobile">
                            Socials
                            <div className="h-px w-full bg-divider-color-20 mx-3" />
                            <span
                                className="text-text-color-90"
                                onClick={() => {
                                    toggleDropdown(footerNavigationHeight - 1);
                                }}>
                                {dropdownState[footerNavigationHeight - 1] ? <CaretUp /> : <CaretDown />}
                            </span>
                        </div>
                        <div className=" grid grid-cols-5 w-1/2 gap-3 py-1">
                            {dropdownState[footerNavigationHeight - 1] &&
                                FOOTER_OPTIONS.socials.map((social) => (
                                    <Link
                                        key={social.name}
                                        href={social.href}
                                        target={social.target}
                                        rel="noopener noreferrer"
                                        className="duration-100 text-neutral-control-layer-color-20 hover:text-neutral-control-layer-color-60">
                                        {social.icon()}
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>
            </>
        ),
        [dropdownState, isVaultLayout],
    );

    return (
        <footer className="w-full">
            <div className="bg-body-background-color border-t border-divider-color-20 pb-20 mx-auto py-4 px-4 md:px-6 sm:pb-4 md:pb-4 lg:pb-4 lg:px-8">
                <div className="3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] mx-auto">
                    {isMobile ? mobileFooter : desktopFooter}
                </div>
            </div>
            <div className="bg-body-background-color border-t border-divider-color-20 pb-20 mx-auto py-4 px-4 md:px-6 sm:pb-4 md:pb-4 lg:pb-4 lg:px-8">
                <div className="3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] mx-auto">
                    <div className="flex items-start flex-col sm:flex-row">
                        <div className="flex flex-col justify-center max-w-[250px] py-4 mr-[100px]">
                            <span className="text-text-color-80 whitespace-nowrap">©Yellow.com 2025</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export const CustomFooter = memo(CustomFooterComponent);
