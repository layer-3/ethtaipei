import React from 'react';

interface DebugResponseProps {
    sectionKey: string;
    response: any;
    loading: boolean;
}

export const DebugResponse: React.FC<DebugResponseProps> = ({ sectionKey, response, loading }) => {
    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
            </div>
        );
    }

    if (!response) return null;

    if (response.error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                <p className="text-red-600">Error: {response.error}</p>
            </div>
        );
    }

    return (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-3">
            <pre className="whitespace-pre-wrap break-words text-sm overflow-x-auto max-h-60">
                {JSON.stringify(response, null, 2)}
            </pre>
        </div>
    );
};

export const RawResponse: React.FC<{ sectionKey: string; response: any }> = ({ sectionKey, response }) => {
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
