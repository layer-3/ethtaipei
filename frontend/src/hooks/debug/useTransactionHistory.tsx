import { useSnapshot } from 'valtio';
import { DebugStore, Transaction } from '@/store/DebugStore'; // Import Transaction type too

export const useTransactionHistory = () => {
    const { transactionHistory } = useSnapshot(DebugStore.state);

    // Type assertion for the snapshot state if needed, or ensure DebugStore state typing is correct
    const typedTransactionHistory = transactionHistory as Transaction[];

    return {
        transactionHistory: typedTransactionHistory,
        addToHistory: DebugStore.addToHistory,
        clearHistory: DebugStore.clearHistory,
    };
};
