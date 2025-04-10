import { memo } from 'react';

interface ActionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
}

export const ActionButton = memo(({ onClick, children }: ActionButtonProps) => (
    <button
        onClick={onClick}
        className="bg-primary text-black py-2 rounded-md hover:bg-primary-hover px-8 transition-colors font-normal"
    >
        {children}
    </button>
));

ActionButton.displayName = 'ActionButton';
