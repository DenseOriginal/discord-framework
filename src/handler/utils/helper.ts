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