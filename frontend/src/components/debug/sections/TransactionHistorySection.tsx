import React from 'react';
import { Transaction } from '@/hooks/debug/useTransactionHistory';

interface TransactionHistorySectionProps {
    transactions: Transaction[];
    responses: Record<string, any>;
}

export const TransactionHistorySection: React.FC<TransactionHistorySectionProps> = ({ transactions, responses }) => {
    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">Transaction History</h2>

            <div className="space-y-2">
                {transactions.length > 0 ? (
                    transactions.map((tx) => (
                        <div key={tx.id} className="p-3 border rounded-md">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium capitalize">{tx.type}</span>
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                        tx.status === 'error'
                                            ? 'bg-red-100 text-red-800'
                                            : tx.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-green-100 text-green-800'
                                    }`}
                                >
                                    {tx.status}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{tx.message}</div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{new Date(tx.timestamp).toLocaleString()}</span>
                                {tx.details && (
                                    <button
                                        onClick={() => console.log('Transaction details:', tx.details)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        Details
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-4">No transactions yet.</p>
                )}
            </div>

            {/* Add a details section for response data */}
            {Object.keys(responses).length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <details className="cursor-pointer">
                        <summary className="text-sm text-gray-500 font-medium mb-2">Raw Response Data</summary>
                        <div className="overflow-x-auto max-h-60 text-xs">
                            {Object.entries(responses).map(([key, value], index) =>
                                value ? (
                                    <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                                        <div className="font-medium mb-1 capitalize">{key}:</div>
                                        <pre className="whitespace-pre-wrap break-words">
                                            {JSON.stringify(Number(value), null, 2)}
                                        </pre>
                                    </div>
                                ) : null,
                            )}
                        </div>
                    </details>
                </div>
            )}
        </section>
    );
};
