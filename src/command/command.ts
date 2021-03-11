import { MessageReader } from '../utils/reader';
import { injectable } from 'tsyringe';
import { FriendlyError } from '../errors/base';
import { AuthFunction } from '../utils/authentication';
import { Message } from 'discord.js';
import { ActionContext, ActionFunction, CommandInterface } from './interfaces';
import { ArgumentOptions } from '../arguments/interfaces';
import { validateArguments } from '../arguments/utils/helpers';
import { Argument } from '../arguments/argument';
import { InternalLogger } from '../utils/logger';

export interface CommandOptions {
  /**
   * @description
   * The name of the command
   * Used for finding this command
   */
  name: string;

  /**
   * @description
   * Any aliasses for this command
   * The name property takes superiority over any alias
   */
  alias?: string[];

  /**
   * @description
   * Description of this command
   * Used for for help command
   */
  description?: string;

  /**
   * @description
   * Any arguments that should be parsed from the original message content
   */
  arguments?: ArgumentOptions[];

  /**
   * @description
   * Authentication functions for this command
   * If this check fails the user will be denied acces to this command
   * And an error message will be sent back to the user
   */
  canRun?: AuthFunction[];
}

export function Command(opt: CommandOptions) {
  return function <T extends new (...args: any[]) => any>(target: T): T {
    if (typeof target.prototype.action != 'function') throw new Error(`${target.name} does not have an action method`);
    const targetAction: ActionFunction = target.prototype.action;

    validateArguments(opt.arguments, target.name);
    const argumentsAsClass = opt.arguments?.map((arg) => new Argument(arg, target.name));
    if (!opt.description) InternalLogger.warn(`${target.name} Should have a description`);

    class newTarget extends target implements CommandInterface {
      name = opt.name;
      alias = opt.alias;
      description = opt.description || '';
      arguments = argumentsAsClass || [];

      async execute(messageReader: MessageReader) {
        const message = messageReader.message;

        // Parse and validate the arguments
        const parsedArguments: any = await this.parseAndValidateArguments(messageReader);
        if ((parsedArguments as Error).name == 'FriendlyError') return;

        // Create the action context
        const context: ActionContext = {
          message,
          args: parsedArguments,
        };

        // Call the commands action function with the context
        // Save the return so we can return it to the user
        try {
          const actionReturn = await targetAction.apply(this, [context]);

          // If we got any return from the action function
          // Send it back to the user
          if (actionReturn) {
            message.channel.send(actionReturn);
          }
        } catch (error) {
          InternalLogger.error(`Uncaught error thrown inside ${target.name}.action`);
          InternalLogger.error(error);
        }
      }

      async canRun(messageToCheckAgainst: Message): Promise<FriendlyError | void> {
        // Return nothing if no auth functions are provided
        if (!opt.canRun) return;

        try {
          const canRunFunctionsAsPromise = opt.canRun.map((f) => f(messageToCheckAgainst));
          const canRunResults = await Promise.all(canRunFunctionsAsPromise);

          // Remove all results that aren't an error
          const filteredResults: FriendlyError[] = canRunResults.filter(
            (result) => (result as FriendlyError)?.name == 'FriendlyError',
          ) as FriendlyError[];
          if (filteredResults.length == 0) return;

          // If there was any failed canRun functions
          // Map them to one string, and return that as a friendlyError
          return new FriendlyError(filteredResults.map((e) => e.message).join('\n'));
        } catch (error) {
          InternalLogger.error(`Uncaught error inside canRun function on ${target.name}!`);
          InternalLogger.error(error);

          // If any canRun function fails
          // and its a friendlyError return it
          // So it can be sent back to the user
          if ((error as FriendlyError)?.name == 'FriendlyError') return error;

          // If the error isn't a friendlyError return an empty one
          // This makes sure that the handler fails the command
          // And nothing more happens
          return new FriendlyError('');
        }
      }

      private async parseAndValidateArguments(reader: MessageReader): Promise<FriendlyError | any> {
        const message = reader.message;
        const parsedArguments: any = {};
        let errorHappened: FriendlyError | undefined;

        for await (const argument of this.arguments) {
          const { key, rest, joinRest } = argument;

          // If this is a joinRest argument
          // Tell the reader to join the rest of the argument
          if (joinRest) reader.joinRest();

          // Get the arguments that needs to be parsed
          // Is this a rest argument get the rest of the argument
          // Otherwise just get the nest
          const inputArg = rest ? reader.rest() : reader.getNext();

          // If its a rest argument we have to increment the internal index of the reader
          // Otherwise argument errors show the wrong argument
          if (rest) reader.getNext();

          // If its a rest argument and its a joinRest argument
          // Join the inputArg array
          // if(rest && joinRest) inputArg = (inputArg as string[])?.join(' ');
          if (await argument.isEmpty(inputArg, message)) {
            if (argument.optional) break;
            errorHappened = new FriendlyError(`Missing input ${argument.key}`);
            const errorEmbed = reader.createArgumentErrorEmbed(reader.index - 1, errorHappened);
            if (errorEmbed) message.channel.send(errorEmbed);
            break;
          }

          // Parse and validate the argument
          const parsedArgument = await argument.execute(inputArg, message);

          if ((parsedArgument as FriendlyError)?.name == 'FriendlyError') {
            // If the parsedArgument is a friendlyError
            // break out of the loop
            errorHappened = parsedArgument;
            const errorEmbed = reader.createArgumentErrorEmbed(reader.index - 1, errorHappened as FriendlyError);
            if (errorEmbed) message.channel.send(errorEmbed);
            break;
          }

          // Set the key in parsedArguments to the parsed argument
          parsedArguments[key] = parsedArgument;
        }

        // If errorHappened is true return that
        // Otherwise return the parsedArguments
        return errorHappened || parsedArguments;
      }
    }

    // Activate dependency injection
    const injectableDecorator = injectable();
    injectableDecorator(newTarget);

    return newTarget;
  };
}
