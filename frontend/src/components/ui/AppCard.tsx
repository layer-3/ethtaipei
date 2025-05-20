import Image from 'next/image';
import { memo } from 'react';

interface AppCardProps {
    image: string;
    title: string;
    category: string;
    description?: string;
    compact?: boolean;
}

export const AppCard = memo(({ image, title, category, description, compact = false }: AppCardProps) => {
    if (compact) {
        return (
            <div className="flex flex-col bg-main-background-color rounded-[3px] overflow-hidden transform transition-all hover:scale-105 cursor-pointer hover:shadow-lg shadow-md border border-divider-color-20">
                <div className="relative h-[120px] md:h-[160px] overflow-hidden">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition-transform hover:scale-110 duration-500"
                    />
                </div>
                <div className="p-3 md:p-4">
                    <h3 className="font-metro-semibold text-text-color-90 text-sm md:text-base">{title}</h3>
                    <span className="text-text-color-60 font-metro-regular text-xs">{category}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-main-background-color rounded-[3px] overflow-hidden transform transition-all hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-xl border border-divider-color-20 hover:border-divider-color-40">
            <div className="relative h-[200px] md:h-[240px] overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60 z-10" />

                <Image
                    src={image}
                    alt={title}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="transition-transform hover:scale-110 duration-700"
                />

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <span className="inline-block bg-white/80 text-primary-cta-layer-color-90 font-metro-regular text-xs px-2 py-1 rounded-sm mb-2">
                        {category}
                    </span>
                    <h3 className="font-metro-bold text-white text-xl md:text-2xl">{title}</h3>
                </div>
            </div>

            <div className="p-4 md:p-5">
                <p className="text-text-color-60 font-metro-regular text-sm md:text-base">{description}</p>

                <div className="mt-4 flex justify-end">
                    <button className="bg-primary-cta-color-60 text-primary-cta-layer-color-90 px-4 py-2 rounded-sm hover:bg-primary-cta-color-80 transition-colors text-sm font-metro-medium">
                        Launch App
                    </button>
                </div>
            </div>
        </div>
    );
});

AppCard.displayName = 'AppCard';
