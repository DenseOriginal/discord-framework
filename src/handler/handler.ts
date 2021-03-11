import { FriendlyError } from '../errors/base';
import { createErrorEmbed } from '../errors/embeds';
import { MessageReader } from '../utils/reader';
import { injectable } from 'tsyringe';
import { initCommand, initHandler } from '../utils/helpers';
import { CommandInterface } from '../command/interfaces';
import { HandlerInterface } from './interfaces';
import { Message } from 'discord.js';
import { AuthFunction } from 'src/utils/authentication';
import { InternalLogger } from '../utils/logger';

export interface HandlerOptions {
  /**
   * @description
   * The name of the handler
   * Used for finding the handler
   */
  name: string;

  /**
   * @description
   * Any aliasses for the handler
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
   * The sub command that this handler handles
   */
  commands?: (new (...args: any[]) => any)[];

  /**
   * @description
   * Any subhandlers for the handler
   */
  handlers?: (new (...args: any[]) => any)[];

  /**
   * @description
   * Authentication functions to determine wether any user has permission
   * To run this handler
   * If this check fails the user is denied permission to any subcommands
   */
  canRun?: AuthFunction[];

  /**
   * @description
   * If this is true the handler will not send any response back to the user if the handler
   * can't find any sub commands or sub handlers
   */
  silentOnUnknownCommand?: boolean;
}

export function Handler(opt: HandlerOptions) {
  return function <T extends new (...args: any[]) => any>(target: T): T {
    if (!opt.description) InternalLogger.warn(`${target.name} Should have a description`);

    class newTarget extends target implements HandlerInterface {
      commands: CommandInterface[] = opt.commands?.map(initCommand) || [];
      handlers: HandlerInterface[] = opt.handlers?.map(initHandler) || [];
      name = opt.name;
      alias = opt.alias;

      async run(messageReader: MessageReader) {
        const { message } = messageReader;
        const commandName = messageReader.getNext() || '';
        const commandOrHandler = this.findCommand(commandName) || this.findHandler(commandName);

        if (!commandOrHandler) {
          // Couldn't find any command or handler
          if (!opt.silentOnUnknownCommand) {
            const errorEmbed = createErrorEmbed(new FriendlyError(`Cannot find command "${commandName}"`));
            if (!errorEmbed) return;
            message.channel.send(errorEmbed);
          }
          return;
        }

        // Check if user has permission to run the command or handler
        // If return is a friendlyError with a message, reply to user with an error
        // And then return
        const canRun = await commandOrHandler.canRun(message);
        if ((canRun as FriendlyError)?.name == 'FriendlyError' && (canRun as FriendlyError)?.message) {
          const canRunReturnErrorEmbed = createErrorEmbed(canRun as FriendlyError, message.cleanContent);
          if (canRunReturnErrorEmbed) message.channel.send(canRunReturnErrorEmbed);
          return;
        }

        // Run the command or handler
        try {
          //// Warning! very stroke inducing code ahead :)
          // If its a command call execute
          if ((<any>commandOrHandler).execute) {
            (<CommandInterface>commandOrHandler).execute(messageReader);
          }
          // Else if its a handler call run
          else if ((<any>commandOrHandler).run) {
            (<HandlerInterface>commandOrHandler).run(messageReader);
          }
        } catch (_err) {
          InternalLogger.error(_err);

          // If the thrown error is a friendlyError send it back to the user
          // If not say we don't know what
          const error =
            (_err as FriendlyError)?.name == 'FriendlyError' ? _err : new FriendlyError("We don't know what");
          const errorEmbed = createErrorEmbed(error);
          if (!errorEmbed) return;
          message.channel.send(errorEmbed);
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

      private findCommand(name: string): CommandInterface | undefined {
        return this.commands.find((command) => command.name == name || command.alias?.includes(name));
      }

      private findHandler(name: string): HandlerInterface | undefined {
        return this.handlers.find((handler) => handler.name == name || handler.alias?.includes(name));
      }
    }

    // Activate dependency injection
    const injectableDecorator = injectable();
    injectableDecorator(newTarget);

    return newTarget;
  };
}
