'use client';

import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import {
    Cog6ToothIcon,
    DocumentDuplicateIcon,
    PowerIcon,
    ChevronRightIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment, JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chains } from '@/config/chains';
import { RenderDropDownButton } from './RenderDropdownButton';
import SettingsStore from '@/store/SettingsStore';
import { Transition } from '@headlessui/react';
import { shortenHex } from '@/helpers/shortenHex';
import { useRouter } from 'next/navigation';
import { useSnapshot } from 'valtio';
import { HeaderConnectButton } from './HeaderConnectButton';
import { useSetMobileDevice } from '@/hooks/useMobileDevice';
import { NetworkDropdown } from '@/widgets/NetworkDropdown';
import { useOutsideClickHandler } from '@/hooks/useOutsideClickHandler';
import { CircleStarIcon } from '@/assets/images/CircleStarIcon';
import classNames from 'classnames';
import Link from 'next/link';

export interface IRenderAccountWithDropdown {
    isVaultLayout?: boolean;
    userEmail?: string;
    accountAddress: string;
    copyHandler: () => void;
    onLogOut: () => void;
    isCopied?: boolean;
    setOpenConnect?: (open: boolean) => void;
}

export interface TDropdownOption {
    label: string;
    icon: JSX.Element;
    onClickHandler: (...params: any) => void;
}

