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
  joinRest: boolean;
  validators: Validator[];
  private parser?: Parser;

  constructor(opt: ArgumentOptions, parentName: string) {
    this.key = opt.key;
    this.description = opt.description || '';
    this.optional = !!opt.optional;
    this.rest = !!opt.rest;
    this.joinRest = !!opt.joinRest;
    this.validators = opt.validators || [];
    this.parser = opt.parser;
    if (opt.type) {
      setTimeout(() => {
        const foundType = TypeRegistry.find(<string>opt.type);
        if (!foundType) {
          InternalLogger.crit(`Cannot find argument type "${opt.type}" for argument "${opt.key}" on ${parentName}`);
        }
        this.type = foundType;
      });
    }

    Argument.validateOptions(opt, parentName);
  }

  async execute(val: any, message: Message): Promise<FriendlyError | any> {
    // Make the input an array wether or not it is an array
    // This makes it easier to parse rest and non-rest arguments
    // As the system for parsing it will be the same
    // Then we can split it up in the end
    const inputs = Array.isArray(val) ? val : [val];
    const outputs: any[] = [];

    for (const input of inputs) {
      // Parse the incoming value
      // If it's a friendlyError return it
      const parsed = await this.parse(input, message);
      if ((parsed as FriendlyError)?.name == 'FriendlyError') return parsed;

      // Validate the parsed value
      // If it's a friendlyError return it
      const validated = await this.validate(parsed, message);
      if ((validated as FriendlyError)?.name == 'FriendlyError') return validated;

      // Push the parsed value to the output array
      // So that is can be returned later
      outputs.push(parsed);
    }

    // If we don't have any errors
    // Return the parsed and validated value(s)
    // Is this is a rest argument return the parsed values as an array
    // If not return the first value of the outputs array
    // We can assume that is this isn't a rest argument that output array only has one value
    return this.rest ? outputs : outputs[0];
  }

  async validate(val: any, message: Message): Promise<FriendlyError | void> {
    try {
      const validatorsAsPromise = this.validators.map((f) => f(val, message));
      const validatorReturns = await Promise.all(validatorsAsPromise);
      const friendlyErrors: FriendlyError[] = validatorReturns.filter(
        (v) => (v as FriendlyError)?.name == 'FriendlyError',
      ) as FriendlyError[];
      if (friendlyErrors.length == 0) return;

      // If there was any failed validate functions
      // Map them to one string, and return that as a friendlyError
      return new FriendlyError(friendlyErrors.map((e) => e.message).join('\n'));
    } catch (error) {
      InternalLogger.error(error);
      return (error as FriendlyError)?.name == 'FriendlyError'
        ? error
        : new FriendlyError('Something happened trying to validate this message');
    }
  }

  async parse(val: any, message: Message): Promise<FriendlyError | any> {
    try {
      return this.type?.parse(val, message) || this.parser?.(val, message) || Promise.resolve(val);
    } catch (error) {
      InternalLogger.error(error);
      return (error as FriendlyError)?.name == 'FriendlyError'
        ? error
        : new FriendlyError('Something happened trying to read this message');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isEmpty(val: any, message: Message): Promise<boolean> {
    if (Array.isArray(val) && val.length == 0) return true;
    if (!isNaN(val)) return false;
    return !val;
  }

  static validateOptions(opt: ArgumentOptions, parentName: string): void {
    if (!opt.parser && !opt.type)
      InternalLogger.crit(`Argument "${opt.key}" on ${parentName} needs to have either a parser function or a type`);
    if (opt.joinRest && opt.rest)
      InternalLogger.crit(`Argument "${opt.key}" on ${parentName} cannot have both 'rest' and 'joinRest' set to true`);
  }
}
