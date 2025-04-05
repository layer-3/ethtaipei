import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';

interface QrScannerProps {
    onScan: (data: string) => void;
    onError?: (error: Error) => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError }) => {
    const [hasCamera, setHasCamera] = useState<boolean>(false);
    const [permission, setPermission] = useState<boolean>(false);
    const [scanning, setScanning] = useState<boolean>(false);

    // Check for camera availability
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

    // Request camera permission if camera is available
    useEffect(() => {
        if (!hasCamera) return;

        const requestPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment',
                    },
                });

                // Close the stream immediately after getting permission
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

    const handleScan = (result: any) => {
        if (result) {
            setScanning(false);
            onScan(result?.text || result);
        }
    };

    if (!hasCamera) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black text-white p-4">
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

    if (!permission) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black text-white p-4">
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
        <div className="relative h-full bg-black">
            {/* QR Scanner */}
            <div className="aspect-square max-w-md mx-auto overflow-hidden">
                {scanning && (
                    <QrReader
                        constraints={{ facingMode: 'environment' }}
                        onResult={handleScan}
                        scanDelay={500}
                        videoId="qr-reader-video"
                        videoStyle={{ width: '100%', height: '100%' }}
                    />
                )}
            </div>

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="h-full flex flex-col justify-center items-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                        {/* Scanner corner markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />

                        {/* Scanning line animation */}
                        {scanning && <div className="absolute left-0 right-0 h-0.5 bg-red-500 animate-scan-line" />}
                    </div>

                    <div className="mt-4 text-white text-center">
                        <p>Align QR code within the frame</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
