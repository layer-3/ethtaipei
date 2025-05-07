import { useState, useCallback } from 'react';

export function useAmountInput(initialValue: string = '0') {
    const [amount, setAmount] = useState(initialValue);

    const handleAmountChange = useCallback((newValue: string) => {
        if (newValue === '') {
            setAmount('0');
            return;
        }

        if (newValue.includes('.')) {
            const parts = newValue.split('.');
            const integerPart = parts[0];
            const decimalPart = parts[1] || '';

            // Limit decimal places to 7
            if (decimalPart.length > 7) {
                return;
            }

            // Limit total digits to 9
            if (integerPart.length + decimalPart.length > 9) {
                return;
            }
        } else {
            // Limit digits for whole numbers
            if (newValue.length > 9) {
                return;
            }
        }

        // Remove leading zeros for numbers that don't start with "0."
        if (newValue.length > 1 && newValue.startsWith('0') && !newValue.startsWith('0.')) {
            setAmount(newValue.substring(1));
        } else {
            setAmount(newValue);
        }
    }, []);

    return {
        amount,
        setAmount,
        handleAmountChange,
    };
}
