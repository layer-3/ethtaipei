import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { CodeBlock } from '../common/CodeBlock';

interface VirtualChannelSectionProps {
    selectedParticipant: string;
    virtualChannelAmount: string;
    onChangeVirtualChannelAmount: (value: string) => void;
    onOpenVirtualChannel: () => void;
    isLoading: boolean;
    response: any;
}

export const VirtualChannelSection: React.FC<VirtualChannelSectionProps> = ({
    selectedParticipant,
    virtualChannelAmount,
    onChangeVirtualChannelAmount, // Managed by useState in DebugInterface
    onOpenVirtualChannel, // This prop is connected to the logic below
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
                        onChange={(e) => onChangeVirtualChannelAmount(e.target.value)}
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
            {renderResponse()}
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// 1. Import and use the necessary hooks
import { useDebugVirtualChannels } from './handlers/useDebugVirtualChannels';
const { openVirtualChannel } = useDebugVirtualChannels({ isConnected });
const { sendRequest, isConnected } = useWebSocket(wsUrl);
const nitroSnap = useSnapshot(NitroliteStore.state);
const settingsSnap = useSnapshot(SettingsStore.state);
const { setResponse, addToHistory } = useResponseTracking(); // For state updates

// 2. Manage local state for amount and selected participant
const [virtualChannelAmount, setVirtualChannelAmount] = useState('0');
const [selectedParticipant, setSelectedParticipant] = useState('');

// 3. Define the handler passed as 'onOpenVirtualChannel' prop
const handleOpenVC = async () => {
  const chainId = settingsSnap.activeChain?.id;
  const participantA = nitroSnap.stateSigner?.address || '';

  if (!chainId || !selectedParticipant || !participantA) {
      console.error('Missing required info for opening VC');
      addToHistory('virtualChannel', 'error', 'Missing chain ID, user address, or selected participant.');
      return;
  }

  // Set loading/response state
  setResponse('virtualChannel', null);
  addToHistory('virtualChannel', 'pending', 'Opening virtual channel...');

  try {
    // Call the function from the useDebugVirtualChannels hook
    const vcResponse = await openVirtualChannel(
      sendRequest, // WebSocket send function
      participantA, // Current user's address
      selectedParticipant, // Selected peer's address
      virtualChannelAmount, // Amount for the channel (string)
      chainId // Active chain ID
    );

    // Update loading/response state based on hook's response
    setResponse('virtualChannel', vcResponse);
    addToHistory('virtualChannel', vcResponse ? 'success' : 'error', vcResponse ? 'Virtual channel opened' : 'Failed to open virtual channel');

    // Store the virtual channel ID if returned (assuming vcResponse contains it)
    if (vcResponse?.channelId) {
        localStorage.setItem('virtual_channel_id', vcResponse.channelId);
        // Optionally update local state: setVirtualChannelId(vcResponse.channelId);
    }

  } catch (error) {
    console.error('Open virtual channel failed:', error);
    setResponse('virtualChannel', { error: error.message });
    addToHistory('virtualChannel', 'error', \`Open VC failed: \${error.message}\`);
  }
};

// 4. Pass the handler and state to the VirtualChannelSection component
<VirtualChannelSection
  selectedParticipant={selectedParticipant}
  virtualChannelAmount={virtualChannelAmount}
  onChangeVirtualChannelAmount={setVirtualChannelAmount} // Pass the setter
  onOpenVirtualChannel={handleOpenVC} // Pass the handler defined above
  isLoading={loadingStates.virtualChannel || false} // Get loading state
  response={responses.virtualChannel} // Get response
/>
        `}
            />
        </section>
    );
};
