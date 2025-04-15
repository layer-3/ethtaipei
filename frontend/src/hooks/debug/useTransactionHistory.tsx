import { useState, useCallback } from 'react';

type TransactionStatus = 'success' | 'error' | 'pending';

export interface Transaction {
    id: string;
    type: string;
    timestamp: number;
    status: TransactionStatus;
    message: string;
    details?: any;
}

export const useTransactionHistory = () => {
    const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);

    console.log('test');

    const addToHistory = useCallback((type: string, status: TransactionStatus, message: string, details?: any) => {
        console.log('Add to history', type, status, message, details);
        setTransactionHistory((prev) => [
            {
                id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type,
                timestamp: Date.now(),
                status,
                message,
                details,
            },
            ...prev,
        ]);
    }, []);

    const clearHistory = useCallback(() => {
        setTransactionHistory([]);
    }, []);

    return {
        transactionHistory,
        addToHistory,
        clearHistory,
    };
};
