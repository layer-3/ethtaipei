import { useSnapshot } from 'valtio';
import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { WalletStore, NitroliteStore, SettingsStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { shortenHex } from '@/helpers/shortenHex';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';
import APP_CONFIG from '@/config/app';
import { useWebSocket } from '@/hooks/websocket';
import { useGetParticipants } from '@/hooks/channel/useGetParticipants';

interface MainHeaderProps {
    onOpenDeposit: () => void;
    onOpenCloseChannel: () => void;
}

export function MainHeader({ onOpenDeposit }: MainHeaderProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const settingsSnap = useSnapshot(SettingsStore.state);
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    // WebSocket for participants data
    const { isConnected, connect, sendRequest } = useWebSocket();

    // Get participants data using our hook
    const { getParticipants } = useGetParticipants({
        wsProps: { isConnected, connect, sendRequest },
        activeChainId: settingsSnap.activeChain?.id,
    });

    // Fetch participants data when connected
    useEffect(() => {
        if (walletSnap.connected && isConnected && settingsSnap.activeChain?.id) {
            // Get participants to update balance
            getParticipants();
        }
    }, [walletSnap.connected, isConnected, settingsSnap.activeChain?.id, getParticipants]);

    // Periodically refresh participants data every 15 seconds
    useEffect(() => {
        if (!walletSnap.connected || !isConnected) return;

        const intervalId = setInterval(() => {
            getParticipants();
        }, 15000); // 15 seconds

        return () => clearInterval(intervalId);
    }, [walletSnap.connected, isConnected, getParticipants]);

    const formattedBalance = (() => {
        if (!nitroSnap.userAccountFromParticipants || !settingsSnap.activeChain?.id) {
            return '0';
        }

        const chainId = settingsSnap.activeChain.id;
        const tokenAddress = APP_CONFIG.TOKENS[chainId];

        if (!tokenAddress) return '0';

        // Get the user's channel balance
        return formatTokenUnits(tokenAddress, nitroSnap.userAccountFromParticipants.amount);
    })();

    return (
        <header className="flex gap-4 items-center justify-between flex-wrap">
            <div className="flex gap-4 items-center">
                {walletSnap.connected && !walletSnap.channelOpen && (
                    <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
                )}
            </div>
            <div className="flex items-center gap-4">
                {!walletSnap.connected ? (
                    // Show connect button if not connected
                    <div>{isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}</div>
                ) : (
                    // Show wallet address with balance if connected
                    <Link href="/account" className="group">
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-300 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-sm text-вфкл font-mono">
                                    {shortenHex(walletSnap.walletAddress || '', 4)}
                                </span>
                                <span className="text-xs text-gray-800 group-hover:text-gray-900 transition-colors">
                                    Balance: ${formattedBalance}
                                </span>
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-gray-900 group-hover:text-dark transition-colors">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </Link>
                )}
            </div>
        </header>
    );
}
