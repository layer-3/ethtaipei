import { CircleCheckMarkIcon } from '@/assets/images/CircleCheckMarkIcon';
import { ClipboardIcon } from '@/assets/images/ClipboardIcon';
import React, { useState, useCallback } from 'react';

interface AddressDisplayProps {
    address: string | null;
    className?: string;
    showFull?: boolean; // Add option to control display mode
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
    address,
    className = '',
    showFull = true, // Default to showing the full address
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopyAddress = useCallback(() => {
        if (!address) return;

        navigator.clipboard.writeText(address);
        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }, [address]);

    // Format address to show first 6 and last 4 characters if not showing full
    const formatAddress = (addr: string): string => {
        if (!addr || addr.length < 12) return addr;
        return showFull ? addr : `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    if (!address) return null;

    return (
        <div className={`flex items-center justify-center gap-2 mt-4 ${className}`}>
            <div
                className="bg-gray-800 rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-gray-700 transition-colors max-w-full"
                onClick={handleCopyAddress}
                aria-label={`Copy address: ${address}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleCopyAddress();
                    }
                }}>
                <span className="font-medium text-white text-sm overflow-auto break-all">{formatAddress(address)}</span>

                {copied ? (
                    <CircleCheckMarkIcon className="bi bi-check-circle-fill flex-shrink-0 text-system-green-60" />
                ) : (
                    <ClipboardIcon className="bi bi-clipboard text-gray-400 flex-shrink-0" />
                )}

                {copied && (
                    <span className="text-xs text-system-green-60 font-metro-medium ml-1 flex-shrink-0">Copied</span>
                )}
            </div>
        </div>
    );
};
