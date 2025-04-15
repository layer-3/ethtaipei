import React from 'react';
import { ResponseDisplay } from '../common/ResponseDisplay'; // Assuming potential future use
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { ActionButton } from '@/components/ui/ActionButton';
import { CodeBlock } from '../common/CodeBlock';

interface DepositSectionProps {
    currentDeposit: string;
    onOpenDeposit: () => void;
    fetchAccountInfo: () => void; // Keep fetchAccountInfo if needed elsewhere
    // Add response prop, even if not directly used by this section's button
    response?: any;
    isLoading?: boolean; // Add isLoading if applicable
}

export const DepositSection: React.FC<DepositSectionProps> = ({
    currentDeposit,
    onOpenDeposit, // This prop is connected to the logic below
    fetchAccountInfo, // Prop passed from DebugInterface
    response,
    isLoading,
}) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">2. Deposit Funds</h2>
            <p className="text-sm text-gray-600 mb-2">
                Your current deposited amount (available for channels):{' '}
                <span className="font-semibold">{currentDeposit}</span>
            </p>
            <ActionButton onClick={onOpenDeposit}>Open Deposit Modal</ActionButton>
            {/* Optional: Display response related to deposit actions if needed here */}
            {/* <ResponseDisplay response={response} isLoading={isLoading || false} /> */}
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// 1. Import AppStore and necessary hooks
import AppStore from '@/store/AppStore';
import Deposit from '@/components/wallet/clearnet/Deposit';
const { setResponse, addToHistory } = useResponseTracking();
const appSnap = useSnapshot(AppStore.state);

// 2. Define handlers for opening and closing the modal
const handleOpenDeposit = () => AppStore.openDeposit();
const handleCloseDeposit = () => AppStore.closeDeposit();

// 3. Pass the open handler to the DepositSection component
<DepositSection
  onOpenDeposit={handleOpenDeposit}
  currentDeposit={currentDeposit} // Formatted value for display
  fetchAccountInfo={fetchAccountInfo} // Pass function to refresh account info
  response={responses.deposit} // Pass response state for deposit actions
  isLoading={loadingStates.deposit} // Pass loading state for deposit actions
/>

// 4. Render the Deposit Modal component elsewhere in DebugInterface
<Deposit
  isOpen={appSnap.isDepositOpen} // Control visibility via AppStore state
  onClose={handleCloseDeposit} // Pass the close handler
  setResponse={setResponse} // Pass response setter from useResponseTracking
  addToHistory={addToHistory} // Pass history adder from useTransactionHistory
  // The Deposit component internally handles the actual deposit logic
  // using nitroClient.deposit and updates state via setResponse/addToHistory.
/>
        `}
            />
        </section>
    );
};
