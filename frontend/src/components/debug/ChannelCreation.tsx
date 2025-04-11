import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';
import { AccountInfo } from '@/store/types';

interface ChannelCreationProps {
    currentLocked: string;
    currentDeposit: string;
    accountInfo: AccountInfo;
    onCreateChannel: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const ChannelCreation: React.FC<ChannelCreationProps> = ({
    currentLocked,
    accountInfo,
    currentDeposit,
    onCreateChannel,
    isLoading,
    response,
}) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">3. Create Channel</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="mb-2">
                        Locked Balance: <span className="font-semibold text-blue-600">${currentLocked}</span>
                    </p>
                    <p className="mb-2">
                        Open Channels: <span className="font-semibold">{accountInfo.channelCount}</span>
                    </p>
                    <p className="text-sm text-gray-600">Creating a channel will lock your available balance.</p>
                </div>
                <div className="flex items-center justify-end">
                    <ActionButton onClick={onCreateChannel} disabled={isLoading || Number(currentDeposit) <= 0}>
                        Create Channel
                    </ActionButton>
                </div>
            </div>
            <DebugResponse sectionKey="createChannel" response={response} loading={isLoading} />
            <RawResponse sectionKey="createChannel" response={response} />
        </section>
    );
};
