export const shortenHex = (hex: string | undefined | null, length = 4, tail?: number | null) => {
    if (!tail) {
        return `${hex?.substring(0, length + 2)}…${hex?.substring(hex?.length - length)}`;
    } else {
        return `${hex?.substring(0, length)}…${hex?.substring(hex?.length - tail)}`;
    }
};
