import React from 'react';

interface BackIconProps {
    className?: string;
}

export const BackIcon: React.FC<BackIconProps> = ({ className }) => {
    return (
        <svg
            className={className}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    );
};