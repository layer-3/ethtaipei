import React from 'react';

interface IUserIconBackgroundProps {
    className?: string;
}

export const UserIconBackground: React.FC<IUserIconBackgroundProps> = ({ className }) => {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#filter0_ddd_33959_170210)">
                <path
                    d="M22.5733 37.0917C21.5997 37.6537 20.4003 37.6537 19.4267 37.0917L6.98484 29.9083C6.01128 29.3463 5.41154 28.3075 5.41154 27.1833V12.8167C5.41154 11.6925 6.01128 10.6537 6.98484 10.0917L19.4267 2.90834C20.4003 2.34626 21.5997 2.34626 22.5733 2.90834L35.0152 10.0917C35.9887 10.6537 36.5885 11.6925 36.5885 12.8167V27.1833C36.5885 28.3075 35.9887 29.3463 35.0152 29.9083L22.5733 37.0917Z"
                    fill="#E3E3E3"
                />
            </g>
            <mask
                id="mask0_33959_170210"
                style={{ maskType: 'alpha' }}
                maskUnits="userSpaceOnUse"
                x="5"
                y="2"
                width="32"
                height="36">
                <path
                    d="M19.6767 36.6586L7.23484 29.4753C6.41598 29.0026 5.91154 28.1289 5.91154 27.1833V12.8167C5.91154 11.8711 6.41598 10.9974 7.23484 10.5247L19.6767 3.34135C20.4956 2.86859 21.5044 2.86859 22.3233 3.34135L34.7652 10.5247C35.584 10.9974 36.0885 11.8711 36.0885 12.8167V27.1833C36.0885 28.1289 35.584 29.0026 34.7652 29.4753L22.3233 36.6586C21.5044 37.1314 20.4956 37.1314 19.6767 36.6586Z"
                    fill="white"
                    stroke="#E3E3E3"
                />
            </mask>
            <g mask="url(#mask0_33959_170210)">
                <path
                    d="M19.6767 36.6586L7.23484 29.4753C6.41598 29.0026 5.91154 28.1289 5.91154 27.1833V12.8167C5.91154 11.8711 6.41598 10.9974 7.23484 10.5247L19.6767 3.34135C20.4956 2.86859 21.5044 2.86859 22.3233 3.34135L34.7652 10.5247C35.584 10.9974 36.0885 11.8711 36.0885 12.8167V27.1833C36.0885 28.1289 35.584 29.0026 34.7652 29.4753L22.3233 36.6586C21.5044 37.1314 20.4956 37.1314 19.6767 36.6586Z"
                    fill="white"
                    stroke="white"
                />
            </g>
            <defs>
                <filter
                    id="filter0_ddd_33959_170210"
                    x="0.411133"
                    y="0.488281"
                    width="41.1777"
                    height="46.0234"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset />
                    <feGaussianBlur stdDeviation="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_33959_170210" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology
                        radius="1"
                        operator="erode"
                        in="SourceAlpha"
                        result="effect2_dropShadow_33959_170210"
                    />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="3" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                    <feBlend
                        mode="normal"
                        in2="effect1_dropShadow_33959_170210"
                        result="effect2_dropShadow_33959_170210"
                    />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feMorphology
                        radius="1"
                        operator="erode"
                        in="SourceAlpha"
                        result="effect3_dropShadow_33959_170210"
                    />
                    <feOffset dy="2" />
                    <feGaussianBlur stdDeviation="2" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0" />
                    <feBlend
                        mode="normal"
                        in2="effect2_dropShadow_33959_170210"
                        result="effect3_dropShadow_33959_170210"
                    />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_33959_170210" result="shape" />
                </filter>
            </defs>
        </svg>
    );
};
