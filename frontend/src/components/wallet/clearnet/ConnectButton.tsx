import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { shortenHex } from '@/helpers/shortenHex';
import { ProfileIcon } from '@/assets/images/ProfileIcon';

export const ConnectButton: React.FC = () => {
    const { login, user, authenticated, ready } = usePrivy();
    const { wallets } = useWallets();
    const settingsSnap = useSnapshot(SettingsStore.state);

    useEffect(() => {
        if (authenticated && user && ready) {
            const setupWallet = async () => {
                try {
                    if (wallets.length > 0) {
                        const embeddedPrivyWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');

                        if (embeddedPrivyWallet && embeddedPrivyWallet.address) {
                            WalletStore.connect(embeddedPrivyWallet.address as `0x${string}`, 'privy');
                        }
                    }
                } catch (error) {
                    console.error('Error setting up Privy wallet:', error);
                    WalletStore.setError('Failed to setup Privy wallet');
                }
            };

            setupWallet();
        } else if (!authenticated) {
            WalletStore.disconnect();
        }
    }, [authenticated, user, ready, wallets, settingsSnap.activeChain]);

    const connectWallet = useCallback(async () => {
        try {
            await login();
        } catch (error) {
            console.log('error', error);
            WalletStore.setError('Failed to connect wallet');
        }
    }, [login]);

    if (WalletStore.isWalletConnected()) {
        return (
            <div className="flex items-center gap-2">
                {WalletStore.state.walletProvider === 'privy' ? (
                    <UserPill />
                ) : (
                    <div className="flex items-center gap-3 px-4 py-2 bg-neutral-control-color-0 border border-divider-color-20 rounded-[2px] hover:bg-neutral-control-color-20 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-neutral-control-color-30 flex items-center justify-center overflow-hidden">
                            <ProfileIcon className="w-5 h-5 text-text-color-60" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-text-color-100 font-metro-medium">Account</span>
                            <span className="text-xs font-metro-regular text-text-color-60 transition-colors">
                                {shortenHex(WalletStore.getWalletAddress() || '', 4)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button onClick={connectWallet} className="flex items-center gap-3 px-4 py-2 rounded-[2px] transition-colors ">
            <div className="h-8 w-8 rounded-full bg-neutral-control-color-30 flex items-center justify-center overflow-hidden">
                <ProfileIcon className="w-5 h-5 text-text-color-60" />
            </div>
            <span className="text-text-color-100 font-metro-medium">Account</span>
        </button>
    );
};
