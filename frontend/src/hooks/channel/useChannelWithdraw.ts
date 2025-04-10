import { useState, useCallback } from 'react';
import { Address } from 'viem';
import NitroliteStore from '@/store/NitroliteStore';

interface UseChannelWithdrawReturn {
    withdrawFromCustody: (channelId: Address, tokenAddress: Address, amount: string) => Promise<boolean>;
    isWithdrawing: boolean;
    error: Error | null;
}

export function useChannelWithdraw(): UseChannelWithdrawReturn {
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const withdrawFromCustody = useCallback(
        async (channelId: Address, tokenAddress: Address, amount: string): Promise<boolean> => {
            setIsWithdrawing(true);
            setError(null);

            try {
                const bigIntAmount = BigInt(amount);

                const result = await NitroliteStore.withdraw(channelId, tokenAddress, bigIntAmount);

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));

                setError(error);

                throw error;
            } finally {
                setIsWithdrawing(false);
            }
        },
        [],
    );

    return {
        withdrawFromCustody,
        isWithdrawing,
        error,
    };
}
