import React from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { formatTokenUnits } from '@/hooks/utils/tokenDecimals';

interface ListParticipantsSectionProps {
    participants: any[];
    selectedParticipant: string;
    onSelectParticipant: (address: string) => void;
    onGetParticipants: () => void;
    isLoading: boolean;
    response: any;
    isCurrentUser: (address: string) => boolean;
    token: Hex;
}

export const ListParticipantsSection: React.FC<ListParticipantsSectionProps> = ({
    participants,
    selectedParticipant,
    onSelectParticipant,
    onGetParticipants,
    isLoading,
    response,
    isCurrentUser,
    token,
}) => {
    // Helper to display raw responses
    const renderRawResponse = () => {
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

    return (
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b">4. List Participants</h2>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Fetch available participants for virtual channels.</p>
                <div className="flex items-center space-x-2">
                    {participants.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {
                                participants.filter(
                                    (p, i, self) => i === self.findIndex((t) => t.address === p.address),
                                ).length
                            }{' '}
                            unique participants
                        </span>
                    )}
                    <ActionButton onClick={onGetParticipants} disabled={isLoading}>
                        Get Participants
                    </ActionButton>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
                </div>
            ) : participants.length > 0 ? (
                <div className="mt-4">
                    <h3 className="font-medium mb-2">Select a participant:</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Address
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Select
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {/* Get unique participants by address to avoid duplicates */}
                                {participants
                                    .filter(
                                        (participant, index, self) =>
                                            index === self.findIndex((p) => p.address === participant.address),
                                    )
                                    .map((participant, index) => (
                                        <tr
                                            key={index}
                                            className={
                                                isCurrentUser(participant.address)
                                                    ? 'bg-blue-50'
                                                    : selectedParticipant === participant.address
                                                      ? 'bg-green-50'
                                                      : ''
                                            }>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                <div className="flex items-center">
                                                    <span
                                                        className={
                                                            isCurrentUser(participant.address) ? 'font-semibold' : ''
                                                        }>
                                                        {participant.address}
                                                        {isCurrentUser(participant.address) && (
                                                            <span className="ml-1 text-blue-600">(You)</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                {formatTokenUnits(token, participant.amount)}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                <input
                                                    type="radio"
                                                    name="participant"
                                                    onChange={() => onSelectParticipant(participant.address)}
                                                    checked={selectedParticipant === participant.address}
                                                    disabled={isCurrentUser(participant.address)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {selectedParticipant && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                            <p className="font-medium text-blue-800">Selected Participant</p>
                            <p className="text-sm text-blue-700 font-mono mt-1">{selectedParticipant}</p>
                        </div>
                    )}
                </div>
            ) : response && !response.error ? (
                <div className="p-4 bg-yellow-50 rounded-md text-yellow-700 text-center">No participants found</div>
            ) : null}

            {renderRawResponse()}
        </section>
    );
};
