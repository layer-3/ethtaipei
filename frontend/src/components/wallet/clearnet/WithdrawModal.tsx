interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg dark:bg-gray-800 overflow-auto max-h-[90vh]">
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-xl font-semibold">Withdraw from Custody</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                        &times;
                    </button>
                </div>
                {/* <WithdrawFromCustody /> */}
            </div>
        </div>
    );
}

export default WithdrawModal;
