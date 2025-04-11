import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';

interface ChallengeChannelSectionProps {
    onChallenge: () => void;
    isLoading: boolean;
    response: any;
}

export const ChallengeChannelSection: React.FC<ChallengeChannelSectionProps> = ({
    onChallenge,
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

            {renderResponse()}
            {renderRawResponse()}
        </section>
    );
};
