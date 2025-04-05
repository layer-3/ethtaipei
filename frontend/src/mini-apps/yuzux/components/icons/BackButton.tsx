import React from 'react';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button 
      onClick={onClick} 
      className={`text-white hover:text-gray-200 p-1 ${className}`}
      aria-label="Back"
    >
      <svg
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
    </button>
  );
};