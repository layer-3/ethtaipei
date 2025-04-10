import { useSnapshot } from 'valtio';
import { WalletStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ActionButton } from '@/components/ui/ActionButton';

interface MainHeaderProps {
    onOpenDeposit: () => void;
    onOpenCloseChannel: () => void;
}

export function MainHeader({ onOpenDeposit, onOpenCloseChannel }: MainHeaderProps) {
    const walletSnap = useSnapshot(WalletStore.state);
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    return (
        <header className="flex gap-4 items-center justify-between flex-wrap">
            <div className="flex gap-4 items-center">
                {walletSnap.connected && !walletSnap.channelOpen && (
                    <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
                )}
                {walletSnap.connected && walletSnap.channelOpen && (
                    <ActionButton onClick={onOpenCloseChannel}>Close</ActionButton>
                )}
            </div>
            <div className={walletSnap.connected ? '' : 'ml-auto'}>
                {isPrivyEnabled ? <ConnectButton /> : <MetaMaskConnectButton />}
            </div>
        </header>
    );
}
