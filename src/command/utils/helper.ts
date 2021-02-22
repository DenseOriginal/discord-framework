/**
 * @description
 * Takes any input array or not
 * and return an array if the input
 * If the input is already an array it return the input
 * 
 * @param input Any or an array of any
 */
export function anyToArray<T>(input: T | T[]): T[] {
    if (Array.isArray(input)) return input;
    return [input];
}

/**
 * @description
 * Convert input string to an array split by spaces
 * Keeps substrings inside quotes
 * 
 * @param str the string to split
 */
export function splitMessageContent(str: string): string[] {
    //The parenthesis in the regex creates a captured group within the quotes
    const testRegex = /[^\s"]+|"([^"]*)"/gi;
    const matches = [];
    let match: RegExpExecArray | null;

    do {
        //Each call to exec returns the next regex match as an array
        match = testRegex.exec(str);
        if (match != null) {
            //Index 1 in the array is the captured group if it exists
            //Index 0 is the matched text, which we use if no captured group exists
            matches.push(match[1] ? match[1] : match[0]);
        }
    } while (match != null);

    return matches;
}

/**
 * @description
 * camelCases the input string
 * 
 * @param str String to camelCase
 */
export function camelCase(str: string): string {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

/**
 * @description
 * Check wether the input is a function or not
 * 
 * @param func Any input to check
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isFunction(func: any): boolean {
    return !!(func && func.constructor && func.call && func.apply);
}