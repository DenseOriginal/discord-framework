import { FriendlyError } from '../../errors';
import { BaseArgumentType } from './base';

export class IntegerArgumentType extends BaseArgumentType<number> {
  constructor() {
    super('integer');
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parse(val: any): FriendlyError | number {
    const int = Number.parseInt(val);
    if (Number.isNaN(int)) return new FriendlyError('Argument has to an integer');
    return int;
  }
}
