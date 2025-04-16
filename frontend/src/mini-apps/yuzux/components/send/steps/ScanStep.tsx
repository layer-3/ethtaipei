import React from 'react';
import { QrScanner } from '../../QrScanner';

interface ScanStepProps {
    onScan: (data: string) => void;
    onSwitchToManual: () => void;
}

export const ScanStep: React.FC<ScanStepProps> = ({ onScan, onSwitchToManual }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1">
                <QrScanner onScan={onScan} />
            </div>
            <div className="p-4">
                <button
                    onClick={onSwitchToManual}
                    className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white">
                    Enter Manually
                </button>
            </div>
        </div>
    );
};