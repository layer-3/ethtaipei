import { memo } from 'react';

interface ActionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}

export const ActionButton = memo(({ onClick, children, disabled }: ActionButtonProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="bg-primary text-black py-2 rounded-md hover:bg-primary-hover px-8 transition-colors font-normal"
    >
        {children}
    </button>
));

ActionButton.displayName = 'ActionButton';
