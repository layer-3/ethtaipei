import React from 'react';

interface ISpinnerProps {
    className?: string;
}

const SpinnerComponent: React.FC<ISpinnerProps> = ({ className }) => {
    return (
        <svg width="16" height="16" viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="3" fill="currentColor" />
            <path
                className="spinner_Pcrv"
                fill="currentColor"
                d="M2.667,16A14.6,14.6,0,0,1,6.667,6.2c-.28-.25-.56-.48-.83-.73h0A14.667,14.667,0,0,0,16,30.667c.453,0,.897-.067,1.333-.133C8,30.667,2.667,23.653,2.667,16Z"
            />
        </svg>
    );
};

export const Spinner = React.memo(SpinnerComponent);
