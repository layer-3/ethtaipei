import React, { useState, useCallback } from 'react';
import { CopyIcon } from './icons';

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
        <div className="text-center w-full max-w-md">
            <h3 className="font-normal text-white mb-2">Your Address</h3>
            <div className="bg-black border border-white px-4 py-3 rounded-lg">
                <p className="font-mono text-sm break-all text-white">
                    {address || 'Not connected'}
                </p>
            </div>

            <button 
                onClick={handleCopyAddress}
                disabled={!address}
                className="mt-6 inline-flex items-center px-6 py-3 border border-white rounded-md shadow-sm text-sm font-normal text-black bg-white hover:bg-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                <CopyIcon className="-ml-1 mr-2 h-5 w-5 text-black" />
                {copied ? 'Copied!' : 'Copy Address'}
            </button>
        </div>
    );
};