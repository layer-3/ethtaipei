import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';

export interface IAppItem {
    title: string;
    description: string;
    logoUrl: string;
    bannerUrl: string;
    appUrl: string;
    comingSoon?: boolean;
}

export const AppItem: React.FC<IAppItem> = ({
    appUrl,
    description,
    logoUrl,
    title,
    bannerUrl,
    comingSoon,
}: IAppItem) => {
    return (
        <div className="w-full flex items-center">
            <Image width={60} height={60} alt="tic-tak-toe" src={logoUrl} className="rounded w-[60px] h-[60px]" />
            <div className="w-full py-2 px-3 flex flex-col justify-center">
                <span className="text-text-color-100 font-metro-semibold text-lg">{title}</span>
                <span className="text-text-color-60 font-metro-regular text-xs">{description}</span>
            </div>
            <Link
                href={appUrl}
                target="_blank"
                className={classNames(
                    'min-w-fit py-1 px-3 rounded font-metro-semibold text-sm whitespace-nowrap',
                    comingSoon
                        ? 'cursor-not-allowed bg-primary-cta-color-20 text-primary-cta-layer-color-90'
                        : 'bg-neutral-control-color-30 hover:bg-neutral-control-color-50 text-neutral-control-layer-color-50 hover:text-neutral-control-layer-color-70',
                )}>
                {comingSoon ? 'Coming Soon!!' : 'Open'}
            </Link>
        </div>
    );
};
