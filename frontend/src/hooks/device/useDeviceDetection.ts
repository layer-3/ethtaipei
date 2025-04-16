import { useState, useEffect } from 'react';

export function useDeviceDetection() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileUserAgent =
                /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);

            const isSmallScreen = window.innerWidth <= 768;
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            const mobileDevice =
                (isMobileUserAgent && isSmallScreen) || 
                (isMobileUserAgent && hasTouch) || 
                (isSmallScreen && hasTouch);

            setIsMobile(mobileDevice);
        };

        checkIfMobile();

        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return { isMobile };
}