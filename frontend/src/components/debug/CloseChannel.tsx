import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';

interface CloseChannelProps {
    onClose: () => Promise<void>;
    isLoading: boolean;
    response: any;
    channelCount: number;
}

export const CloseChannel: React.FC<CloseChannelProps> = ({ onClose, isLoading, response, channelCount }) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">8. Close Channel</h2>
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                    Close your payment channel and settle the final balance on-chain.
                </p>

                <div className="flex items-center justify-end">
                    <ActionButton onClick={onClose} disabled={isLoading || channelCount === 0}>
                        Close Channel
                    </ActionButton>
                </div>
            </div>

            <DebugResponse sectionKey="closeChannel" response={response} loading={isLoading} />
            <RawResponse sectionKey="closeChannel" response={response} />
        </section>
    );
};
