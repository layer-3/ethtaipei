import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { AccountInfo } from '@/store/types';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { CodeBlock } from '../common/CodeBlock';

interface CloseChannelSectionProps {
    accountInfo: AccountInfo;
    onClose: () => void;
    isLoading: boolean;
    response: any;
}

export const CloseChannelSection: React.FC<CloseChannelSectionProps> = ({
    accountInfo,
    onClose,
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

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">8. Close Channel</h2>
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                    Close your payment channel and settle the final balance on-chain.
                </p>

                <div className="flex items-center justify-end">
                    <ActionButton onClick={onClose} disabled={isLoading || accountInfo.channelCount === 0}>
                        Close Channel
                    </ActionButton>
                </div>
            </div>
            {renderResponse()}
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
            <CodeBlock
                text={`
// 1. Import the hook (assuming a hook like useChannel exists)
import { useChannel } from '@/hooks/debug/useChannel'; // Adjust path

// 2. Use the hook in your component
const { closeChannel, isLoading, response, accountInfo } = useChannel(); // Assuming hook provides accountInfo or channelId

// 3. Call the closeChannel function
const handleClose = async () => {
  // May need channelId from accountInfo or hook state
  if (accountInfo.channelCount === 0) return;
  await closeChannel(/* potentially pass channelId if needed */);
  // Hook manages isLoading and response
};

// 4. Render UI elements
<ActionButton onClick={handleClose} disabled={isLoading || accountInfo.channelCount === 0}>
  Close Channel
</ActionButton>
{/* Display response/loading state */}
        `}
            />
        </section>
    );
};
