import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { CodeBlock } from '../common/CodeBlock';

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
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// 1. Get necessary state/client/hooks
const walletSnap = useSnapshot(WalletStore.state);
const nitroSnap = useSnapshot(NitroliteStore.state);
const { setResponse, addToHistory } = useResponseTracking();
const { fetchAccountInfo } = useDebugAccount(/* ... */);

// 2. Define the handler passed as 'onChallenge' prop
const handleChallenge = async () => {
  if (!walletSnap.connected || !nitroSnap.client) {
      console.error('Wallet not connected or Nitro client not available');
      addToHistory('challenge', 'error', 'Wallet not connected or Nitro client unavailable.');
      return;
  }

  // Set loading/response state
  setResponse('challenge', null);
  addToHistory('challenge', 'pending', 'Initiating channel challenge...');

  try {
    // Define localStorage keys used by create/close logic
    const STORAGE_KEYS = {
      CHANNEL_STATE: 'nitrolite_channel_state', // Key for the state object
      CHANNEL_ID: 'nitrolite_channel_id',       // Key for the channel ID
    };

    // Get channel ID from localStorage (assuming direct ledger channel for challenge)
    const channelId = localStorage.getItem(STORAGE_KEYS.CHANNEL_ID) as Hex;
    if (!channelId) {
      throw new Error('No direct channel ID (nitrolite_channel_id) found in localStorage for challenge.');
    }

    // Get and parse channel state from localStorage
    const savedChannelState = localStorage.getItem(STORAGE_KEYS.CHANNEL_STATE);
    if (!savedChannelState) {
      throw new Error('No channel state (nitrolite_channel_state) found in localStorage for challenge.');
    }
    // Parse the state, handling BigInts stored as strings (e.g., "100n")
    const state = JSON.parse(savedChannelState, (key, value) => {
      if (typeof value === 'string' && /^\\d+n$/.test(value)) {
        return BigInt(value.substring(0, value.length - 1));
      }
      return value;
    });

    // Call the client's challenge function directly
    const challengeResponse = await nitroSnap.client.challengeChannel(channelId, state);

    // Update loading/response state on success
    setResponse('challenge', challengeResponse);
    addToHistory('challenge', 'success', 'Channel challenge submitted successfully');

    // Refresh account info after challenging
    await fetchAccountInfo();

  } catch (error) {
    console.error('Error challenging channel:', error);
    // Update loading/response state on error
    setResponse('challenge', { error: error.message });
    addToHistory('challenge', 'error', \`Challenge failed: \${error.message}\`);
    // Show user friendly message (optional)
    // alert(\`Challenge failed: \${error.message}\`);
  }
};

// 3. Pass the handler to the ChallengeChannelSection component
<ChallengeChannelSection
  onChallenge={handleChallenge} // Pass the handler defined above
  isLoading={loadingStates.challenge || false} // Get loading state
  response={responses.challenge} // Get response state
/>
        `}
            />
        </section>
    );
};
