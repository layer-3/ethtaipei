import { shortenHex } from '@/helpers/shortenHex';
import { useMetaMask } from '@/hooks';
import Image from 'next/image';
import { useCallback } from 'react';

export const MetaMaskConnectButton: React.FC = () => {
    const {
        isConnected,
        account,
        isMetaMaskInstalled,
        connect: connectMetaMask,
        disconnect: disconnectMetaMask,
    } = useMetaMask();

    const connectWallet = useCallback(async () => {
        if (!isMetaMaskInstalled) {
            alert('Please install MetaMask to use this feature');
            return;
        }

        try {
            await connectMetaMask();
        } catch (error) {
            // Show error message to user
            alert(`Error connecting to MetaMask: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [isMetaMaskInstalled, connectMetaMask]);

    if (isConnected) {
        return (
            <button
                onClick={disconnectMetaMask}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white">
                <span className="text-gray-800">{shortenHex(account)}</span>
            </button>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white">
            <Image src="/metamask.svg" alt="Metamask" width={24} height={24} />
            <span className="text-gray-800 font-semibold">MetaMask</span>
        </button>
    );
};
