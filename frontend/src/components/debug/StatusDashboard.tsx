import React from 'react';
import { AccountInfo } from '@/store/types';

interface StatusDashboardProps {
    walletConnected: boolean;
    walletAddress?: string;
    isConnected: boolean;
    status: string;
    activeChain?: { name: string; id: number };
    hasNitroliteClient: boolean;
    wsUrl: string;
    currentLocked: string;
    currentDeposit: string;
    accountInfo: AccountInfo;
    virtualChannelId: string;
    allocations: {
        participantA: string;
        participantB: string;
    };
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
    walletConnected,
    walletAddress,
    isConnected,
    status,
    activeChain,
    hasNitroliteClient,
    wsUrl,
    currentLocked,
    accountInfo,
    virtualChannelId,
    allocations,
}) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Status Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Channel Status */}
                <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-700">Channel Status</h3>
                        <span
                            className={`px-2 py-1 rounded-full text-xs ${
                                accountInfo.channelCount > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                            {accountInfo.channelCount > 0 ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p>
                            <span className="text-gray-500">Open Channels:</span> {accountInfo.channelCount}
                        </p>
                        <p>
                            <span className="text-gray-500">Locked Amount:</span> ${currentLocked}
                        </p>
                        {accountInfo.channelCount > 0 && (
                            <div className="mt-2">
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Virtual Channel Status */}
                <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-700">Virtual Channel</h3>
                        <span
                            className={`px-2 py-1 rounded-full text-xs ${
                                virtualChannelId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {virtualChannelId ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="space-y-2 text-sm">
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
                                            }}></div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-500 italic">No active virtual channel</p>
                        )}
                    </div>
                </div>

                {/* Network Status */}
                <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-700">Network Status</h3>
                        <span
                            className={`px-2 py-1 rounded-full text-xs ${
                                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p>
                            <span className="text-gray-500">WebSocket:</span> {status}
                        </p>
                        <p>
                            <span className="text-gray-500">Chain:</span> {activeChain?.name || 'Not set'}
                        </p>
                        <p>
                            <span className="text-gray-500">Network ID:</span> {activeChain?.id || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Wallet Info */}
            <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center">
                        <div
                            className={`w-2 h-2 rounded-full mr-1.5 ${walletConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>
                            Wallet:{' '}
                            {walletConnected
                                ? `${walletAddress?.substring(0, 6)}...${walletAddress?.substring(walletAddress.length - 4)}`
                                : 'Disconnected'}
                        </span>
                    </div>

                    <div className="flex items-center">
                        <div
                            className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>WebSocket: {wsUrl.substring(0, 20)}...</span>
                    </div>

                    <div className="flex items-center">
                        <div
                            className={`w-2 h-2 rounded-full mr-1.5 ${hasNitroliteClient ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>Nitrolite Client: {hasNitroliteClient ? 'Initialized' : 'Not Initialized'}</span>
                    </div>
                </div>
            </div>
        </section>
    );
};
