import { chains } from '@/config/chains';
import { chainImageURLById } from '@/config/chains/getChainImage';
import { Transition } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ForwardedRef, forwardRef, Fragment, memo, useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import SettingsStore from '@/store/SettingsStore';
import { useOutsideClickHandler } from '@/hooks/useOutsideClickHandler';

export interface INetworkDropdownProps {
    dropdownChevronClassName?: string;
    containerClassName?: string;
    chainsContainerClassName?: string;
    currentChainNameClassName?: string;
    currentChainContainerClassName?: string;
    optionImageClassName?: string;
    optionImageContainerClassName?: string;
    optionChainContainerClassName?: string;
    optionChainButtonClassName?: string;
    optionChainNameClassName?: string;
    transitionEnter?: string;
    transitionEnterFrom?: string;
    transitionEnterTo?: string;
    transitionLeave?: string;
    transitionLeaveFrom?: string;
    transitionLeaveTo?: string;
    onChange?: () => void;
}

const NetworkDropdownWidget = forwardRef(
    (
        {
            optionImageClassName,
            onChange,
            dropdownChevronClassName = 'max-sm:hidden w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-neutral-control-layer-color-50 duration-200 ml-2 mt-1',
            containerClassName = 'flex w-1/2 min-w-[140px]',
            chainsContainerClassName = 'absolute shadow z-[100] top-10 sm:top-6 sm:right-0.5 bg-main-background-color border border-divider-color-20 rounded sm:min-w-[200px] w-fit flex flex-col p-2 max-sm:flex-shrink-0',
            currentChainNameClassName = 'truncate text-neutral-control-layer-color-90',
            currentChainContainerClassName = 'flex items-center cursor-pointer justify-center bg-neutral-control-color-30 hover:bg-neutral-control-color-50 duration-200 text-neutral-control-layer-color-90 rounded h-9 px-2 w-full sm:w-[140px]',
            optionChainNameClassName = 'text-text-color-100',
            optionImageContainerClassName = 'mr-2',
            optionChainButtonClassName = 'flex items-center py-2 px-1 justify-between duration-200 hover:bg-primary-cta-color-60 hover:rounded',
            optionChainContainerClassName = 'flex items-center',
            transitionEnter = 'transition ease-in-out duration-200 transform',
            transitionEnterFrom = 'opacity-20 top-0',
            transitionEnterTo = 'opacity-100 top-10 sm:top-6',
            transitionLeave = 'transition ease-in-out duration-200 transform',
            transitionLeaveFrom = 'top-10 sm:top-6',
            transitionLeaveTo = 'top-0 opacity-0',
        }: INetworkDropdownProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) => {
        const { activeChain } = useSnapshot(SettingsStore.state);
        const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

        useOutsideClickHandler(ref, isDropdownOpen, () => {
            setIsDropdownOpen(false);
        });

        const onChainChanged = useCallback(
            async (chainId: number) => {
                const newChain = chains.find((chain) => chain.id === chainId);

                SettingsStore.setPrevChainId(activeChain?.id);
                SettingsStore.setActiveChain(newChain);
                onChange?.();
            },
            [activeChain?.id, onChange],
        );

        const handleNetworkClick = useCallback(() => {
            setIsDropdownOpen((prev) => !prev);
        }, []);

        const getCurrentChainById = useCallback(() => {
            return chains.find((chain) => chain.id === activeChain?.id);
        }, [activeChain]);

        const renderCurrentChain = useMemo(() => {
            const chain = getCurrentChainById();

            if (!chain) {
                return <span className="cursor-pointer">Select Network</span>;
            }

            const imageUrl = chainImageURLById(chain.id);

            return (
                <div className={currentChainContainerClassName}>
                    <div className="mr-1 flex-shrink-0">
                        {imageUrl ? (
                            <Image height={20} width={20} src={imageUrl} alt={chain.name} className="flex-shrink-0" />
                        ) : null}
                    </div>
                    <div className={currentChainNameClassName}>{chain?.name}</div>
                    <ChevronDownIcon
                        className={`${dropdownChevronClassName} ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                        strokeWidth={2}
                    />
                </div>
            );
        }, [
            getCurrentChainById,
            isDropdownOpen,
            dropdownChevronClassName,
            currentChainNameClassName,
            currentChainContainerClassName,
        ]);

        const renderOptions = useCallback(
            (chain: (typeof chains)[0]) => {
                // if (!testnets && chain.testnet) {
                //     return null;
                // }

                const currentChain = getCurrentChainById();

                const imageUrl = chainImageURLById(chain?.id ?? 0);

                return (
                    <button
                        key={chain.name}
                        className={optionChainButtonClassName}
                        onClick={() => onChainChanged(chain.id)}>
                        <div className={optionChainContainerClassName}>
                            <div className={optionImageContainerClassName}>
                                {imageUrl ? (
                                    <Image
                                        height={20}
                                        width={20}
                                        src={imageUrl}
                                        alt={chain.name}
                                        className={optionImageClassName}
                                    />
                                ) : null}{' '}
                            </div>
                            <div className={optionChainNameClassName}>{chain?.name}</div>
                        </div>
                        {chain.id === currentChain?.id && (
                            <CheckIcon className="text-text-color-90 h-4 w-4 flex-shrink-0" />
                        )}
                    </button>
                );
            },
            [
                onChainChanged,
                getCurrentChainById,
                optionImageClassName,
                optionChainNameClassName,
                optionChainButtonClassName,
                optionChainContainerClassName,
                optionImageContainerClassName,
            ],
        );

        return (
            <div id="network-dropdown" className={containerClassName} onClick={handleNetworkClick} ref={ref}>
                {renderCurrentChain}
                <Transition
                    show={isDropdownOpen}
                    as={Fragment}
                    enter={transitionEnter}
                    enterFrom={transitionEnterFrom}
                    enterTo={transitionEnterTo}
                    leave={transitionLeave}
                    leaveFrom={transitionLeaveFrom}
                    leaveTo={transitionLeaveTo}>
                    <div className={`${chainsContainerClassName}`}>{chains.map(renderOptions)}</div>
                </Transition>
            </div>
        );
    },
);

NetworkDropdownWidget.displayName = 'NetworkDropdown';

export const NetworkDropdown = memo(NetworkDropdownWidget);
