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
            <h3 className="text-md font-metro-regular mb-2 text-text-color-80">{title}</h3>
            <p className={`text-xs ${debugOnly ? 'text-system-red-60' : 'text-text-color-60'} mb-2`}>{desc}</p>
            <div className="p-3 rounded border border-gray-300 flex items-center gap-">
                <div className="w-full font-metro-regular text-sm text-text-color-80 break-all">
                    {address ?? 'Not connected'}
                </div>
                <button
                    onClick={handleCopyAddress}
                    disabled={!address}
                    className={`font-mono text-sm px-2 py-1 rounde disabled:opacity-50 disabled:pointer-events-none min-w-[68px] ${isCopied ? 'bg-system-green-20' : 'bg-neutral-control-color-20 hover:bg-neutral-control-color-40'}`}>
                    {isCopied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
};
