import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { ResponseDisplay } from '../common/ResponseDisplay';
import { RawResponseDisplay } from '../common/RawResponseDisplay';
import { AccountInfo } from '@/store/types';
import { CodeBlock } from '../common/CodeBlock';

interface ChannelCreateSectionProps {
    currentDeposit: string;
    currentLocked: string;
    accountInfo: AccountInfo;
    onCreateChannel: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const ChannelCreateSection: React.FC<ChannelCreateSectionProps> = ({
    currentDeposit, // Formatted display value
    currentLocked, // Formatted display value
    accountInfo, // Raw account info object
    onCreateChannel, // This prop is connected to the logic below
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
            <ResponseDisplay response={response} isLoading={isLoading} />
            <RawResponseDisplay response={response} />
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// 1. Import and use the hook
import { useChannelCreate } from '@/hooks/channel/useChannelCreate';
const { handleCreateChannel } = useChannelCreate(); // Hook handles the creation logic

// 2. Get necessary state from stores/other hooks
const walletSnap = useSnapshot(WalletStore.state);
const settingsSnap = useSnapshot(SettingsStore.state);
const { accountInfo } = useDebugAccount(/* ... */); // Get raw account info
// The useChannelCreate hook likely uses useResponseTracking internally
// to manage loading/response/history states for 'createChannel'.

// 3. Define the handler passed as 'onCreateChannel' prop
const onCreateChannelHandler = async () => {
  const chainId = settingsSnap.activeChain?.id;
  if (!walletSnap.connected || !chainId) {
      console.error('Wallet not connected or chain ID missing');
      // Optionally update history/response via useResponseTracking if needed
      return;
  }

  const tokenAddress = APP_CONFIG.TOKENS[chainId] as Address;
  // Get the raw BigInt deposit amount from accountInfo state
  const depositAmountWei = accountInfo.available;

  if (depositAmountWei <= 0n) {
      console.warn('No deposit available to create channel');
      // Optionally update history/response
      return;
  }

  // Call the hook's function, passing the raw deposit amount
  // The hook handles:
  // - Setting loading state for 'createChannel'
  // - Calling nitroClient.createLedgerChannel
  // - Storing channel ID and state in localStorage
  // - Updating response/history for 'createChannel'
  // - Refreshing account info
  await handleCreateChannel(tokenAddress, depositAmountWei);
};

// 4. Pass the handler and state to the ChannelCreateSection component
<ChannelCreateSection
  currentDeposit={currentDeposit} // Formatted value for display
  currentLocked={currentLocked}   // Formatted value for display
  accountInfo={accountInfo}     // Raw account info object
  onCreateChannel={onCreateChannelHandler} // Pass the handler defined above
  // isLoading and response are managed by useChannelCreate via useResponseTracking
  isLoading={loadingStates.createChannel || false} // Read loading state
  response={responses.createChannel} // Read response state
/>
        `}
            />
        </section>
    );
};
