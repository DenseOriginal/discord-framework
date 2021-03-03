import { ArgumentOptions } from "../interfaces";

/**
 * @description
 * Function to validate that the arguments are in valid order
 * Automaticly throw an error to alert the developer
 * 
 * @param args The arguments to check
 * @param className The name of the class the arguments belong to
 */
export function validateArguments(args: ArgumentOptions[] | undefined, className: string): void {
    if (!args) return;

    let optionalFound = false;
    let restFound = false;
    const checkedKeys: string[] = [];

    for (const arg of args) {
        const { optional: isOptinal, rest: isRest, key } = arg;

        // Check for duplicate key
        if (checkedKeys.includes(key)) throw new Error(`Duplicate key "${key}" found on command ${className}`);
        checkedKeys.push(key);

        // Check optional and rest arguments are placed correctly
        if (!isOptinal && optionalFound) throw new Error(`Optional arguments can only be last: ${className}`);
        if (isRest && restFound) throw new Error(`There can only be one rest argument: ${className}`);
        if (restFound) throw new Error(`Rest argument can only be last: ${className}`);

        if (isOptinal) optionalFound = true;
        if (isRest) restFound = true;
    }
}