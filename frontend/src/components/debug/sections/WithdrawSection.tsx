import React from 'react';
import { ResponseDisplay } from '../common/ResponseDisplay';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { ActionButton } from '@/components/ui/ActionButton';
import { CodeBlock } from '../common/CodeBlock';

interface WithdrawSectionProps {
    currentDeposit: string;
    onWithdraw: () => void;
    isLoading: boolean;
    response: any; // Add response prop
}

export const WithdrawSection: React.FC<WithdrawSectionProps> = ({
    currentDeposit,
    onWithdraw, // This prop is connected to the logic below in DebugInterface
    isLoading,
    response, // Destructure response
}) => {
    const canWithdraw = Number(currentDeposit) > 0;

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">9. Withdraw Funds</h2>
            <p className="text-sm text-gray-600 mb-2">
                Your current withdrawable deposit: <span className="font-semibold">{currentDeposit}</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
                Withdraw your available funds from the Nitro Adjudicator contract back to your wallet. This can only be
                done when no channels are active or locked.
            </p>
            <ActionButton onClick={onWithdraw} disabled={!canWithdraw || isLoading}>
                {isLoading ? 'Withdrawing...' : 'Withdraw All'}
            </ActionButton>
            {!canWithdraw && <p className="text-sm text-red-500 mt-2">No funds available to withdraw.</p>}
            <ResponseDisplay response={response} isLoading={isLoading} />
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// 1. Get necessary state/client/hooks
const nitroSnap = useSnapshot(NitroliteStore.state);
const settingsSnap = useSnapshot(SettingsStore.state);
const { fetchAccountInfo, accountInfo } = useDebugAccount(/* ... */);
const { setResponse, addToHistory } = useResponseTracking(); // For state updates

// 2. Define the withdraw function passed as 'onWithdraw' prop
const handleWithdraw = async () => {
  const chainId = settingsSnap.activeChain?.id;
  if (!chainId || !nitroSnap.client) return;

  const tokenAddress = APP_CONFIG.TOKENS[chainId];
  // Get the raw BigInt deposit amount from accountInfo state
  const depositAmountWei = accountInfo.available;

  // Check if there's anything to withdraw
  if (depositAmountWei <= 0n) {
    console.warn('No funds to withdraw.');
    addToHistory('withdrawal', 'info', 'No funds available to withdraw.');
    return;
  }

  try {
    // Set loading/response state
    setResponse('withdrawal', null);
    addToHistory('withdrawal', 'pending', 'Initiating withdrawal...');

    // Call the client's withdraw method directly
    const txResponse = await nitroSnap.client.withdraw(tokenAddress, depositAmountWei);

    // Update loading/response state on success
    setResponse('withdrawal', txResponse);
    addToHistory('withdrawal', 'success', 'Withdrawal successful');

    // Refresh account balance after withdrawal
    await fetchAccountInfo();
  } catch (error) {
    console.error('Withdrawal failed:', error);
    // Update loading/response state on error
    setResponse('withdrawal', { error: error.message });
    addToHistory('withdrawal', 'error', \`Withdrawal failed: \${error.message}\`);
  }
};

// 3. Pass the handler to the WithdrawSection component
<WithdrawSection
  currentDeposit={currentDeposit} // Formatted value for display
  onWithdraw={handleWithdraw} // Pass the handler defined above
  isLoading={loadingStates.withdrawal || false} // Get loading state from useResponseTracking
  response={responses.withdrawal} // Get response from useResponseTracking
/>
        `}
            />
        </section>
    );
};
