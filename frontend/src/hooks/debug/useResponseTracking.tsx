import { useSnapshot } from 'valtio';
import { DebugStore } from '@/store/DebugStore';

export const useResponseTracking = () => {
    const { responses, loadingStates } = useSnapshot(DebugStore.state);

    return {
        responses,
        loadingStates,
        setResponse: DebugStore.setResponse,
        setLoading: DebugStore.setLoading,
        clearResponses: DebugStore.clearResponses,
    };
};
