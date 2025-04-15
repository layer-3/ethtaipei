import { useCallback } from 'react';
import AppStore from '@/store/AppStore';

/**
 * A simple custom hook to handle opening & closing the deposit modal.
 */
export function useDepositHandlers() {
    // Open deposit modal
    const handleOpenDeposit = useCallback(() => {
        AppStore.openDeposit();
    }, []);

    // Close deposit modal
    const handleCloseDeposit = useCallback(() => {
        AppStore.closeDeposit();
    }, []);

    return {
        handleOpenDeposit,
        handleCloseDeposit,
    };
}
