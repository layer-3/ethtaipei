import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';

interface VirtualChannelCloseProps {
    allocations: {
        participantA: string;
        participantB: string;
    };
    onAllocationChange: (participant: 'participantA' | 'participantB', value: string) => void;
    virtualChannelId: string;
    onCloseVirtualChannel: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const VirtualChannelClose: React.FC<VirtualChannelCloseProps> = ({
    allocations,
    onAllocationChange,
    virtualChannelId,
    onCloseVirtualChannel,
    isLoading,
    response,
}) => {
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
                                onChange={(e) => onAllocationChange('participantA', e.target.value)}
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
                                onChange={(e) => onAllocationChange('participantB', e.target.value)}
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

            <DebugResponse sectionKey="closeVirtualChannel" response={response} loading={isLoading} />
            <RawResponse sectionKey="closeVirtualChannel" response={response} />
        </section>
    );
};
