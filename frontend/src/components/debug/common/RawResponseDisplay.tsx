import React from 'react';

interface RawResponseDisplayProps {
    response: any;
}

export const RawResponseDisplay: React.FC<RawResponseDisplayProps> = ({ response }) => {
    if (!response) return null;

    return (
        <div className="mt-4">
            <details className="cursor-pointer">
                <summary className="text-sm text-gray-500">Raw Response</summary>
                <div className="bg-gray-50 p-3 mt-2 rounded-md overflow-x-auto text-xs">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(response, null, 2)}</pre>
                </div>
            </details>
        </div>
    );
};
