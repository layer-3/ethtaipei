import React, { useState, useCallback } from 'react';
import { shortenHex } from '@/helpers/shortenHex';

interface AddressDisplayProps {
    address: string | null;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({ address }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyAddress = useCallback(() => {
        if (!address) return;

        navigator.clipboard.writeText(address);
        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }, [address]);

    return (
        <div className="text-center w-full max-w-md mt-4" onClick={handleCopyAddress}>
            <h3 className="font-normal text-white mb-2 text-sm">{shortenHex(address, 14)}</h3>
        </div>
    );
};
