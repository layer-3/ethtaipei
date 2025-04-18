import React, { useEffect, useState, useRef, TouchEvent } from 'react';
import { useDeviceDetection } from '@/hooks/device/useDeviceDetection';

export type AnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [animationState, setAnimationState] = useState<AnimationState>('exited');
    const { isMobile } = useDeviceDetection();
    const [swipeDistance, setSwipeDistance] = useState(0);
    const [horizontalSwipeDistance, setHorizontalSwipeDistance] = useState(0);
    const startYRef = useRef<number | null>(null);
    const startXRef = useRef<number | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && animationState === 'exited') {
            setAnimationState('entering');
            setTimeout(() => setAnimationState('entered'), 10);
        } else if (!isOpen && (animationState === 'entered' || animationState === 'entering')) {
            setAnimationState('exiting');
            setTimeout(() => setAnimationState('exited'), 300);
        }
    }, [isOpen, animationState]);

    const handleClose = () => {
        setAnimationState('exiting');
        setTimeout(() => {
            setAnimationState('exited');
            onClose();
        }, 300);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (!isMobile) return;
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!isMobile) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;

        // Handle vertical swipe (existing functionality)
        if (startYRef.current !== null) {
            const deltaY = currentY - startYRef.current;

            // Only allow downward swipes (positive deltaY)
            if (deltaY > 0) {
                setSwipeDistance(deltaY);
            }
        }

        // Handle horizontal swipe (new functionality)
        if (startXRef.current !== null) {
            const deltaX = startXRef.current - currentX;

            // Only allow right-to-left swipes (positive deltaX)
            if (deltaX > 0) {
                setHorizontalSwipeDistance(deltaX);
            }
        }
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;

        const VERTICAL_SWIPE_THRESHOLD = 100; // pixels
        const HORIZONTAL_SWIPE_THRESHOLD = 100; // pixels

        // Check if either swipe threshold is met
        const shouldClose =
            swipeDistance > VERTICAL_SWIPE_THRESHOLD || horizontalSwipeDistance > HORIZONTAL_SWIPE_THRESHOLD;

        if (shouldClose) {
            // Close the modal if swipe distance exceeds threshold
            handleClose();
        }

        // Reset swipe distances with animation
        setSwipeDistance(0);
        setHorizontalSwipeDistance(0);
        startYRef.current = null;
        startXRef.current = null;
    };

    if (animationState === 'exited' && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
                    animationState === 'entering' || animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
                }`}
            />

            <div
                ref={modalRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${
                        animationState === 'entering'
                            ? '100%'
                            : animationState === 'entered'
                              ? `${horizontalSwipeDistance}px`
                              : '100%'
                    }) translateY(${swipeDistance}px)`,
                    transition:
                        swipeDistance === 0 && horizontalSwipeDistance === 0 ? 'transform 300ms ease-in-out' : 'none',
                }}
                className="fixed inset-0 z-10 flex flex-col bg-black overflow-hidden transition-transform duration-300 ease-in-out transform"
            >
                <div className="flex items-center p-4 relative z-50 bg-black">
                    <button onClick={handleClose} className="absolute left-4 text-white hover:text-gray-200">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-semibold text-white w-full text-center">{title}</h2>
                </div>

                {children}
            </div>
        </div>
    );
};
