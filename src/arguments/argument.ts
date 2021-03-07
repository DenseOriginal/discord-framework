/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Message } from 'discord.js';
import { TypeRegistry } from '../registers';
import { FriendlyError } from '../errors/base';
import { ArgumentOptions, Parser, Validator } from './interfaces';
import { BaseArgumentType } from './types/base';
import { InternalLogger } from '../utils/logger';

export class Argument {
  key: string;
  description: string;
  type?: BaseArgumentType;
  optional: boolean;
  rest: boolean;
  validators: Validator[];
  private parser?: Parser;

  constructor(opt: ArgumentOptions) {
    this.key = opt.key;
    this.description = opt.description || '';
    this.optional = !!opt.optional;
    this.rest = !!opt.rest;
    this.validators = opt.validators || [];
    this.parser = opt.parser;
    if (opt.type) {
      const foundType = (this.type = TypeRegistry.find(opt.type));
      if (!foundType) throw new TypeError(`Cannot find type ${opt.type}`);
      this.type = foundType;
    }

    Argument.validateOptions(opt);
  }

  async execute(val: any, message: Message): Promise<FriendlyError | any> {
    // Parse the incoming value
    // If it's a friendlyError return it
    const parsed = await this.parse(val, message);
    if (parsed instanceof FriendlyError) return parsed;

    // Validate the parsed value
    // If it's a friendlyError return it
    const validated = await this.validate(parsed, message);
    if (validated instanceof FriendlyError) return validated;

    // If we don't have any errors
    // Return the parsed and validated value
    return parsed;
  }

  async validate(val: any, message: Message): Promise<FriendlyError | void> {
    try {
      const validatorsAsPromise = this.validators.map((f) => f(val, message));
      const validatorReturns = await Promise.all(validatorsAsPromise);
      const friendlyErrors: FriendlyError[] = validatorReturns.filter(
        (v) => v instanceof FriendlyError,
      ) as FriendlyError[];
      if (friendlyErrors.length == 0) return;
  
      // If there was any failed validate functions
      // Map them to one string, and return that as a friendlyError
      return new FriendlyError(friendlyErrors.map((e) => e.message).join('\n'));
    } catch (error) {
      InternalLogger.error(error);
      return error instanceof FriendlyError ? error : new FriendlyError('Something happened trying to validate this message');
    }
  }

  async parse(val: any, message: Message): Promise<FriendlyError | any> {
    try {
      return this.type?.parse(val, message) || this.parser?.(val, message) || Promise.resolve(val);
    } catch (error) {
      InternalLogger.error(error);
      return error instanceof FriendlyError ? error : new FriendlyError('Something happened trying to read this message');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEmpty(val: any, message: Message): Promise<boolean> {
    return !isNaN(val) || !val;
  }

  static validateOptions(opt: ArgumentOptions): void {
    if (!opt.parser && !opt.type) throw new Error('Argument needs to have either a parser function or a type');
  }
}
