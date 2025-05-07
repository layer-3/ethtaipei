import React from 'react';

interface QuickAmountButtonsProps {
    onSelectAmount: (percentage: number) => void;
}

export const QuickAmountButtons: React.FC<QuickAmountButtonsProps> = ({ onSelectAmount }) => {
    const percentages = [25, 50, 75, 100];

    return (
        <div className="flex justify-between gap-1.5">
            {percentages.map((percentage) => (
                <button
                    key={percentage}
                    onClick={() => onSelectAmount(percentage)}
                    className="flex-1 py-1.5 px-1 rounded-md transition-all text-sm font-medium
                        bg-black text-white border border-white/30 hover:border-white hover:bg-white hover:text-black"
                >
                    {percentage === 100 ? 'MAX' : `${percentage}%`}
                </button>
            ))}
        </div>
    );
};
