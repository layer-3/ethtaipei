import React from 'react';
import { ResponseDisplay } from '../common/ResponseDisplay'; // Assuming potential future use
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { ActionButton } from '@/components/ui/ActionButton';

interface DepositSectionProps {
    currentDeposit: string;
    onOpenDeposit: () => void;
    fetchAccountInfo: () => void; // Keep fetchAccountInfo if needed elsewhere
    // Add response prop, even if not directly used by this section's button
    response?: any;
    isLoading?: boolean; // Add isLoading if applicable
}

export const DepositSection: React.FC<DepositSectionProps> = ({
    currentDeposit,
    onOpenDeposit,
    // fetchAccountInfo, // Can be removed if only used by modal
    response, // Destructure response
    isLoading, // Destructure isLoading
}) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">2. Deposit Funds</h2>
            <p className="text-sm text-gray-600 mb-2">
                Your current deposited amount (available for channels):{' '}
                <span className="font-semibold">{currentDeposit}</span>
            </p>
            <ActionButton onClick={onOpenDeposit}>Open Deposit Modal</ActionButton>
            {/* Optional: Display response related to deposit actions if needed here */}
            {/* <ResponseDisplay response={response} isLoading={isLoading || false} /> */}
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
        </section>
    );
};
