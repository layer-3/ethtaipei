import React, { FC } from 'react';

interface IArrowIconProps {
    className: string;
}

export const ArrowIcon: FC<IArrowIconProps> = ({ className }) => {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
            <path
                d="M4.16663 10H15.8333"
                stroke="#090909"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
             />
            <path
                d="M10 4.16669L15.8333 10L10 15.8334"
                stroke="#090909"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
             />
        </svg>
    );
};

export const QRCodeIcon: React.FC<IArrowIconProps> = ({ className }) => {
    return (
        <svg
            className={className}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.16667 2.5H2.5V9.16667H9.16667V2.5ZM4.16667 7.5V4.16667H7.5V7.5H4.16667ZM9.16667 10.8333H2.5V17.5H9.16667V10.8333ZM4.16667 15.8333V12.5H7.5V15.8333H4.16667ZM10.8333 2.5H17.5V9.16667H10.8333V2.5ZM12.5 4.16667V7.5H15.8333V4.16667H12.5Z"
                fill="black"
            />
            <path
                d="M12.5 10.8333H10.8333V12.5H12.5V10.8333ZM10.8333 15.8333H12.5V17.5H10.8333V15.8333ZM17.5 10.8333H15.8333V12.5H17.5V10.8333ZM15.8333 15.8333H17.5V17.5H15.8333V15.8333ZM15 13.3333H13.3333V15H15V13.3333Z"
                fill="black"
            />
        </svg>
    );
};

export const WalletConnectIcon: React.FC<IArrowIconProps> = ({ className }) => {
    return (
        <svg
            width="19"
            height="12"
            viewBox="0 0 19 12"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M3.89197 2.3456C6.98751 -0.781865 12.0125 -0.781865 15.108 2.3456L15.4807 2.72487C15.637 2.88031 15.637 3.13523 15.4807 3.29067L14.2064 4.57772C14.1283 4.65855 14.0021 4.65855 13.9239 4.57772L13.413 4.06166C11.2491 1.87927 7.75087 1.87927 5.587 4.06166L5.04002 4.61503C4.96188 4.69586 4.83565 4.69586 4.75751 4.61503L3.48323 3.32798C3.32695 3.17254 3.32695 2.91762 3.48323 2.76218L3.89197 2.3456ZM17.7468 5.00674L18.8828 6.15078C19.0391 6.30622 19.0391 6.56114 18.8828 6.71658L13.7676 11.8834C13.6114 12.0389 13.3589 12.0389 13.2086 11.8834L9.57814 8.21503C9.54208 8.17772 9.47596 8.17772 9.43989 8.21503L5.8094 11.8834C5.65312 12.0389 5.40066 12.0389 5.2504 11.8834L0.11721 6.71658C-0.0390699 6.56114 -0.0390699 6.30622 0.11721 6.15078L1.25324 5.00674C1.40952 4.8513 1.66197 4.8513 1.81224 5.00674L5.44274 8.67513C5.4788 8.71244 5.54492 8.71244 5.58099 8.67513L9.21149 5.00674C9.36777 4.8513 9.62022 4.8513 9.77049 5.00674L13.401 8.67513C13.437 8.71244 13.5032 8.71244 13.5392 8.67513L17.1697 5.00674C17.338 4.8513 17.5905 4.8513 17.7468 5.00674Z"
                fill="currentColor"
             />
        </svg>
    );
};

export const WalletConnectBrandIcon: React.FC<IArrowIconProps> = ({ className }: IArrowIconProps) => {
    return (
        <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clipPath="url(#clip0_24856_15688)">
                <path
                    d="M17.9999 35.955C27.9162 35.955 35.9549 27.9163 35.9549 18C35.9549 8.08371 27.9162 0.0449829 17.9999 0.0449829C8.08365 0.0449829 0.0449219 8.08371 0.0449219 18C0.0449219 27.9163 8.08365 35.955 17.9999 35.955Z"
                    fill="#3396FF"
                    stroke="#66B1FF"
                />
                <path
                    d="M11.0271 13.4069C14.8783 9.65125 21.1225 9.65125 24.9737 13.4069L25.4372 13.8588C25.6298 14.0466 25.6298 14.351 25.4372 14.5388L23.8517 16.085C23.7554 16.1789 23.5993 16.1789 23.503 16.085L22.8652 15.463C20.1784 12.843 15.8224 12.843 13.1356 15.463L12.4525 16.1291C12.3562 16.223 12.2002 16.223 12.1039 16.1291L10.5183 14.5829C10.3257 14.3951 10.3257 14.0907 10.5183 13.9029L11.0271 13.4069ZM28.2528 16.6045L29.6639 17.9806C29.8565 18.1683 29.8565 18.4728 29.6639 18.6605L23.3009 24.8655C23.1084 25.0533 22.7962 25.0533 22.6036 24.8655L18.0876 20.4617C18.0395 20.4147 17.9614 20.4147 17.9133 20.4617L13.3973 24.8655C13.2048 25.0533 12.8925 25.0533 12.6999 24.8655L6.33681 18.6604C6.14424 18.4727 6.14424 18.1682 6.33681 17.9805L7.74796 16.6044C7.94052 16.4166 8.25273 16.4166 8.44529 16.6044L12.9614 21.0083C13.0095 21.0552 13.0876 21.0552 13.1357 21.0083L17.6516 16.6044C17.8442 16.4165 18.1564 16.4165 18.349 16.6044L22.8651 21.0083C22.9132 21.0552 22.9913 21.0552 23.0394 21.0083L27.5555 16.6045C27.748 16.4166 28.0602 16.4166 28.2528 16.6045Z"
                    fill="white"
                />
            </g>
            <defs>
                <clipPath id="clip0_24856_15688">
                    <rect width="36" height="36" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
};

interface IWalletConnectSquareIconProps {
    className?: string;
    fillColor?: string;
}

export const WalletConnectSquareIcon: FC<IWalletConnectSquareIconProps> = ({
    className,
    fillColor = '#2C2C2C',
}: IWalletConnectSquareIconProps) => {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clipPath="url(#clip0_26841_38942)">
                <path
                    d="M15.752 6.69667C15.7522 6.69689 15.7524 6.69711 15.7526 6.69733L16.0574 7.00751L15.0652 8.00972L14.7683 7.70989L14.7681 7.70961C12.4086 5.32995 8.59142 5.32995 6.23194 7.70961L6.2314 7.71016L5.89859 8.04686L4.90644 7.04477L5.24733 6.69733C5.24759 6.69707 5.24785 6.69681 5.24811 6.69655C8.14783 3.76778 12.8524 3.76782 15.752 6.69667ZM18.4584 9.42587L19.4592 10.4338L14.4881 15.455L10.9348 11.8646C10.7028 11.6279 10.3154 11.6279 10.0834 11.8644L6.52975 15.4552L1.54094 10.4337L2.53261 9.435L6.08611 13.0256C6.31813 13.2623 6.70562 13.2622 6.93758 13.0256L10.491 9.43513L14.0444 13.0256C14.2764 13.2623 14.664 13.2623 14.8959 13.0255L18.4584 9.42587ZM1.46981 10.5053L1.47075 10.5043C1.47045 10.5047 1.47012 10.505 1.46981 10.5053Z"
                    fill={fillColor}
                    stroke={fillColor}
                />
            </g>
        </svg>
    );
};
