import Image from 'next/image';
import { memo } from 'react';

interface AppCardProps {
    image: string;
    title: string;
    category: string;
}

export const AppCard = memo(({ image, title, category }: AppCardProps) => (
    <div className="flex flex-col gap-2">
        <div className="bg-black rounded-2xl aspect-square p-4 flex items-center justify-center">
            <div className="text-center">
                <Image src={image} alt={title} width={128} height={128} />
            </div>
        </div>
        <div className="flex flex-col">
            <h3 className="font-semibold text-gray-700">{title}</h3>
            <span className="text-gray-500 text-sm">{category}</span>
        </div>
    </div>
));

AppCard.displayName = 'AppCard';
