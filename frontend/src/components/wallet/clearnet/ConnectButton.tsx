import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';
import { useSnapshot } from 'valtio';
import WalletStore from '@/store/WalletStore';
import SettingsStore from '@/store/SettingsStore';
import { shortenHex } from '@/helpers/shortenHex';

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
                    <div className="px-4 py-2 rounded border border-gray-200 bg-primary">
                        {shortenHex(WalletStore.getWalletAddress() || '', 4)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded hover:border-primary-hover transition-colors bg-primary">
            <span className="text-black font-normal">Login</span>
        </button>
    );
};
