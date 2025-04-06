import { chainImageURLById } from '@/config/chains';
import { shortenHex } from '@/helpers/shortenHex';
import { useMetaMask } from '@/hooks';
import { WalletStore } from '@/store';
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
            // Check if we're on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Open MetaMask app via deep link for mobile users
                window.location.href = 'https://metamask.app.link/dapp/' + window.location.host + window.location.pathname;
                return;
            } else {
                alert('Please install MetaMask to use this feature');
                return;
            }
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary">
                <Image src={chainImageURLById(WalletStore.state.chainId)} alt="chain-icon" width={24} height={24} />

                <span className="text-black">{shortenHex(account)}</span>
            </button>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-primary-hover transition-colors bg-primary">
            <Image src="/metamask.svg" alt="Metamask" width={24} height={24} />
            <span className="text-black font-normal">MetaMask</span>
        </button>
    );
};
