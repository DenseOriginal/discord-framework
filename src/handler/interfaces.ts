import { AuthFunction, CommandClass } from '@src/command';
import { Message } from 'discord.js';

/**
 * @description
 * Default class for all handlers
 */
export interface HandlerClass {
  name: string;
  alias?: string[];
  nameRegExp?: RegExp;
  commands: CommandClass[];
  run: RunFunction;
  canRun: AuthFunction;
}

export type RunFunction = (message: Message, input: string) => void;
