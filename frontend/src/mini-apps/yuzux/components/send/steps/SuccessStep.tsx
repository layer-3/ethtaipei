import React from 'react';
import { SuccessCheckmark } from '../../common/StatusIndicator';

export const SuccessStep: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <SuccessCheckmark />
            <div className="text-center">
                <h2 className="text-2xl font-metro-semibold mb-2 text-white">Success!</h2>
                <p className="text-gray-400 font-metro-regular">Payment sent</p>
            </div>
        </div>
    );
};
