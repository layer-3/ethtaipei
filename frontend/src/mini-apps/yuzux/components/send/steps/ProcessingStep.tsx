import React from 'react';
import { LoadingSpinner } from '../../common/StatusIndicator';

interface ProcessingStepProps {
    processingError: string | null;
    onRetry: () => void;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ processingError, onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            {processingError ? (
                <div className="text-center text-system-red-60">
                    <h2 className="text-2xl font-metro-semibold mb-2 text-white">Error</h2>
                    <p className="text-gray-400 font-metro-regular break-words px-4">{processingError}</p>
                    <button
                        onClick={onRetry}
                        className="mt-4 bg-white text-black py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-metro-regular border border-white">
                        Try Again
                    </button>
                </div>
            ) : (
                <>
                    <LoadingSpinner />
                    <div className="text-center">
                        <h2 className="text-2xl font-metro-semibold mb-2 text-white">Processing</h2>
                        <p className="text-gray-400 font-metro-regular">Sending payment via virtual channel...</p>
                    </div>
                </>
            )}
        </div>
    );
};
