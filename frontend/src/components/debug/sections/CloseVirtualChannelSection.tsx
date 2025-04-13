import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';

interface CloseVirtualChannelSectionProps {
    allocations: {
        participantA: string;
        participantB: string;
    };
    setAllocations: React.Dispatch<React.SetStateAction<{ participantA: string; participantB: string }>>;
    virtualChannelId: string;
    onCloseVirtualChannel: () => void;
    isLoading: boolean;
    response: any;
}

export const CloseVirtualChannelSection: React.FC<CloseVirtualChannelSectionProps> = ({
    allocations,
    setAllocations,
    virtualChannelId,
    onCloseVirtualChannel,
    isLoading,
    response,
}) => {
    // Helper to display responses
    const renderResponse = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
                </div>
            );
        }

        if (!response) return null;

        if (response.error) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                    <p className="text-red-600">Error: {response.error}</p>
                </div>
            );
        }

        return (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-3">
                <pre className="whitespace-pre-wrap break-words text-sm overflow-x-auto max-h-60">
                    {JSON.stringify(response, null, 2)}
                </pre>
            </div>
        );
    };

    // Helper to display raw responses
    const renderRawResponse = () => {
        if (!response) return null;

        return (
            <div className="mt-4">
                <details className="cursor-pointer">
                    <summary className="text-sm text-gray-500">Raw Response</summary>
                    <div className="bg-gray-50 p-3 mt-2 rounded-md overflow-x-auto text-xs">
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(response, null, 2)}</pre>
                    </div>
                </details>
            </div>
        );
    };

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">6. Close Virtual Channel</h2>
            <div className="mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your allocation:</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="text"
                                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                value={allocations.participantA}
                                onChange={(e) => setAllocations((prev) => ({ ...prev, participantA: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Partner allocation:</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="text"
                                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                                value={allocations.participantB}
                                onChange={(e) => setAllocations((prev) => ({ ...prev, participantB: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Adjust allocations to finalize the virtual payment before closing the channel.
                </p>

                <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-gray-600">
                        {virtualChannelId
                            ? `Channel ID: ${virtualChannelId.substring(0, 10)}...`
                            : 'No active virtual channel'}
                    </p>
                    <ActionButton onClick={onCloseVirtualChannel} disabled={isLoading || !virtualChannelId}>
                        Close Virtual Channel
                    </ActionButton>
                </div>
            </div>

            {renderResponse()}
            {renderRawResponse()}
        </section>
    );
};
