import { useState, useCallback } from 'react';

export const useResponseTracking = () => {
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const setResponse = useCallback((key: string, value: any) => {
        setResponses((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setLoading = useCallback((key: string, isLoading: boolean) => {
        setLoadingStates((prev) => ({ ...prev, [key]: isLoading }));
    }, []);

    const clearResponses = useCallback(() => {
        setResponses({});
    }, []);

    return {
        responses,
        loadingStates,
        setResponse,
        setLoading,
        clearResponses,
    };
};
