import { BaseArgumentType } from "./base";

export class StringArgumentType extends BaseArgumentType<string> {
    constructor() { super('string'); }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parse(val: any): string {
        return val;
    }
}