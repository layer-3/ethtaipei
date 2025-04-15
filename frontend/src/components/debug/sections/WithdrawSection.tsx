import React from 'react';
import { ResponseDisplay } from '../common/ResponseDisplay';
import { RawResponseDisplay } from '../common/RawResponseDisplay'; // Import RawResponseDisplay
import { ActionButton } from '@/components/ui/ActionButton';

interface WithdrawSectionProps {
    currentDeposit: string;
    onWithdraw: () => void;
    isLoading: boolean;
    response: any; // Add response prop
}

export const WithdrawSection: React.FC<WithdrawSectionProps> = ({
    currentDeposit,
    onWithdraw,
    isLoading,
    response, // Destructure response
}) => {
    const canWithdraw = Number(currentDeposit) > 0;

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">9. Withdraw Funds</h2>
            <p className="text-sm text-gray-600 mb-2">
                Your current withdrawable deposit: <span className="font-semibold">{currentDeposit}</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
                Withdraw your deposited funds from the Nitro Adjudicator contract back to your wallet. This can only be
                done when no channels are active or locked.
            </p>
            <ActionButton onClick={onWithdraw} disabled={!canWithdraw || isLoading}>
                {isLoading ? 'Withdrawing...' : 'Withdraw All'}
            </ActionButton>
            {!canWithdraw && <p className="text-sm text-red-500 mt-2">No funds available to withdraw.</p>}
            <ResponseDisplay response={response} isLoading={isLoading} />
            <RawResponseDisplay response={response} /> {/* Add RawResponseDisplay */}
        </section>
    );
};
