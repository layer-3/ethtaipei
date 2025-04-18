import React from 'react';
import { useSnapshot } from 'valtio';
import { WalletStore, SettingsStore } from '@/store';
import { AccountInfo } from '@/store/types';
import { CodeBlock } from '../common/CodeBlock'; // Import CodeBlock

interface StatusCardProps {
    title: string;
    status: string;
    isActive: boolean;
    children: React.ReactNode;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, status, isActive, children }) => (
    <div className="border rounded-md p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">{title}</h3>
            <span
                className={`px-2 py-1 rounded-full text-xs ${
                    isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
            >
                {status}
            </span>
        </div>
        <div className="space-y-2 text-sm">{children}</div>
    </div>
);

interface StatusDashboardProps {
    accountInfo: AccountInfo;
    currentDeposit: string;
    currentLocked: string;
    virtualChannelId: string;
    allocations: {
        participantA: string;
        participantB: string;
    };
    wsStatus: {
        isConnected: boolean;
        status: string;
    };
}

export const StatusDashboardSection: React.FC<StatusDashboardProps> = ({
    accountInfo, // From useDebugAccount state
    currentDeposit, // Derived memoized value
    currentLocked, // Derived memoized value
    virtualChannelId, // From DebugInterface state (useState + localStorage)
    allocations, // From DebugInterface state (useState)
    wsStatus, // From useWebSocket state
}) => {
    const walletSnap = useSnapshot(WalletStore.state);
    const activeChain = useSnapshot(SettingsStore.state).activeChain;

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Status Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Channel Status */}
                <StatusCard
                    title="Channel Status"
                    status={accountInfo.channelCount > 0 ? 'Active' : 'Inactive'}
                    isActive={accountInfo.channelCount > 0}
                >
                    <p>
                        <span className="text-gray-500">Open Channels:</span> {accountInfo.channelCount}
                    </p>
                    <p>
                        <span className="text-gray-500">Locked Amount:</span> ${currentLocked}
                    </p>
                    {accountInfo.channelCount > 0 && (
                        <div className="mt-2">
                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}
                </StatusCard>

                {/* Virtual Channel Status */}
                <StatusCard
                    title="Virtual Channel"
                    status={virtualChannelId ? 'Active' : 'Inactive'}
                    isActive={!!virtualChannelId}
                >
                    {virtualChannelId ? (
                        <>
                            <p className="truncate">
                                <span className="text-gray-500">ID:</span> {virtualChannelId.substring(0, 10)}...
                            </p>
                            <p>
                                <span className="text-gray-500">Allocation:</span> You: {allocations.participantA} |
                                Partner: {allocations.participantB}
                            </p>
                            <div className="mt-2">
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{
                                            width: `${(Number(allocations.participantB) / (Number(allocations.participantA) + Number(allocations.participantB) || 1)) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 italic">No active virtual channel</p>
                    )}
                </StatusCard>

                {/* Network Status */}
                <StatusCard
                    title="Network Status"
                    status={wsStatus.isConnected ? 'Connected' : 'Disconnected'}
                    isActive={wsStatus.isConnected}
                >
                    <p>
                        <span className="text-gray-500">WebSocket:</span> {wsStatus.status}
                    </p>
                    <p>
                        <span className="text-gray-500">Chain:</span> {activeChain?.name || 'Not set'}
                    </p>
                    <p>
                        <span className="text-gray-500">Network ID:</span> {activeChain?.id || 'N/A'}
                    </p>
                </StatusCard>
            </div>

            {/* Wallet Info */}
            <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center">
                        <div
                            className={`w-2 h-2 rounded-full mr-1.5 ${walletSnap.connected ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span>
                            Wallet:{' '}
                            {walletSnap.connected
                                ? `${walletSnap.walletAddress?.substring(0, 6)}...${walletSnap.walletAddress?.substring(walletSnap.walletAddress.length - 4)}`
                                : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>
            {/* Add CodeBlock here */}
            <CodeBlock
                text={`
// --- Logic in DebugInterface.tsx ---

// This component displays data derived from various sources within DebugInterface:

// 1. State Hooks:
//    - useState<AccountInfo> for 'accountInfo' (managed by useDebugAccount hook)
const [accountInfo, setAccountInfo] = useState<AccountInfo>(/* ... */);
const { fetchAccountInfo } = useDebugAccount({ setAccountInfo, /* ... */ });

//    - useState<string> for 'virtualChannelId' (potentially synced with localStorage)
const [virtualChannelId, setVirtualChannelId] = useState('');
//    (useEffect might read from localStorage on mount)

//    - useState<{ participantA: string, participantB: string }> for 'allocations'
const [allocations, setAllocations] = useState({ participantA: '0', participantB: '0' });

//    - useWebSocket hook for WebSocket status
const { isConnected, status } = useWebSocket(wsUrl);
const wsStatus = { isConnected, status };

// 2. Store Snapshots:
//    - useSnapshot(WalletStore.state) for wallet connection status and address
//    - useSnapshot(SettingsStore.state) for the active chain details
//    - useSnapshot(NitroliteStore.state) for stateSigner address

// 3. Memoized Values:
//    - useMemo to calculate 'currentDeposit' (formatted string)
const currentDeposit = useMemo(() => {
    // ... logic using accountInfo.deposited, settingsSnap.activeChain, formatTokenUnits ...
}, [/* dependencies */]);
//    - useMemo to calculate 'currentLocked' (formatted string)
const currentLocked = useMemo(() => {
    // ... logic using accountInfo.locked, settingsSnap.activeChain, formatTokenUnits ...
}, [/* dependencies */]);

// 4. Props Passing:
//    - All the necessary data pieces are gathered and passed down as props
//      from DebugInterface.tsx to StatusDashboardSection.

<StatusDashboardSection
  accountInfo={accountInfo} // Raw account info object
  currentDeposit={currentDeposit} // Formatted string
  currentLocked={currentLocked} // Formatted string
  virtualChannelId={virtualChannelId} // String from state/localStorage
  allocations={allocations} // Object from state
  wsStatus={wsStatus} // Object { isConnected, status }
/>
        `}
            />
        </section>
    );
};
