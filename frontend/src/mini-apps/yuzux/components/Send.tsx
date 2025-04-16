'use client';

import React from 'react';
import { SendContainer } from './send/SendContainer';

interface SendProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Send: React.FC<SendProps> = ({ isOpen, onClose }) => {
    return <SendContainer isOpen={isOpen} onClose={onClose} />;
};