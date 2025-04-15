import { proxy } from 'valtio';

// Types moved from useTransactionHistory
type TransactionStatus = 'success' | 'error' | 'pending';

export interface Transaction {
    id: string;
    type: string;
    timestamp: number;
    status: TransactionStatus;
    message: string;
    details?: any;
}

// Export types for convenience
export type { TransactionStatus };

interface DebugState {
    responses: Record<string, any>;
    loadingStates: Record<string, boolean>;
    transactionHistory: Transaction[];
}

const state = proxy<DebugState>({
    responses: {},
    loadingStates: {},
    transactionHistory: [],
});

export const DebugStore = {
    state,

    // Actions
    setResponse: (key: string, value: any) => {
        state.responses[key] = value;
    },

    setLoading: (key: string, isLoading: boolean) => {
        state.loadingStates[key] = isLoading;
    },

    clearResponses: () => {
        state.responses = {};
        state.loadingStates = {}; // Also clear loading states when clearing responses
    },

    addToHistory: (type: string, status: TransactionStatus, message: string, details?: any) => {
        const newTransaction: Transaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type,
            timestamp: Date.now(),
            status,
            message,
            details,
        };

        state.transactionHistory.unshift(newTransaction);
    },

    clearHistory: () => {
        state.transactionHistory = [];
    },
};
