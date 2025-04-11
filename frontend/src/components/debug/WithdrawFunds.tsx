import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { DebugResponse, RawResponse } from './DebugResponse';

interface WithdrawFundsProps {
    currentDeposit: string;
    onWithdraw: () => Promise<void>;
    isLoading: boolean;
    response: any;
}

export const WithdrawFunds: React.FC<WithdrawFundsProps> = ({ currentDeposit, onWithdraw, isLoading, response }) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">9. Withdraw Funds</h2>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="mb-2">
                        Available to withdraw: <span className="font-semibold text-green-600">${currentDeposit}</span>
                    </p>
                    <p className="text-sm text-gray-600">Withdraw available funds back to your wallet.</p>
                </div>
                <ActionButton onClick={onWithdraw} disabled={isLoading || Number(currentDeposit) <= 0}>
                    Withdraw All
                </ActionButton>
            </div>

            <DebugResponse sectionKey="withdrawal" response={response} loading={isLoading} />
            <RawResponse sectionKey="withdrawal" response={response} />
        </section>
    );
};
