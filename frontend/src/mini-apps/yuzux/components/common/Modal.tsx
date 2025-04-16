import React, { useEffect, useState } from 'react';

export type AnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const [animationState, setAnimationState] = useState<AnimationState>('exited');

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

    if (animationState === 'exited' && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
                    animationState === 'entering' || animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
                }`}
            />

            <div
                className={`fixed inset-0 z-10 flex flex-col bg-black overflow-hidden transition-transform duration-300 ease-in-out transform ${
                    animationState === 'entering'
                        ? 'translate-x-full'
                        : animationState === 'entered'
                          ? 'translate-x-0'
                          : 'translate-x-full'
                }`}
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
