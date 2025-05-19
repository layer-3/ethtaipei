import React from 'react';
import { QrScanner } from '../../QrScanner';

interface ScanStepProps {
    onScan: (data: string) => void;
    onSwitchToManual: () => void;
}

export const ScanStep: React.FC<ScanStepProps> = ({ onScan, onSwitchToManual }) => {
    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1">
                <QrScanner onScan={onScan} />
            </div>
            {/* Bottom button with higher z-index to stay above scanner */}
            <div className="p-4 absolute bottom-0 w-full z-20">
                <button
                    onClick={onSwitchToManual}
                    className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white font-metro-semibold">
                    Enter Manually
                </button>
            </div>
        </div>
    );
};
