import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';
import WalletStore from '@/store/WalletStore';

export const ConnectButton: React.FC = () => {
    const { login, user, authenticated } = usePrivy();

    useEffect(() => {
        if (authenticated && user) {
            WalletStore.connectPrivy(user.id);
        } else {
            WalletStore.disconnectPrivy();
        }
    }, [authenticated, user]);

    const connectWallet = useCallback(async () => {
        try {
            await login();
        } catch (error) {
            console.log('error', error);
            WalletStore.setError('Failed to connect with Privy');
        }
    }, [login]);

    if (user) {
        return (
            <div className="flex items-center gap-2">
                <UserPill />
            </div>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary">
            <span className="text-black font-normal">Login</span>
        </button>
    );
};
