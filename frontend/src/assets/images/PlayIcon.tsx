interface IPlayIcon {
    className?: string;
}

export const PlayIcon: React.FC<IPlayIcon> = ({
    className = 'w-6 h-6 text-text-color-50 group-hover:text-text-color-70',
}: IPlayIcon) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path
                fillRule="evenodd"
                d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
            />
        </svg>
    );
};
