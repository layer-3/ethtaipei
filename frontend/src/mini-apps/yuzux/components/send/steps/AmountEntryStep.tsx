import React, { useMemo, useCallback, useRef } from 'react';
import { NumberPad } from '@worldcoin/mini-apps-ui-kit-react';
import { QuickAmountButtons } from './QuickAmountButtons';
import { useDeviceDetection } from '@/hooks';

interface AmountEntryStepProps {
    amount: string;
    recipientAddress: string;
    availableBalance: string;
    onAmountChange: (value: string) => void;
    onSubmit: () => void;
    handleAmountInput?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AmountEntryStep: React.FC<AmountEntryStepProps> = ({
    amount,
    recipientAddress,
    availableBalance,
    onAmountChange,
    onSubmit,
    handleAmountInput,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { isMobile } = useDeviceDetection();

    const moveCaretToEnd = useCallback(() => {
        const input = inputRef.current;
        if (input) {
            const len = input.value.length;
            input.setSelectionRange(len, len);
        }
    }, [inputRef]);

    // Check if amount exceeds available balance
    const isExceedingBalance = useMemo(() => {
        if (!amount || !availableBalance) {
            return false;
        }

        try {
            // Parse as floats for comparison (simplified)
            const amountNum = parseFloat(amount);
            const balanceNum = parseFloat(availableBalance);

            return amountNum > balanceNum;
        } catch (error) {
            console.error('Error comparing amounts:', error);
            return false;
        }
    }, [amount, availableBalance]);

    // Button enabled if: amount is positive AND not exceeding balance
    const canPay = +amount > 0 && !isExceedingBalance;

    // Handle quick amount selection
    const handleQuickAmountSelection = useCallback(
        (percentage: number) => {
            try {
                const balanceNum = parseFloat(availableBalance);

                if (isNaN(balanceNum) || balanceNum <= 0) return;

                let calculatedAmount: number;

                // If MAX (100%), use the full balance
                if (percentage === 100) {
                    calculatedAmount = balanceNum;
                } else {
                    calculatedAmount = balanceNum * (percentage / 100);
                }

                // Format to 2 decimal places for display
                const formattedAmount = calculatedAmount.toFixed(2);

                // Remove trailing zeros
                const finalAmount = formattedAmount.replace(/\.00$/, '');

                onAmountChange(finalAmount);
            } catch (error) {
                console.error('Error calculating quick amount:', error);
            }
        },
        [availableBalance, onAmountChange],
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col pt-8">
                <div className="flex-1 flex flex-col items-center justify-center mb-4">
                    <div
                        onClick={() => !isMobile && inputRef?.current?.focus()}
                        className="flex gap-1 text-white items-start">
                        <span className="text-5xl font-bold">$</span>
                        <span className="text-5xl font-bold">{amount}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?"
                            aria-label="Send amount"
                            value={amount}
                            onFocus={moveCaretToEnd}
                            onChange={handleAmountInput}
                            className="sr-only"
                        />
                    </div>
                    <div className="mt-2 text-sm text-white">Available: {availableBalance}</div>

                    {/* Display error message if exceeding balance */}
                    {isExceedingBalance && (
                        <div className="mt-2 text-sm text-red-500">Amount exceeds your available balance</div>
                    )}
                </div>
                <div className="text-center">
                    <div className="mt-2 text-sm text-white">to: {recipientAddress}</div>
                </div>

                <div className="p-4">
                    <button
                        disabled={!canPay}
                        onClick={onSubmit}
                        className="w-full bg-white text-black py-4 rounded-md hover:bg-gray-200 transition-colors text-lg font-normal border border-white disabled:opacity-50 disabled:cursor-not-allowed mb-4">
                        Pay
                    </button>

                    {/* Quick amount buttons */}
                    <div className="mb-4">
                        <QuickAmountButtons onSelectAmount={handleQuickAmountSelection} />
                    </div>
                </div>

                <div className="py-3 text-white">
                    <NumberPad value={amount} onChange={onAmountChange} />
                </div>
            </div>
        </div>
    );
};
