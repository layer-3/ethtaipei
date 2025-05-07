import { useCallback } from 'react';
import { NitroliteStore } from '@/store';

export function useResize() {
    const handleResizeChannel = useCallback(async (finalState: any, initState: any) => {
        try {
            console.log('proofs', initState);

            await NitroliteStore.state.client.resizeChannel({
                resizeState: finalState,
                proofStates: [initState],
            });

            return true;
        } catch (error) {
            console.error('Error resizing channel:', error);

            throw error;
        }
    }, []);

    return {
        handleResizeChannel,
    };
}
