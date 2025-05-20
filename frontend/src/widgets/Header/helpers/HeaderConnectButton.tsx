import { WalletConnectSquareIcon } from '@/assets/images/WalletIcons';
import React, { useCallback } from 'react';

interface IHeaderConnectButtonProps {
    setOpenConnect?: (open: boolean) => void;
    containerClassName?: string;
}

const HeaderConnectButtonComponent: React.FC<IHeaderConnectButtonProps> = ({
    setOpenConnect,
    containerClassName = 'pl-1',
}) => {
    const handleConnectClick = useCallback(() => {
        setOpenConnect && setOpenConnect?.(true);
    }, [setOpenConnect]);

    return (
        <div className={containerClassName}>
            <button
                onClick={handleConnectClick}
                className="h-9 w-9 p-1.5 flex items-center justify-center bg-neutral-control-color-30 shadow-sm rounded-lg hover:bg-neutral-control-color-10 active:bg-neutral-control-color-30 hover:shadow">
                <WalletConnectSquareIcon
                    className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    fillColor="var(--neutral-control-layer-color-70)"
                />
            </button>
        </div>
    );
};

export const HeaderConnectButton = React.memo(HeaderConnectButtonComponent);
