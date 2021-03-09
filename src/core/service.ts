import { injectable, singleton } from 'tsyringe';

/**
 * @description
 * Decorator for any service
 * Allows the service to use dependency injection
 * And makes the service a singleton
 */
export function Service() {
    return function <T extends new (...args: any[]) => any>(target: T): T {
        // Make the service a singleton
        const singletonDecorator = singleton();
        singletonDecorator(target);

        // Activate dependency injection
        const injectableDecorator = injectable();
        injectableDecorator(target);

        return target;
    }
}