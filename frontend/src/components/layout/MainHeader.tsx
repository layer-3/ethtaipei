import { useSnapshot } from 'valtio';
import Link from 'next/link';
import { WalletStore, NitroliteStore } from '@/store';
import { ConnectButton } from '@/components/wallet/clearnet/ConnectButton';
import { MetaMaskConnectButton } from '@/components/wallet/clearnet/MetaMaskConnectButton';
import { ProfileIcon } from '@/assets/images/ProfileIcon';

export function MainHeader() {
    const walletSnap = useSnapshot(WalletStore.state);
    const nitroSnap = useSnapshot(NitroliteStore.state);
    const isPrivyEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIVY === 'true';

    return (
        <header className="flex justify-between items-center mb-2 md:mb-2 max-w-full 3xl:w-[1250px] 2xl:w-[1155px] xl:w-[921px] mx-auto w-full">
            <div className="flex items-center">
                <Link href="/" className="flex items-center">
                    <span className="ml-2 font-gilmer-bold text-2xl text-text-color-90">ClearNet</span>
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
                        <div className="flex items-center gap-3 px-3 md:px-4 py-2 bg-neutral-control-color-0 rounded-[2px] hover:bg-neutral-control-color-10 transition-colors">
                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-neutral-control-color-30 flex items-center justify-center overflow-hidden">
                                <ProfileIcon />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm text-text-color-90 font-metro-medium">Account</span>
                                <span className="text-xs font-metro-regular text-text-color-60 group-hover:text-text-color-90 transition-colors">
                                    Balance: ${nitroSnap.userAccountFromParticipants.amount ?? 0}
                                </span>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </header>
    );
}
