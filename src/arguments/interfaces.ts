import { Message } from 'discord.js';
import { FriendlyError } from '../errors/base';

export interface ArgumentOptions {
  key: string;
  description?: string;
  type?: string;
  optional?: boolean;
  rest?: boolean;
  parser?: Parser<any>;
  validators?: Validator[];
}

export interface ArgumentTypeInterface<T = any> {
  parse: Parser<T>;
}

type PromiseOrNot<T> = Promise<T> | T;

/**
 * @description
 * Type for a validator function
 */
export type Validator = (val: any, message: Message) => PromiseOrNot<FriendlyError | void>;

/**
 * @description
 * Type for parser function
 */
export type Parser<T = any> = (val: any, message: Message) => PromiseOrNot<FriendlyError | T>;
