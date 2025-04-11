import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';

interface DepositSectionProps {
    currentDeposit: string;
    onOpenDeposit: () => void;
}

export const DepositSection: React.FC<DepositSectionProps> = ({ currentDeposit, onOpenDeposit }) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">2. Deposit Balance</h2>
            <div className="flex items-center justify-between">
                <div>
                    <p className="mb-2">
                        Available Balance: <span className="font-semibold text-green-600">${currentDeposit}</span>
                    </p>
                    <p className="text-sm text-gray-600">Use the deposit button to add funds to your account.</p>
                </div>
                <ActionButton onClick={onOpenDeposit}>Deposit</ActionButton>
            </div>
        </section>
    );
};