export const RenderAccountWithDropdown: React.FC<IRenderAccountWithDropdown> = ({
    onLogOut,
    accountAddress,
    setOpenConnect,
}: IRenderAccountWithDropdown) => {
    const isMobile = useSetMobileDevice(false, 1025);

    const { activeChain } = useSnapshot(SettingsStore.state);

    const router = useRouter();
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [copiedAddress, setCopiedAddress] = useState<string>();

    useEffect(() => {
        if (!copiedAddress) {
            return;
        }

        setTimeout(() => {
            setCopiedAddress('');
        }, 1000);
    }, [copiedAddress]);
    const handleCopyAddress = useCallback(() => {
        setCopiedAddress(accountAddress);

        navigator?.clipboard?.writeText(accountAddress ?? '');
    }, [accountAddress]);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<HTMLDivElement | null>(null);

    useOutsideClickHandler(dropdownRef, isDropdownOpen, () => {
        setIsDropdownOpen(false);
    });

    const handleRefFocus = useCallback(() => {
        if (dropdownRef.current) {
            dropdownRef.current.blur();
        }

        if (networkRef.current) {
            networkRef.current.blur();
        }
    }, [dropdownRef, networkRef]);

    const handleDropdownClick = useCallback(() => {
        setIsDropdownOpen((prev) => !prev);
    }, []);

    const getCurrentChainById = useCallback(() => {
        return chains.find((chain) => chain.id === activeChain?.id);
    }, [activeChain]);

    const handleViewOnExplorer = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const chain = getCurrentChainById();

            event?.stopPropagation();

            open(`${chain?.blockExplorers?.default.url}/address/${accountAddress}`);
        },
        [accountAddress],
    );

    const dropdownOptions: TDropdownOption[] = useMemo(() => {
        const iconClassnames =
            'text-neutral-control-layer-color-50 flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 group-hover:text-neutral-control-layer-color-70';

        return [
            {
                label: shortenHex(accountAddress, 6, 4),
                icon: <DocumentDuplicateIcon className={iconClassnames} strokeWidth={1.5} />,
                onClickHandler: handleCopyAddress,
            },
            {
                label: 'Settings',
                icon: <Cog6ToothIcon strokeWidth={2} className={iconClassnames} />,
                onClickHandler: () => {
                    router.push('/settings');
                },
            },
            {
                label: 'View on Explorer',
                icon: <ArrowTopRightOnSquareIcon className={iconClassnames} strokeWidth={2} />,
                onClickHandler: handleViewOnExplorer,
            },
            {
                label: 'Log Out',
                icon: <PowerIcon strokeWidth={2} className={iconClassnames} />,
                onClickHandler: onLogOut,
            },
        ];
    }, [accountAddress, copiedAddress, handleCopyAddress, handleViewOnExplorer, onLogOut, router]);

    return (
        <div
            onFocus={handleRefFocus}
            className="relative max-md:flex-col-reverse md:order-2 flex flex-row items-center gap-1 md:gap-2 max-xl:w-full max-xl:justify-between">
            <div className="rounded-lg p-2 bg-gradient-to-r from-primary-cta-color-10 to-neutral-control-color-10 flex flex-shrink-0 items-center justify-center gap-2.5 max-md:w-full max-md:justify-between">
                <div className="flex items-center gap-2">
                    <CircleStarIcon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-metro-semibold text-base leading-6 text-neutral-control-layer-color-100">
                        Up to 100,000
                    </span>
                </div>
                <Link
                    href="/seasons"
                    className="py-1 pl-3 pr-1 flex items-center gap-1 rounded shadow-sm border border-neutral-control-color-70 bg-neutral-control-color-0 hover:shadow hover:bg-neutral-control-color-10 active:bg-neutral-control-color-20 active:shadow-md">
                    <span className="font-metro-semibold text-sm text-neutral-control-layer-color-70 leading-[22px]">
                        Continue Quest
                    </span>
                    <ChevronRightIcon className="w-[18px] h-[18px] flex-shrink-0 text-neutral-control-layer-color-70 stroke-2" />
                </Link>
            </div>
            {!isMobile && <div className="px-1 text-neutral-control-layer-color-20">|</div>}
            <div className="flex items-center gap-1 max-md:justify-end max-md:w-full">
                <HeaderConnectButton containerClassName="pl-1" setOpenConnect={setOpenConnect} />
                <NetworkDropdown
                    ref={networkRef}
                    containerClassName="flex md:w-1/2 md:min-w-[160px]"
                    dropdownChevronClassName="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-neutral-control-layer-color-50 duration-200 ml-2 mt-1"
                    currentChainNameClassName="truncate text-neutral-control-layer-color-90 font-metro-semibold text-xs sm:text-sm sm:leading-[22px]"
                    currentChainContainerClassName="flex items-center gap-2 cursor-pointer justify-center bg-neutral-control-color-30 hover:bg-neutral-control-color-50 duration-200 text-neutral-control-layer-color-90 rounded h-9 px-2 w-full md:w-[160px]"
                />
                <div ref={dropdownRef} className="flex flex-row items-center z-20 text-xs sm:text-sm lg:text-base">
                    <div
                        className="cursor-pointer bg-neutral-control-color-30 hover:bg-neutral-control-color-50 duration-200 rounded-lg text-neutral-control-layer-color-90 h-9 px-2 flex items-center gap-2 whitespace-nowrap font-metro-semibold text-xs sm:text-sm sm:leading-[22px]"
                        onClick={handleDropdownClick}>
                        {shortenHex(accountAddress, 6, 4)}
                        <ChevronDownIcon
                            className={classNames(
                                'w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-neutral-control-layer-color-50 duration-200 mt-1',
                                isDropdownOpen ? 'rotate-180' : 'rotate-0',
                            )}
                            strokeWidth={2}
                        />
                    </div>
                    <Transition
                        show={isDropdownOpen}
                        as={Fragment}
                        enter="transition ease-in-out duration-200 transform"
                        enterFrom="opacity-20 -translate-y-full"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in-out duration-200 transform"
                        leaveFrom="translate-y-0"
                        leaveTo="-translate-y-full opacity-0">
                        <div className="absolute shadow z-[100] top-6 right-0.5 bg-main-background-color border border-divider-color-20 rounded min-w-[200px] w-fit">
                            {dropdownOptions.map((option: TDropdownOption) => (
                                <RenderDropDownButton key={option.label} dropdownOption={option} />
                            ))}
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    );
};
