import { useState, useCallback } from 'react';
import { Address } from 'viem';
import NitroliteStore from '@/store/NitroliteStore';
import { useResponseTracking } from '../debug/useResponseTracking';
import { useTransactionHistory } from '../debug/useTransactionHistory';

interface UseChannelWithdrawReturn {
    withdrawFromCustody: (channelId: Address, tokenAddress: Address, amount: string) => Promise<boolean>;
    isWithdrawing: boolean;
    error: Error | null;
}

export function useChannelWithdraw(): UseChannelWithdrawReturn {
    const { setResponse, setLoading } = useResponseTracking();
    const { addToHistory } = useTransactionHistory();
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const withdrawFromCustody = useCallback(
        async (channelId: Address, tokenAddress: Address, amount: string): Promise<boolean> => {
            setIsWithdrawing(true);
            setLoading('channelWithdraw', true);
            setError(null);

            try {
                setResponse('channelWithdraw', {
                    status: 'Initiating withdrawal from custody...',
                    success: false,
                });

                const bigIntAmount = BigInt(amount);

                setResponse('channelWithdraw', {
                    status: `Processing withdrawal of ${amount} tokens...`,
                    data: { channelId, tokenAddress, amount },
                    success: false,
                });

                const result = await NitroliteStore.withdraw(channelId, tokenAddress, bigIntAmount);

                // Record successful withdrawal
                addToHistory('CHANNEL_WITHDRAW', 'success', `Successfully withdrew ${amount} tokens from channel`, {
                    channelId,
                    tokenAddress,
                    amount,
                    timestamp: Date.now(),
                });

                setResponse('channelWithdraw', {
                    status: 'Withdrawal completed successfully',
                    data: { channelId, tokenAddress, amount },
                    success: true,
                });

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));

                setError(error);

                // Record failed withdrawal
                addToHistory('CHANNEL_WITHDRAW', 'error', `Withdrawal failed: ${error.message}`);

                setResponse('channelWithdraw', {
                    error: `Withdrawal failed: ${error.message}`,
                    success: false,
                });

                throw error;
            } finally {
                setIsWithdrawing(false);
                setLoading('channelWithdraw', false);
            }
        },
        [setResponse, setLoading, addToHistory],
    );

    return {
        withdrawFromCustody,
        isWithdrawing,
        error,
    };
}
