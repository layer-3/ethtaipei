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
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-[2px] hover:bg-gray-100 transition-colors">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5 text-gray-600"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-900 font-medium">Account</span>
                            <span className="text-xs text-gray-600 transition-colors">
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
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-gray-600"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </div>
            <span className="text-black font-medium">Account</span>
        </button>
    );
};
