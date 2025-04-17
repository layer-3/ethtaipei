import React, { useState, useCallback } from 'react';

interface ManualEntryStepProps {
    recipientAddress: string;
    onAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddressSubmit: () => void;
    onSwitchToScan: () => void;
    isMobile: boolean;
}

export const ManualEntryStep: React.FC<ManualEntryStepProps> = ({
    recipientAddress,
    onAddressChange,
    onAddressSubmit,
    onSwitchToScan,
    isMobile,
}) => {
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isPasting, setIsPasting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Validate Ethereum address format
    const isValidEthereumAddress = (address: string): boolean => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    // Handle paste from clipboard
    const handlePaste = useCallback(async () => {
        try {
            setIsPasting(true);
            const text = await navigator.clipboard.readText();

            // Create a synthetic event to use with the existing onAddressChange handler
            const syntheticEvent = {
                target: { value: text },
            } as React.ChangeEvent<HTMLInputElement>;

            onAddressChange(syntheticEvent);

            // Validate the pasted address
            if (text && !isValidEthereumAddress(text)) {
                setValidationError('Invalid Ethereum address format');
            } else {
                setValidationError(null);
            }
        } catch (error) {
            console.error('Failed to read clipboard:', error);
            setValidationError('Could not access clipboard. Please paste manually.');
        } finally {
            setIsPasting(false);
        }
    }, [onAddressChange]);

    // Handle address validation on input change
    const handleAddressValidation = (e: React.ChangeEvent<HTMLInputElement>) => {
        const address = e.target.value;

        onAddressChange(e);

        if (address && !isValidEthereumAddress(address)) {
            setValidationError('Invalid Ethereum address format');
        } else {
            setValidationError(null);
        }
    };

    const isAddressValid = !validationError && recipientAddress && isValidEthereumAddress(recipientAddress);

    // Border color is now directly applied in the className

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6">
                <div className="flex flex-col space-y-6">
                    <div className="">
                        <label className="block text-sm font-medium text-white mb-2">Recipient Address</label>

                        <div className="relative">
                            <div className="rounded-md transition-all duration-300">
                                <div className="relative bg-black rounded-md">
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={recipientAddress}
                                        onChange={handleAddressValidation}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className={`block w-full px-4 py-4 bg-black rounded-md text-white shadow-sm border ${validationError ? 'border-red-500' : isAddressValid ? 'border-green-500' : isFocused ? 'border-white' : 'border-gray-500'} focus:outline-none text-lg pr-24 transition-all duration-200 font-mono`}
                                        autoFocus={!isMobile}
                                    />
                                    <button
                                        onClick={handlePaste}
                                        disabled={isPasting}
                                        className={`absolute inset-y-0 right-0 px-3 m-1 rounded-md border-none transition-all duration-200 flex items-center justify-center space-x-1 ${
                                            isPasting
                                                ? 'bg-gray-200 text-gray-600'
                                                : 'bg-white text-black hover:bg-gray-100 active:bg-gray-200'
                                        }`}
                                    >
                                        {isPasting ? (
                                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-1" />
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4 mr-1"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                />
                                            </svg>
                                        )}
                                        {isPasting ? 'Pasting...' : 'Paste'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Validation messages */}
                        <div className="min-h-[28px] mt-3">
                            {validationError ? (
                                <div
                                    className="flex items-center text-red-500 text-sm "
                                    style={{ animationDelay: '0.05s' }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1 flex-shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span>{validationError}</span>
                                </div>
                            ) : recipientAddress && isAddressValid ? (
                                <div
                                    className="flex items-center text-green-500 text-sm "
                                    style={{ animationDelay: '0.05s' }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1 flex-shrink-0"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    <span>Valid Ethereum address</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {/* Address format hint */}
                    <div
                        className="bg-gray-900 rounded-lg p-4 text-xs text-gray-400  border border-gray-800"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <p className="font-medium text-white mb-1">Address Format</p>
                        <p>
                            Ethereum addresses start with &quot;0x&quot; followed by 40 hexadecimal characters (0-9,
                            a-f).
                        </p>
                        <p className="mt-1 text-gray-500 font-mono text-xs">
                            Example: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                        </p>
                    </div>
                </div>
            </div>

            {/* Buttons */}
            <div className="p-6 space-y-3 " style={{ animationDelay: '0.3s' }}>
                <button
                    onClick={onAddressSubmit}
                    disabled={!isAddressValid}
                    className={`w-full py-4 rounded-md transition-all duration-200 text-lg font-medium
                        ${
                            isAddressValid
                                ? 'bg-white text-black hover:bg-gray-200 active:bg-gray-300'
                                : 'disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                >
                    Continue
                </button>

                {isMobile && (
                    <button
                        onClick={onSwitchToScan}
                        className="w-full bg-transparent text-white py-4 rounded-md hover:bg-gray-900 transition-colors text-lg font-medium border border-gray-800 mt-2"
                    >
                        <div className="flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Scan QR Code
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
};
