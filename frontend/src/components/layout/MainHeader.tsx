import { useSnapshot } from 'valtio';
import Link from 'next/link';
import { WalletStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '@/components/ui/ActionButton';

interface MainHeaderProps {
    onOpenDeposit: () => void;
    onOpenCloseChannel: () => void;
}

export function MainHeader({ onOpenDeposit }: MainHeaderProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    return (
        <header className="flex gap-4 items-center justify-between flex-wrap">
            <div className="flex gap-4 items-center">
                {walletSnap.connected && !walletSnap.channelOpen && (
                    <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
                )}
            </div>
            <div className="flex items-center gap-4">
                <Link
                    href="/account" 
                    className="px-4 py-2 border border-gray-600 rounded-md text-white hover:bg-gray-800 transition-colors"
                >
                    Account
                </Link>
                <div className={walletSnap.connected ? '' : 'ml-auto'}>
                    {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
                </div>
            </div>
        </header>
    );
}
