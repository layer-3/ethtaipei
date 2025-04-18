import { useSnapshot } from 'valtio';
import { useEffect } from 'react';
import Link from 'next/link';
import { WalletStore, NitroliteStore, SettingsStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
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
        <header className="flex justify-between items-center mb-2 md:mb-2 max-w-7xl mx-auto w-full">
            <div className="flex items-center">
                <Link href="/" className="flex items-center">
                    <span className="ml-2 font-bold text-2xl text-gray-900">ClearNet</span>
                </Link>
            </div>

            <div className="flex items-center">
                {!walletSnap.connected ? (
                    // Not connected - show Account button that triggers wallet connect
                    isPrivyEnabled ? (
                        <ConnectButton />
                    ) : (
                        <MetaMaskConnectButton />
                    )
                ) : (
                    // Connected - show Account button that links to account page
                    <Link href="/account" className="group">
                        <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-white rounded-[2px] hover:bg-gray-100 transition-colors">
                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4 md:w-5 md:h-5 text-gray-600"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-900 font-medium">Account</span>
                                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                                    Balance: ${formattedBalance}
                                </span>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </header>
    );
}
