import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';

interface ChallengeChannelProps {
    onChallenge: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const ChallengeChannel: React.FC<ChallengeChannelProps> = ({ onChallenge, isLoading, response }) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">7. Challenge Channel</h2>
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                    Challenge a channel if you believe the other party is not cooperating. This uses the state stored in
                    your local storage.
                </p>

                <div className="flex items-center justify-end">
                    <ActionButton onClick={onChallenge} disabled={isLoading}>
                        Challenge Channel
                    </ActionButton>
                </div>
            </div>

            <DebugResponse sectionKey="challenge" response={response} loading={isLoading} />
            <RawResponse sectionKey="challenge" response={response} />
        </section>
    );
};
