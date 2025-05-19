import { useCopy } from '@/hooks/utils/useCopy';
import React from 'react';

interface IAddressItem {
    title: string;
    desc: string;
    debugOnly?: boolean;
    address?: string;
}

export const AddressItem: React.FC<IAddressItem> = ({ desc, title, address, debugOnly }: IAddressItem) => {
    const { copy: handleCopyAddress, isCopied } = useCopy({ content: address });

    return (
        <div className="mb-4">
            <h3 className="text-md text-dark mb-2 text-gray-800">{title}</h3>
            <p className={`text-xs ${debugOnly ? 'text-red-500' : 'text-gray-500'} mb-2`}>{desc}</p>
            <div className="p-3 rounded border border-gray-300 flex items-center gap-">
                <div className="w-full font-mono text-sm text-gray-800 break-all">{address ?? 'Not connected'}</div>
                <button
                    onClick={handleCopyAddress}
                    disabled={!address}
                    className={`font-mono text-sm px-2 py-1 rounde disabled:opacity-50 disabled:pointer-events-none min-w-[68px] ${isCopied ? 'bg-green-100' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    {isCopied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
};
