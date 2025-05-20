import { UserIconBackground } from '@/assets/images/WalletIcons/UserIconBackground';
import { ArrowOnSquare, CopySquareDocIcon } from '@/assets/images/WalletIcons/UserCardIcons';
import { WalletIcon } from '@/assets/images/WalletIcons/WalletIcon';
import { Decimal, formatSignificantWithSeparators } from '@/components/ui/Decimal';
import { shortenHex } from '@/helpers/shortenHex';
import SettingsStore from '@/store/SettingsStore';
import { ArrowRightIcon, CheckIcon, PowerIcon } from '@heroicons/react/24/outline';
import { toSvg } from 'jdenticon';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useSnapshot } from 'valtio';
import { AssetsStore, WalletStore } from '@/store';
import { TAsset } from '@/store/AssetsStore';
import Link from 'next/link';

interface IUserInfoCard {
    onLogOut?: () => void;
}

export const UserInfoCard: React.FC<IUserInfoCard> = ({ onLogOut }) => {
    const { walletAddress } = useSnapshot(WalletStore.state);
    const { activeChain } = useSnapshot(SettingsStore.state);
    const { balances, assets, assetsLoading, balancesLoading } = useSnapshot(AssetsStore.state);
    const [copiedAddress, setCopiedAddress] = useState<string>();

    const svgString = toSvg(walletAddress, 36);

    useEffect(() => {
        if (!copiedAddress) {
            return;
        }

        setTimeout(() => {
            setCopiedAddress('');
        }, 1000);
    }, [copiedAddress]);

    const shownAssets = useMemo(
        () =>
            assets?.slice(0, 2)?.map((asset: TAsset) => ({
                ...balances?.find((balance) => balance?.symbol?.toLowerCase() === asset?.symbol?.toLowerCase()),
                ...asset,
            })),
        [assets],
    );

    const nativeBalance = useMemo(
        () =>
            balances?.find(
                (balance) => balance.symbol?.toLowerCase() === activeChain?.nativeCurrency?.symbol?.toLowerCase(),
            ),
        [balances, activeChain],
    );

    const nativeAsset = useMemo(
        () =>
            assets?.find((asset) => asset.symbol?.toLowerCase() === activeChain?.nativeCurrency?.symbol?.toLowerCase()),
        [activeChain, assets],
    );

    const handleViewOnExplorer = useCallback(() => {
        open(`${activeChain?.blockExplorers?.default.url}/address/${walletAddress}`, '_blank');
    }, [walletAddress, activeChain]);

    const renderLoadingSkeleton = useCallback(
        (height: number) => (
            <SkeletonTheme baseColor="var(--neutral-control-color-10)" highlightColor="var(--neutral-control-color-40)">
                <Skeleton
                    key="skeleton-user-native-balance"
                    count={1}
                    height={height}
                    width={100}
                    borderRadius={2}
                    containerClassName="flex justify-end"
                />
            </SkeletonTheme>
        ),
        [],
    );

    const handleCopyAddress = useCallback(async () => {
        setCopiedAddress(walletAddress);

        await navigator.clipboard.writeText(walletAddress);
    }, [walletAddress]);

    return (
        <div className="flex flex-col gap-2 min-w-80 h-full">
            <Link href="https://yellow.com/vault" className="flex items-center gap-2 cursor-pointer w-fit group">
                <WalletIcon className="w-5 h-5 flex-shrink-0 text-neutral-control-layer-color-100 stroke-2" />
                <span className="text-text-color-90 font-gilmer-medium text-2xl">Vault</span>
                <ArrowRightIcon className="stroke-2 text-primary-cta-layer-color-60 w-5 h-5 flex-shrink-0 transform transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <div className="w-full min-h-full rounded-lg border border-divider-color-20 bg-body-background-color flex flex-col py-4">
                <div className="w-full flex flex-col items-center justify-center gap-1">
                    <div className="relative">
                        <UserIconBackground />
                        <div
                            className="cr-leaderboard-image absolute top-[6px] left-[7px]"
                            dangerouslySetInnerHTML={{ __html: svgString }}
                        />
                    </div>
                    <div className="w-full flex items-center justify-center gap-3 pb-8 border-b border-neutral-control-color-40">
                        <button
                            onClick={handleCopyAddress}
                            className="cursor-pointer font-metro-semibold text-xl text-text-color-100 hover:text-text-color-80">
                            {!walletAddress ? renderLoadingSkeleton(24) : shortenHex(walletAddress, 6, 4)}
                        </button>

                        <button className="group w-6 h-6 flex-shrink-0" onClick={handleCopyAddress}>
                            {copiedAddress ? (
                                <CheckIcon
                                    className="flex-shrink-0 h-6 w-6 text-system-green-60 stroke-[1.5px]"
                                    strokeWidth={1.5}
                                />
                            ) : (
                                <CopySquareDocIcon
                                    onClick={handleCopyAddress}
                                    className="h-6 w-6 cursor-pointer text-neutral-control-layer-color-30 group-hover:text-neutral-control-layer-color-50 duration-200 stroke-[1.5px]"
                                />
                            )}
                        </button>

                        <ArrowOnSquare
                            onClick={handleViewOnExplorer}
                            className="h-6 w-6 cursor-pointer text-neutral-control-layer-color-30 hover:text-neutral-control-layer-color-50 duration-200 stroke-[1.5px]"
                        />
                    </div>
                </div>

                <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
                    <div className="flex flex-col gap-1.5 items-center justify-center">
                        <span className="text-text-color-60 font-metro-semibold text-xs">Total Balance</span>
                        <div className="flex items-center gap-2">
                            <span className="text-text-color-100 font-metro-semibold text-xl">
                                {assetsLoading || balancesLoading || !walletAddress ? (
                                    renderLoadingSkeleton(28)
                                ) : (
                                    <Decimal fixed={nativeAsset?.precision || 2} thousSep=",">
                                        {nativeBalance?.balance || 0}
                                    </Decimal>
                                )}
                            </span>
                            {nativeBalance?.symbol && (
                                <span className="text-text-color-60 font-metro-regular text-lg">
                                    {nativeBalance?.symbol}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col border-t border-divider-color-20">
                    {shownAssets?.map((shownAsset) => (
                        <div
                            key={`${shownAsset?.symbol} user card asset`}
                            className="border-b border-divider-color-20 px-4 py-3 flex items-center justify-between gap-2">
                            <div className="flex items-center">
                                <Image
                                    src={shownAsset?.logoURI ?? ''}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 flex-shrink-0 mr-2"
                                    alt={`${shownAsset?.symbol} user card asset logo`}
                                />
                                <span className="mr-1.5 font-metro-semibold text-sm text-text-color-90">
                                    {shownAsset?.symbol?.toUpperCase()}
                                </span>
                                <span className="capitalize font-metro-regular text-sm text-text-color-70">
                                    {shownAsset?.name}
                                </span>
                            </div>
                            <div className="flex items-center justify-end font-metro-semibold text-sm text-text-color-90">
                                {formatSignificantWithSeparators(shownAsset?.balance || '0')}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="w-full flex items-center justify-between pt-4 px-4">
                    <Link
                        href="https://yellow.com/vault"
                        className="px-3 py-1 rounded border border-neutral-control-color-70 shadow-sm hover:shadow bg-neutral-control-color-0 hover:bg-neutral-control-color-10 active:bg-neutral-control-color-20 group active:shadow-md flex items-center gap-1">
                        <span className="font-metro-semibold text-sm text-neutral-control-layer-color-70 group-hover:text-neutral-control-layer-color-80">
                            See all
                        </span>
                        <ArrowRightIcon className="stroke-2 w-5 h-5 flex-shrink-0 text-neutral-control-layer-color-70 group-hover:text-neutral-control-layer-color-80 transform transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                    <div
                        className="px-3 py-1 cursor-pointer font-metro-semibold hover:text-neutral-control-layer-color-70 text-sm text-neutral-control-layer-color-50 group-hover:text-neutral-control-layer-color-70 rounded border border-neutral-control-color-70 shadow-sm hover:shadow bg-neutral-control-color-0 hover:bg-neutral-control-color-10 active:bg-neutral-control-color-20 group active:shadow-md flex items-center gap-1"
                        onClick={onLogOut}>
                        Log Out
                        <PowerIcon
                            strokeWidth={2}
                            className="text-neutral-control-layer-color-50 flex-shrink-0 h-3 w-3 sm:h-4 sm:w-4 group-hover:text-neutral-control-layer-color-70"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
