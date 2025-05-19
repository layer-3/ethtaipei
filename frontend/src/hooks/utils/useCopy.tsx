import { useState, useEffect, useCallback } from 'react';

interface UseCopyProps {
    content: string;
}

interface UseCopyState {
    copy: () => void;
    isCopied: boolean;
}

export const useCopy = ({ content }: UseCopyProps): UseCopyState => {
    const [isCopied, setIsCopied] = useState<boolean>(false);

    useEffect(() => {
        if (!isCopied) {
            return;
        }

        setTimeout(() => {
            setIsCopied(false);
        }, 1000);
    }, [isCopied]);

    const copy = useCallback(() => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
    }, [content]);

    return { copy, isCopied };
};
