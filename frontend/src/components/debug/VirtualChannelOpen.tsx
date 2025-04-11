import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';

interface VirtualChannelOpenProps {
    virtualChannelAmount: string;
    onVirtualChannelAmountChange: (value: string) => void;
    selectedParticipant: string;
    onOpenVirtualChannel: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const VirtualChannelOpen: React.FC<VirtualChannelOpenProps> = ({
    virtualChannelAmount,
    onVirtualChannelAmountChange,
    selectedParticipant,
    onOpenVirtualChannel,
    isLoading,
    response,
}) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">5. Open Virtual Channel</h2>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to lock in virtual channel:
                </label>
                <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                        type="text"
                        name="amount"
                        id="amount"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                        value={virtualChannelAmount}
                        onChange={(e) => onVirtualChannelAmountChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Selected Participant: </p>
                        <p className={`text-xs font-mono ${selectedParticipant ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedParticipant || 'No participant selected'}
                        </p>
                    </div>
                    <ActionButton onClick={onOpenVirtualChannel} disabled={isLoading || !selectedParticipant}>
                        Open Virtual Channel
                    </ActionButton>
                </div>
            </div>

            <DebugResponse sectionKey="virtualChannel" response={response} loading={isLoading} />
            <RawResponse sectionKey="virtualChannel" response={response} />
        </section>
    );
};
