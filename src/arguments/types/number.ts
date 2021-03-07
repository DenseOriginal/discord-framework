import { FriendlyError } from '../../errors';
import { BaseArgumentType } from './base';

export class NumberArgumentType extends BaseArgumentType<number> {
  constructor() {
    super('number');
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  parse(val: any): number | FriendlyError {
    const float = Number.parseFloat(val);
    if (Number.isNaN(float)) return new FriendlyError('Argument has to a number');
    return Number.parseFloat(val);
  }
}
