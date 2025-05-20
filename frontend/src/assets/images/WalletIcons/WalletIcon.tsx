import React from 'react';

interface IWalletIcon {
    className?: string;
}

export const WalletIcon: React.FC<IWalletIcon> = ({ className }) => {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
                d="M16.0091 7.75015V16.0187H3.98132V7.75015H16.0184H16.0091ZM18.3332 5.43533H1.6665V18.3335H18.3332V5.43533Z"
                fill="currentColor"
            />
            <path
                d="M14.7696 11.882L12.9761 10.0886L11.1827 11.882L12.9761 13.6755L14.7696 11.882Z"
                fill="currentColor"
            />
            <path
                d="M15.2128 6.00008H12.898V3.98156H3.98132V6.00008H1.6665V1.66675H15.2128V6.00008Z"
                fill="currentColor"
            />
        </svg>
    );
};
