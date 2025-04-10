import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useAvailableBalance, useAccountInfo, useChannelWithdraw } from '@/hooks/channel';
import { WalletStore } from '@/store';
import { shortenHex } from '@/helpers/shortenHex';
import { formatUnits } from 'viem';
import { tokenDecimals } from '@/hooks/utils/tokenDecimals';

export const WithdrawFromCustody = () => {
    const { walletAddress, selectedTokenAddress } = useSnapshot(WalletStore.state);
    const { availableBalance, refreshBalance } = useAvailableBalance(selectedTokenAddress);
    const { accountInfo, refreshAccountInfo } = useAccountInfo(selectedTokenAddress);
    const { withdrawFromCustody, isWithdrawing } = useChannelWithdraw();
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Reset success message after a delay
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                setIsSuccess(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isSuccess]);

    // Reset on token change
    useEffect(() => {
        setWithdrawAmount('');

        setIsSuccess(false);
    }, [selectedTokenAddress]);

    const handleWithdraw = async () => {
        if (!selectedTokenAddress || !withdrawAmount) return;

        try {
            const decimals = tokenDecimals(selectedTokenAddress);

            const bigintAmount = BigInt(parseFloat(withdrawAmount) * 10 ** decimals);

            await withdrawFromCustody(selectedTokenAddress, bigintAmount.toString());

            // Refresh balances after withdrawal
            await refreshBalance();

            await refreshAccountInfo();

            setWithdrawAmount('');

            setIsSuccess(true);
        } catch (error) {
            console.error('Withdrawal failed:', error);
        }
    };

    const handleMax = () => {
        if (availableBalance && selectedTokenAddress) {
            const decimals = tokenDecimals(selectedTokenAddress);

            setWithdrawAmount(formatUnits(availableBalance, decimals));
        }
    };

    if (!walletAddress || !selectedTokenAddress) {
        return null;
    }

    const decimals = tokenDecimals(selectedTokenAddress);
    const formattedAvailableBalance = availableBalance ? formatUnits(availableBalance, decimals) : '0';

    const formattedDeposited = accountInfo?.deposited ? formatUnits(accountInfo.deposited, decimals) : '0';

    const formattedLocked = accountInfo?.locked ? formatUnits(accountInfo.locked, decimals) : '0';

    const canWithdraw =
        availableBalance !== null &&
        withdrawAmount !== '' &&
        parseFloat(withdrawAmount) > 0 &&
        BigInt(parseFloat(withdrawAmount) * 10 ** decimals) <= availableBalance;

    return (
        <div className="p-4 rounded-lg bg-white shadow-md dark:bg-gray-800">
            <h3 className="text-lg font-medium mb-4">Withdraw from Custody</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
                    <div className="font-medium">{formattedAvailableBalance}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Deposited</div>
                    <div className="font-medium">{formattedDeposited}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Locked in Channels</div>
                    <div className="font-medium">{formattedLocked}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Channel Count</div>
                    <div className="font-medium">{accountInfo?.channelCount || 0}</div>
                </div>
            </div>

            <div className="flex mb-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Amount to withdraw"
                        className="w-full p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleMax}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 hover:text-blue-700"
                    >
                        MAX
                    </button>
                </div>
                <button
                    onClick={handleWithdraw}
                    disabled={!canWithdraw || isWithdrawing}
                    className={`px-4 py-2 rounded-r font-medium ${
                        canWithdraw && !isWithdrawing
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700'
                    }`}
                >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
            </div>

            {isSuccess && <div className="mt-2 p-2 bg-green-100 text-green-800 rounded">Withdrawal successful!</div>}

            <div className="text-xs text-gray-500 mt-2">
                Withdraws available tokens from the custody contract to your wallet at{' '}
                {walletAddress && shortenHex(walletAddress)}
            </div>
        </div>
    );
};

export default WithdrawFromCustody;
