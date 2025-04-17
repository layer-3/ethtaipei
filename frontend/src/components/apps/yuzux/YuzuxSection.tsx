import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Types for carousel slides
type SlideAction = 'openApp';

interface Slide {
    id: number;
    image: {
        src: string;
        alt: string;
    };
    logo: string;
    title: string;
    description: string;
    buttonText: string;
    buttonAction: SlideAction;
}

interface YuzuxSectionProps {
    onOpenYuzux: () => void;
}

// Constants
const AUTO_ROTATION_INTERVAL = 10000; // 5 seconds

/**
 * YuzuxSection - Displays a carousel banner for Yuzux features
 *
 * Features:
 * - Responsive design for mobile and desktop
 * - Auto-rotating carousel with pause functionality
 * - Interactive navigation controls
 * - Custom content for each slide
 */
export function YuzuxSection({ onOpenYuzux }: YuzuxSectionProps) {
    // Define carousel slides with content
    const carouselSlides: Slide[] = useMemo(
        () => [
            {
                id: 1,
                image: {
                    src: '/clearnet_icons/desktop_yuzux_banner.png',
                    alt: 'Fast Payments with Yuzux',
                },
                logo: '/logo_yuzux.png',
                title: 'Yuzux',
                description: 'Fast, secure payments via state channels technology',
                buttonText: 'Open App',
                buttonAction: 'openApp',
            },
            {
                id: 2,
                image: {
                    src: '/images/apps/p2p-trading.svg',
                    alt: 'Peer-to-Peer Trading',
                },
                logo: '/logo_yuzux.png',
                title: 'P2P Trading',
                description: 'Direct peer-to-peer token swaps with no intermediaries',
                buttonText: 'Trade Now',
                buttonAction: 'openApp',
            },
            {
                id: 3,
                image: {
                    src: '/images/apps/defi-dashboard.svg',
                    alt: 'DeFi Dashboard',
                },
                logo: '/logo_yuzux.png',
                title: 'DeFi Dashboard',
                description: 'Track your DeFi investments and protocol interactions',
                buttonText: 'Explore',
                buttonAction: 'openApp',
            },
            {
                id: 4,
                image: {
                    src: '/images/apps/cross-chain-bridge.svg',
                    alt: 'Cross-Chain Bridge',
                },
                logo: '/logo_yuzux.png',
                title: 'Cross-Chain Bridge',
                description: 'Transfer assets securely between different blockchain networks',
                buttonText: 'Connect',
                buttonAction: 'openApp',
            },
        ],
        [],
    );

    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-rotate carousel unless paused
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentSlide((current) => (current === carouselSlides.length - 1 ? 0 : current + 1));
        }, AUTO_ROTATION_INTERVAL);

        // Cleanup interval on component unmount or when isPaused changes
        return () => clearInterval(interval);
    }, [isPaused, carouselSlides.length]);

    // Memoize handlers to prevent unnecessary re-renders
    const nextSlide = useCallback(() => {
        setCurrentSlide((current) => (current === carouselSlides.length - 1 ? 0 : current + 1));
    }, [carouselSlides.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((current) => (current === 0 ? carouselSlides.length - 1 : current - 1));
    }, [carouselSlides.length]);

    const togglePause = useCallback(() => {
        setIsPaused((current) => !current);
    }, []);

    // Handle button click based on the current slide's action type
    const handleSlideAction = useCallback(() => {
        const currentSlideData = carouselSlides[currentSlide];

        switch (currentSlideData.buttonAction) {
            case 'openApp':
                onOpenYuzux();
                break;
            default:
                // Default case as a fallback
                onOpenYuzux();
        }
    }, [currentSlide, onOpenYuzux, carouselSlides]);

    // Mobile version content component
    const MobileVersion = () => (
        <section className="md:hidden flex flex-col justify-center items-center">
            <Image
                src="/clearnet_icons/yuzux_banner.png"
                className="mt-4"
                alt="Yuzux"
                width={708}
                height={400}
                priority
            />
            <div className="flex items-center w-full max-w-md gap-x-2 gap-y-0 mt-2 mb-8">
                <Image src="/logo_yuzux.png" alt="Yuzux Logo" width={32} height={32} />
                <div>
                    <h1 className="text-lg font-bold">Yuzux</h1>
                    <p className="text-gray-600 text-sm">Fast payments via state channels</p>
                </div>
            </div>

            <button
                onClick={onOpenYuzux}
                className="w-full max-w-md bg-[#FCD000] text-black py-2 rounded-[2px] hover:bg-[#FFDA33] transition-all font-normal transform hover:scale-105 duration-200"
                aria-label="Open Yuzux App"
            >
                Open App
            </button>
        </section>
    );

    // Carousel navigation buttons component
    const CarouselNavButtons = () => (
        <>
            {/* Left navigation button */}
            <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-40 bg-black/30 hover:bg-black/50 w-12 h-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                aria-label="Previous slide"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="white"
                    viewBox="0 0 24 24"
                    className="w-6 h-6 transform rotate-180"
                >
                    <path d="M9.354 5.354a.5.5 0 0 0-.707 0l-.704.703a.5.5 0 0 0 0 .707L13.17 12l-5.227 5.236a.5.5 0 0 0 0 .707l.704.703a.5.5 0 0 0 .707 0l6.293-6.292a.5.5 0 0 0 0-.707L9.354 5.353Z" />
                </svg>
            </button>

            {/* Right navigation button */}
            <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-40 bg-black/30 hover:bg-black/50 w-12 h-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                aria-label="Next slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M9.354 5.354a.5.5 0 0 0-.707 0l-.704.703a.5.5 0 0 0 0 .707L13.17 12l-5.227 5.236a.5.5 0 0 0 0 .707l.704.703a.5.5 0 0 0 .707 0l6.293-6.292a.5.5 0 0 0 0-.707L9.354 5.353Z" />
                </svg>
            </button>
        </>
    );

    // Carousel controls component for pause/play and pagination
    const CarouselControls = () => (
        <div className="hidden md:flex items-center justify-center mt-4 gap-3">
            {/* Pause/Play button */}
            <button
                onClick={togglePause}
                className="flex items-center justify-center p-1 cursor-pointer group"
                aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
            >
                {isPaused ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6 text-gray-500 group-hover:text-gray-700"
                    >
                        <path
                            fillRule="evenodd"
                            d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                        />
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6 text-gray-500 group-hover:text-gray-700"
                    >
                        <path
                            fillRule="evenodd"
                            d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                        />
                    </svg>
                )}
            </button>

            {/* Pagination pills */}
            <div className="flex justify-center gap-2">
                {carouselSlides.map((slide, index) => (
                    <button
                        key={slide.id}
                        className="relative h-[3px] w-9 py-2 cursor-pointer"
                        onClick={() => setCurrentSlide(index)}
                        aria-label={`Go to ${slide.title} slide${currentSlide === index ? ', active slide' : ''}`}
                        aria-controls="carousel-container"
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute top-1/2 left-0 right-0 h-[3px] transform -translate-y-1/2 transition-colors duration-300 ${
                                currentSlide === index ? 'bg-[#FCD000]' : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <MobileVersion />

            {/* Desktop Version - Carousel Design */}
            <section className="hidden md:block relative w-full">
                <div
                    id="carousel-container"
                    className="relative w-full h-[320px] lg:h-[360px] overflow-hidden rounded-[4px] group"
                >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/70 to-transparent z-10" />

                    {/* Carousel images */}
                    <div className="relative w-full h-full">
                        {carouselSlides.map((slide, index) => (
                            <div
                                key={slide.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ${
                                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                                }`}
                                aria-hidden={index !== currentSlide}
                            >
                                <Image
                                    src={slide.image.src}
                                    alt={slide.image.alt}
                                    fill
                                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                                    priority={index === 0}
                                    className="transition-transform duration-700"
                                />
                            </div>
                        ))}
                    </div>

                    <CarouselNavButtons />

                    {/* Dynamic content overlay for each slide */}
                    {carouselSlides.map((slide, index) => (
                        <div
                            key={`content-${slide.id}`}
                            className={`absolute inset-0 z-30 flex flex-col justify-center px-12 lg:px-16 transition-opacity duration-1000 ${
                                index === currentSlide ? 'opacity-100' : 'opacity-0'
                            }`}
                            aria-hidden={index !== currentSlide}
                        >
                            <div className="max-w-md">
                                <div className="flex items-center gap-x-3 mb-3">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-white">{slide.title}</h1>
                                </div>

                                <p className="text-lg text-gray-300 mb-4 md:mb-5">{slide.description}</p>

                                <button
                                    onClick={handleSlideAction}
                                    className="w-auto bg-[#FCD000] text-black py-2 px-6 rounded-[2px] hover:bg-[#FFDA33] transition-all font-medium transform hover:scale-105 duration-200 text-base"
                                    aria-label={slide.buttonText}
                                >
                                    {slide.buttonText}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <CarouselControls />
            </section>
        </>
    );
}
