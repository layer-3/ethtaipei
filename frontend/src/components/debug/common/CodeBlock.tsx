import React from 'react';

interface CodeBlockProps {
    text: any;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ text }) => {
    if (!text) return null;

    return (
        <div className="mt-4">
            <details className="cursor-pointer">
                <summary className="text-sm text-gray-500">How to use?</summary>
                <div className="bg-gray-50 p-3 mt-2 rounded-md overflow-x-auto text-xs">
                    <pre className="whitespace-pre-wrap break-words">{text}</pre>
                </div>
            </details>
        </div>
    );
};
