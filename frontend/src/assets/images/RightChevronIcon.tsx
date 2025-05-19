interface IRightChevronIcon {
    className?: string;
}

export const RightChevronIcon: React.FC<IRightChevronIcon> = ({
    className = 'w-6 h-6 transform text-white',
}) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
            <path d="M9.354 5.354a.5.5 0 0 0-.707 0l-.704.703a.5.5 0 0 0 0 .707L13.17 12l-5.227 5.236a.5.5 0 0 0 0 .707l.704.703a.5.5 0 0 0 .707 0l6.293-6.292a.5.5 0 0 0 0-.707L9.354 5.353Z" />
        </svg>
    );
};
