import { usePrivy } from '@privy-io/react-auth';
import { useCallback } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';

export const ConnectButton: React.FC = () => {
    const { login, user } = usePrivy();

    // const [wallet, setWallet] = useState(null);

    const connectWallet = useCallback(async () => {
        try {
            await login();
        } catch (error) {
            console.log('error', error);
        }
    }, [login]);

    if (user) {
        return <UserPill />;
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white">
            <span className="text-gray-800 font-semibold">Login</span>
        </button>
    );
};
