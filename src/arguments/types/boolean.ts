import { FriendlyError } from "../../errors";
import { BaseArgumentType } from "./base";

export class BooleanArgumentType extends BaseArgumentType<boolean> {
    truthy: Set<string> = new Set(['true', 'yes', 'y']);
    falsy: Set<string> = new Set(['false', 'no', 'n']);

    constructor() { super('float'); }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    parse(val: any): boolean | FriendlyError {
        const lc = val.toString().toLowerCase();
        if(!this.truthy.has(lc) && !this.falsy.has(lc))
            return new FriendlyError('Argument has to one of these: ' + [...this.truthy, ...this.falsy].join(', '));
        return this.truthy.has(lc);
    }
}