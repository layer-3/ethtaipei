'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Transition } from '@headlessui/react';
import { shortenHex } from '@/helpers/shortenHex';
import { NetworkDropdown } from '@/widgets/NetworkDropdown';
import { useOutsideClickHandler } from '@/hooks/useOutsideClickHandler';
import classNames from 'classnames';
import dynamic from 'next/dynamic';

const UserInfoCard = dynamic(() => import('@/widgets/User/UserInfoCard').then((mod) => mod.UserInfoCard));

export interface IRenderAccountWithVault {
    accountAddress: string;
    onLogOut?: () => void;
}

export const RenderAccountWithVault: React.FC<IRenderAccountWithVault> = ({
    accountAddress,
    onLogOut,
}: IRenderAccountWithVault) => {
    const [isVaultMenuOpen, setIsVaultMenuOpen] = useState<boolean>(false);
    const [copiedAddress, setCopiedAddress] = useState<string>();

    useEffect(() => {
        if (!copiedAddress) return;

        setTimeout(() => {
            setCopiedAddress('');
        }, 1000);
    }, [copiedAddress]);

    const vaultMenuRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<HTMLDivElement | null>(null);

    useOutsideClickHandler(vaultMenuRef, isVaultMenuOpen, () => {
        setIsVaultMenuOpen(false);
    });

    const handleRefFocus = useCallback(() => {
        vaultMenuRef.current?.blur();
        networkRef.current?.blur();
    }, [vaultMenuRef, networkRef]);

    const handleVaultMenuClick = useCallback(() => {
        setIsVaultMenuOpen((prev) => !prev);
    }, []);

    return (
        <div
            onFocus={handleRefFocus}
            className="max-md:flex-col-reverse md:order-2 flex flex-row items-center gap-1 md:gap-2 max-xl:w-full max-xl:justify-between">
            <div className="flex items-center gap-1 max-md:justify-end max-md:w-full">
                <div className="relative">
                    <NetworkDropdown
                        ref={networkRef}
                        containerClassName="flex md:w-1/2 md:min-w-[160px]"
                        dropdownChevronClassName="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-neutral-control-layer-color-50 duration-200 ml-2 mt-1"
                        currentChainNameClassName="truncate text-neutral-control-layer-color-90 font-metro-semibold text-xs sm:text-sm sm:leading-[22px]"
                        chainsContainerClassName="absolute shadow z-[100] top-[48px] right-0 bg-main-background-color border border-divider-color-20 rounded flex flex-col p-2 flex-shrink-0 w-full min-w-fit"
                        optionImageContainerClassName="flex-shrink-0"
                        optionChainNameClassName="text-text-color-100 whitespace-nowrap flex-shrink-0"
                        optionImageClassName="w-5 h-5 flex-shrink-0"
                        currentChainContainerClassName="flex items-center gap-2 cursor-pointer justify-between bg-neutral-control-color-30 hover:bg-neutral-control-color-50 duration-200 text-neutral-control-layer-color-90 rounded h-9 px-2 w-full md:w-[160px]"
                        optionChainButtonClassName="flex items-center py-2 px-1 justify-between duration-200 hover:bg-primary-cta-color-60 hover:rounded flex-shrink-0 min-w-fit w-full mr-4"
                        optionChainContainerClassName="flex items-center flex-shrink-0 gap-2 pr-2"
                        transitionEnterTo="opacity-100 top-[48px]"
                        transitionLeaveFrom="top-[48px]"
                    />
                </div>

                <div
                    ref={vaultMenuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-row items-center z-20 text-xs sm:text-sm lg:text-base">
                    <button
                        className={classNames(
                            'cursor-pointer duration-200 rounded h-9 px-2 flex items-center gap-2 whitespace-nowrap font-metro-semibold text-xs sm:text-sm sm:leading-[22px] border',
                            isVaultMenuOpen
                                ? 'bg-primary-cta-color-10 border-primary-cta-color-60 hover:bg-primary-cta-color-20 text-primary-cta-color-90'
                                : ' bg-neutral-control-color-30 hover:bg-neutral-control-color-50 text-neutral-control-layer-color-90 border-transparent',
                        )}
                        onClick={handleVaultMenuClick}>
                        {shortenHex(accountAddress, 6, 4)}
                        <ChevronDownIcon
                            className={classNames(
                                'w-4 h-4 md:w-5 md:h-5 flex-shrink-0 duration-200 mt-1',
                                isVaultMenuOpen ? 'rotate-180' : 'rotate-0 text-neutral-control-layer-color-50',
                            )}
                            strokeWidth={2}
                        />
                    </button>
                    <Transition
                        show={isVaultMenuOpen}
                        as={Fragment}
                        enter="transition ease-in-out duration-200 transform"
                        enterFrom="opacity-20 top-0"
                        enterTo="opacity-100 top-[60px]"
                        leave="transition ease-in-out duration-200 transform"
                        leaveFrom="top-[60px]"
                        leaveTo="top-0 opacity-0">
                        <div className="absolute z-[100] top-[60px] right-0 rounded min-w-fit w-fit shadow-2xl bg-body-background-color flex flex-grow-0 px-4 md:px-3 py-4 max-md:max-h-[calc(100vh-128px)] max-h-[calc(100vh-60px)] overflow-auto">
                            <div className="flex max-md-lg:w-fit gap-3 xl:gap-6 2xl:gap-12 xl:justify-center h-full">
                                <UserInfoCard onLogOut={onLogOut} />
                            </div>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    );
};
