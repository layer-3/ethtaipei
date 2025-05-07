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
                }}
            >
                <span className="font-medium text-white text-sm overflow-auto break-all">{formatAddress(address)}</span>

                {copied ? (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="#4ade80"
                        className="bi bi-check-circle-fill flex-shrink-0"
                        viewBox="0 0 16 16"
                    >
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-clipboard text-gray-400 flex-shrink-0"
                        viewBox="0 0 16 16"
                    >
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                    </svg>
                )}

                {copied && <span className="text-xs text-green-400 font-medium ml-1 flex-shrink-0">Copied</span>}
            </div>
        </div>
    );
};
