export const cleanPositiveFloatInput = (text: string) => {
    let cleanInput = text
        .replace(/,/g, '')
        .replace(/-+/, '')
        .replace(/^0+/, '0')
        .replace(/\.+/, '.')
        .replace(/^\./, '0.')
        .replace(/[^0-9.]/g, '')
        .replace(/^0+([1-9])/, '$1');

    if (cleanInput[0] === '.') {
        cleanInput = cleanInput.substr(1);
    }

    return cleanInput;
};
