import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
    const sizes = {
        sm: { outer: 'w-10 h-10', inner: 'w-5 h-5' },
        md: { outer: 'w-16 h-16', inner: 'w-8 h-8' },
        lg: { outer: 'w-20 h-20', inner: 'w-10 h-10' },
    };

    return (
        <div className="mb-6 relative">
            <div className={`${sizes[size].outer} border-4 border-white rounded-full animate-spin`} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className={`${sizes[size].inner} bg-black rounded-full`} />
            </div>
        </div>
    );
};

interface SuccessCheckmarkProps {
    size?: 'sm' | 'md' | 'lg';
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({ size = 'md' }) => {
    const sizes = {
        sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
        md: { container: 'w-16 h-16', icon: 'w-8 h-8' },
        lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
    };

    return (
        <div className="mb-6 relative">
            <div
                className={`${sizes[size].container} border-4 border-white rounded-full flex items-center justify-center`}
            >
                <svg className={`${sizes[size].icon} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>
    );
};
