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
                <div className="text-center text-red-500">
                    <h2 className="text-2xl font-semibold mb-2 text-white">Error</h2>
                    <p className="text-gray-400 break-words px-4">{processingError}</p>
                    <button
                        onClick={onRetry}
                        className="mt-4 bg-white text-black py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white"
                    >
                        Try Again
                    </button>
                </div>
            ) : (
                <>
                    <LoadingSpinner />
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-2 text-white">Processing</h2>
                        <p className="text-gray-400">Sending payment via virtual channel...</p>
                    </div>
                </>
            )}
        </div>
    );
};
