import { useState } from 'react';
import Image from 'next/image';

interface AppItem {
    id: string;
    title: string;
    category: string;
    description: string;
    image: string;
}

export function AppCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0);

    // Featured Apps data
    const apps: AppItem[] = [
        {
            id: 'p2p-trading',
            title: 'P2P Trading',
            category: 'Finance/Exchange',
            description: 'Direct peer-to-peer token swaps with no intermediaries',
            image: '/images/apps/p2p-trading.svg',
        },
        {
            id: 'defi-dashboard',
            title: 'DeFi Dashboard',
            category: 'Finance/Analytics',
            description: 'Track your DeFi investments and protocol interactions from one place',
            image: '/images/apps/defi-dashboard.svg',
        },
        {
            id: 'liquidity-pool',
            title: 'Liquidity Pool',
            category: 'Finance/Investment',
            description: 'Provide liquidity to token pairs and earn trading fees',
            image: '/images/apps/liquidity-pool.svg',
        },
        {
            id: 'cross-chain-bridge',
            title: 'Cross-Chain Bridge',
            category: 'Utility/Infrastructure',
            description: 'Transfer assets securely between different blockchain networks',
            image: '/images/apps/cross-chain-bridge.svg',
        },
    ];

    // Display 2 slides at a time on larger screens
    const maxSlides = apps.length - 2;

    const nextSlide = () => {
        setCurrentSlide((current) => (current === maxSlides ? 0 : current + 1));
    };

    const prevSlide = () => {
        setCurrentSlide((current) => (current === 0 ? maxSlides : current - 1));
    };

    return (
        <div className="hidden md:block w-full py-6 mb-12">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Featured Apps</h3>
                <div className="flex space-x-2">
                    <button onClick={prevSlide} className="transform rotate-180" aria-label="Previous slide">
                        <img src="/images/apps/carousel-arrow.svg" alt="Previous" className="w-10 h-10" />
                    </button>
                    <button onClick={nextSlide} aria-label="Next slide">
                        <img src="/images/apps/carousel-arrow.svg" alt="Next" className="w-10 h-10" />
                    </button>
                </div>
            </div>

            <div className="relative overflow-hidden">
                <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 50}%)` }}
                >
                    {apps.map((app) => (
                        <div key={app.id} className="w-1/2 flex-shrink-0 px-3">
                            <div className="flex flex-col bg-white rounded-[3px] overflow-hidden transform transition-all hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-xl border border-gray-200 hover:border-gray-300 h-full">
                                <div className="relative h-[230px] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60 z-10" />

                                    <Image
                                        src={app.image}
                                        alt={app.title}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        className="transition-transform hover:scale-110 duration-700"
                                    />

                                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                                        <span className="inline-block bg-white/80 text-gray-700 text-xs px-2 py-1 rounded-[2px] mb-2">
                                            {app.category}
                                        </span>
                                        <h3 className="font-bold text-white text-xl md:text-2xl">{app.title}</h3>
                                    </div>
                                </div>

                                <div className="p-4 md:p-5 flex flex-col flex-grow">
                                    <p className="text-gray-600 text-sm md:text-base mb-6">{app.description}</p>

                                    <div className="mt-auto flex justify-end">
                                        <button className="bg-[#FCD000] text-black px-4 py-2 rounded-[2px] hover:bg-[#FFDA33] transition-colors text-sm font-medium">
                                            Launch App
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center mt-6">
                {[...Array(maxSlides + 1)].map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 mx-1 rounded-full ${currentSlide === index ? 'bg-gray-800' : 'bg-gray-300'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
