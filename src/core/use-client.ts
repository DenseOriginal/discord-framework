/**
 * @description
 * Property decorator for acces to the discord client
 * Use this to have direct acces to client
 */
export function UseClient() {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function (target: Object, propertyKey: string | symbol): void {
        Object.defineProperty(target, propertyKey, {
            // value: Reflect.getMetadata("discord:client", global),
            // writable: false,
            get: () => Reflect.getMetadata('discord:client', global),
            enumerable: true,
            configurable: false,
        });
    };
}
