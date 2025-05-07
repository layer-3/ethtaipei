import React, { useEffect, useState } from "react";
import { Modal } from "./common/Modal";
import { QrCodeDisplay } from "./QrCodeDisplay";
import { AddressDisplay } from "./AddressDisplay";

interface ReceiveProps {
    isOpen: boolean;
    onClose: () => void;
}

const RECEIVER_ADDRESS = "alice.yellow";

export const Receive: React.FC<ReceiveProps> = ({ isOpen, onClose }) => {
    // const walletSnap = useSnapshot(WalletStore.state);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            const hasShareApi = !!navigator.share;

            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);

            const isSmallScreen = window.innerWidth <= 768;

            setIsMobile((hasShareApi && (isMobileUserAgent || isSmallScreen)) || (isMobileUserAgent && isSmallScreen));
        };

        checkIfMobile();

        // Also check on window resize
        window.addEventListener("resize", checkIfMobile);
        return () => window.removeEventListener("resize", checkIfMobile);
    }, []);

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "My Wallet Address",
                    text: `Here's my wallet address: ${RECEIVER_ADDRESS}`,
                });
            } else {
                navigator.clipboard.writeText(RECEIVER_ADDRESS);
                alert("Sharing not supported in this browser. Address copied to clipboard instead.");
            }
        } catch (error) {
            console.error("Error sharing:", error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Receive">
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col items-center">
                        {RECEIVER_ADDRESS && (
                            <div className="pt-6 rounded-lg mx-auto">
                                <QrCodeDisplay address={RECEIVER_ADDRESS} />
                            </div>
                        )}
                        <AddressDisplay address={RECEIVER_ADDRESS || "0x0"} />
                    </div>
                </div>

                {/* Only show share button on mobile devices */}
                {isMobile && (
                    <div className="mt-auto w-full px-6 pb-4">
                        <button
                            onClick={handleShare}
                            className="w-full bg-white text-black py-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center border border-white"
                        >
                            Share
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
