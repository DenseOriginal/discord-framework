import { APIMessageContentResolvable, Message, MessageAdditions, MessageOptions } from 'discord.js';
import { AuthFunction } from './authentication';

/**
 * @description
 * Default class for every command
 */
export interface CommandClass extends CanRun, Action {
  name: string;
  nameRegExp?: RegExp;
  description: string;
}

/**
 * @description
 * Method to check if user can run the command
 * should return a boolean value
 *
 * Authentication can also be applied in command decorator
 * If authentication is defined both on class and in decorator
 * The decorator authentcation will have superiority
 */
export interface CanRun {
  canRun: AuthFunction;
}

/**
 * @description
 *
 */
export interface Action {
  action: ActionFunction;
}

export type MessageResolvable = APIMessageContentResolvable | (MessageOptions & { split?: false }) | MessageAdditions;
export type ActionContext = {
  message: Message;
  args: { [arg: string]: any };
};
export type PromiseOrNot<T> = Promise<T> | T;
export type ActionFunction = (context: ActionContext) => PromiseOrNot<MessageResolvable | void>;
