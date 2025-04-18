'use client';

import { useEffect } from 'react';
import { NotificationService } from '@/utils/notificationService';

export const NotificationInitializer = () => {
    useEffect(() => {
        // Initialize the notification service on the client side
        if (typeof window !== 'undefined') {
            NotificationService.getInstance();
        }
    }, []);

    return null; // This component doesn't render anything
};
