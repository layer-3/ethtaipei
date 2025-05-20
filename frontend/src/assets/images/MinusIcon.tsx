interface IMinusIcon {
    className?: string;
}

export const MinusIcon: React.FC<IMinusIcon> = ({ className = 'h-5 w-5' }: IMinusIcon) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z" clipRule="evenodd" />
        </svg>
    );
};
