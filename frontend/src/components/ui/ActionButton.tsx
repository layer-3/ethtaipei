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
        className="bg-primary-cta-color-60 text-primary-cta-layer-color-90 py-2 rounded-md hover:bg-primary-cta-color-80 disabled:bg-neutral-control-color-40 disabled:text-neutral-control-layer-color-80 disabled:pointer-events-none px-8 transition-colors font-normal">
        {children}
    </button>
));

ActionButton.displayName = 'ActionButton';
