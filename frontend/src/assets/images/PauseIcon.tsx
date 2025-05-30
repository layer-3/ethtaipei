interface IPauseIcon {
    className?: string;
}

export const PauseIcon: React.FC<IPauseIcon> = ({
    className = 'w-6 h-6 text-text-color-50 group-hover:text-text-color-70',
}: IPauseIcon) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
            />
        </svg>
    );
};
