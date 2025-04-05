import React from 'react';
import { QRCode } from 'react-qrcode-logo';

interface QrCodeDisplayProps {
    address: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ address }) => {
    if (!address) {
        return (
            <div className="w-64 h-64 bg-black border border-white flex items-center justify-center">
                <span className="text-white">No address available</span>
            </div>
        );
    }

    // Using black and white colors for QR code
    const qrBgColor = '#ffffff';
    const qrFgColor = '#000000';

    return (
        <div className="h-[280px] flex items-center justify-center rounded-sm">
            <QRCode
                value={address}
                size={240}
                logoImage="./logo_yuzux.png"
                logoHeight={40}
                logoWidth={40}
                logoPadding={6}
                logoPaddingStyle="circle"
                qrStyle="dots"
                removeQrCodeBehindLogo
                eyeRadius={360}
                bgColor={qrBgColor}
                fgColor={qrFgColor}
            />
        </div>
    );
};
