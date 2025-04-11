import { useState, useCallback } from 'react';
import { AccountInfo } from '@/store/types';

export type TransactionStatus = 'success' | 'error' | 'pending';

export interface Transaction {
    id: string;
    type: string;
    timestamp: number;
    status: TransactionStatus;
    message: string;
    details?: any;
}

export const useDebugState = () => {
    // Responses and loading states
    const [wsResponses, setWsResponses] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

    // Transaction history
    const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);

    // State for virtual channel
    const [virtualChannelId, setVirtualChannelId] = useState<string>('');
    const [virtualChannelAmount, setVirtualChannelAmount] = useState<string>('100');

    // State for participants
    const [participants, setParticipants] = useState<any[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<string>('');

    // State for closing virtual channel allocations
    const [allocations, setAllocations] = useState({
        participantA: '0',
        participantB: '200',
    });

    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        deposited: 0n,
        locked: 0n,
        channelCount: 0,
    });

    // Helper to add a transaction to history
    const addToHistory = useCallback((type: string, status: TransactionStatus, message: string, details?: any) => {
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

    // Helper to update allocations
    const handleAllocationChange = useCallback((participant: 'participantA' | 'participantB', value: string) => {
        setAllocations((prev) => ({ ...prev, [participant]: value }));
    }, []);

    return {
        wsResponses,
        setWsResponses,
        isLoading,
        setIsLoading,
        transactionHistory,
        virtualChannelId,
        setVirtualChannelId,
        virtualChannelAmount,
        setVirtualChannelAmount,
        participants,
        setParticipants,
        selectedParticipant,
        setSelectedParticipant,
        allocations,
        setAllocations,
        handleAllocationChange,
        accountInfo,
        setAccountInfo,
        addToHistory,
    };
};
