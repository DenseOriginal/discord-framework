/**
 * @description
 * Has a message that can be considered user friendly
 */
export class FriendlyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FriendlyError';
    }
}