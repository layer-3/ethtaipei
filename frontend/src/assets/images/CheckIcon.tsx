export interface ICheckIcon {
    className?: string;
}

export const CheckIcon: React.FC<ICheckIcon> = ({ className = 'h-4 w-4 ml-auto' }: ICheckIcon) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
};
