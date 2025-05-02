import { useCallback } from 'react';
import { NitroliteStore } from '@/store';
import { Hex } from 'viem';

export function useResize() {
    const handleResizeChannel = useCallback(async (finalState: any) => {
        try {
            const channelId = localStorage.getItem('nitrolite_channel_id') as Hex;
            const resizeState = {
                ...finalState,
            };

            await NitroliteStore.state.client.resizeChannel({
                channelId: channelId,
                candidateState: resizeState,
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
