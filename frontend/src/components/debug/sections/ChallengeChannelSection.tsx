import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay

interface ChallengeChannelSectionProps {
    onChallenge: () => void;
    isLoading: boolean;
    response: any; // Add response prop
}

export const ChallengeChannelSection: React.FC<ChallengeChannelSectionProps> = ({
    onChallenge,
    isLoading,
    response, // Destructure response
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
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
        </section>
    );
};
