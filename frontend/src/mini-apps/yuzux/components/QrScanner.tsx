import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
    onScan: (data: string) => void;
    onError?: (error: Error) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError }) => {
    const [hasCamera, setHasCamera] = useState<boolean>(false);
    const [permission, setPermission] = useState<boolean>(false);
    const [scanning, setScanning] = useState<boolean>(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivId = 'html5-qrcode-scanner';

    // Check if device has a camera
    useEffect(() => {
        const checkCamera = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter((device) => device.kind === 'videoinput');

                setHasCamera(videoDevices.length > 0);
            } catch (error) {
                console.error('Error checking for camera:', error);
                setHasCamera(false);
                onError?.(error as Error);
            }
        };

        checkCamera();
    }, [onError]);

    // Request camera permission
    useEffect(() => {
        if (!hasCamera) return;

        const requestPermission = async () => {
            try {
                // Ask for permission to access camera
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                    },
                });

                // Immediately stop the stream to free the camera until we actually scan
                stream.getTracks().forEach((track) => track.stop());

                setPermission(true);
                setScanning(true);
            } catch (error) {
                console.error('Error getting camera permission:', error);
                setPermission(false);
                setScanning(false);
                onError?.(error as Error);
            }
        };

        requestPermission();
    }, [hasCamera, onError]);

    // Initialize scanner when permission is granted
    useEffect(() => {
        if (!permission || !scanning) return;

        let html5QrcodeScanner: Html5Qrcode | null = null;

        // Function to calculate viewport dimensions
        const getViewportDimensions = () => {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
                aspectRatio: window.innerWidth / window.innerHeight,
            };
        };

        const startScanner = async () => {
            try {
                // Create an instance of the scanner
                html5QrcodeScanner = new Html5Qrcode(scannerDivId);
                scannerRef.current = html5QrcodeScanner;

                const viewport = getViewportDimensions();

                // Using fixed size for QR box to ensure consistent scanning

                const config = {
                    fps: 24,
                    qrbox: {
                        width: 250,
                        height: 250,
                    },
                    disableFlip: false,
                };

                // Start scanning
                await html5QrcodeScanner.start(
                    {
                        facingMode: { exact: 'environment' },
                    },
                    config,
                    (decodedText) => {
                        // On successful scan
                        onScan(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore not found errors (these are normal when no QR code is in view)
                        if (
                            errorMessage.includes('No MultiFormat Readers') ||
                            errorMessage.includes('QR code parse error')
                        ) {
                            return;
                        }

                        // For other errors, log them
                        console.warn(`QR scan error: ${errorMessage}`);
                    },
                );
            } catch (error) {
                console.error('Error initializing QR scanner:', error);
                onError?.(error as Error);
            }
        };

        startScanner();

        // Handle resize events
        const handleResize = () => {
            // If we need to restart the scanner with new dimensions, we could do that here
            // For now, we'll rely on the responsive container styling
            console.log('Window resized, scanner container should adapt automatically');
        };

        // Add resize event listener
        window.addEventListener('resize', handleResize);

        // Clean up function
        return () => {
            // Remove resize event listener
            window.removeEventListener('resize', handleResize);

            // Stop scanner
            if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
                html5QrcodeScanner
                    .stop()
                    .then(() => {
                        console.log('QR Scanner stopped');
                    })
                    .catch((err) => {
                        console.error('Error stopping QR scanner:', err);
                    });
            }
        };
    }, [permission, scanning, onScan, onError]);

    // No camera view
    if (!hasCamera) {
        return (
            <div
                className="flex flex-col items-center justify-center w-full h-full bg-black text-white p-4 fixed inset-0"
                style={{ zIndex: 5 }}>
                <div className="text-center mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 mx-auto mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                    <p className="text-lg font-semibold">No Camera Available</p>
                    <p className="text-sm mt-2">Your device doesn&apos;t have a camera or access is restricted.</p>
                </div>
            </div>
        );
    }

    // No permission view
    if (!permission) {
        return (
            <div
                className="flex flex-col items-center justify-center w-full h-full bg-black text-white p-4 fixed inset-0"
                style={{ zIndex: 5 }}>
                <div className="text-center mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16 mx-auto mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                    </svg>
                    <p className="text-lg font-semibold">Camera Permission Required</p>
                    <p className="text-sm mt-2">Please allow camera access to scan QR codes.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-black">
            {/* Full screen scanner (will be overlapped by header) */}
            <div
                id={scannerDivId}
                className="w-full h-full"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 5, // Lower z-index so header can overlap
                }}
            />
        </div>
    );
};
