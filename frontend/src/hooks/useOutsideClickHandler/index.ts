import { useCallback, useEffect } from 'react';

export const useOutsideClickHandler = (ref: any, isListenerEnabled: boolean, callback: () => void) => {
    const handleClickOutside = useCallback(
        (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        },
        [callback, ref],
    );

    useEffect(() => {
        if (isListenerEnabled) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [handleClickOutside, isListenerEnabled]);
};
