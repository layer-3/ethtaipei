import Image from 'next/image';
import { memo } from 'react';

interface AppCardProps {
    image: string;
    title: string;
    category: string;
}

export const AppCard = memo(({ image, title, category }: AppCardProps) => (
    <div className="flex flex-col">
        <div className="rounded-2xl flex">
            <div className="text-center">
                <Image src={image} alt={title} width={190} height={239} />
            </div>
        </div>
        <div className="flex flex-col mt-2">
            <h3 className="font-semibold text-gray-700">{title}</h3>
            <span className="text-gray-500 text-xs">{category}</span>
        </div>
    </div>
));

AppCard.displayName = 'AppCard';
