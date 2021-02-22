import { Message, MessageEmbed } from 'discord.js';
import { injectable } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';
import {
  Argument,
  parseAndValidateArgument,
  validateArguments,
} from './arguments';
import { AuthFunction, AuthReturn } from './authentication';
import { ActionContext, ActionFunction, CommandClass } from './interfaces';
import { anyToArray, camelCase, isFunction, splitMessageContent } from './utils/helper';

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
   * Regular Expression for matching the name
   * If this is defined it takes supetiority over the name property
   */
  nameRegExp?: RegExp;

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
  arguments?: Argument[];

  /**
   * @description
   * Authentication functions for this command
   * If this check fails the user will be denied acces to this command
   * And an error message will be sent back to the user
   */
  canRun?: AuthFunction | AuthFunction[];
}

export function Command(options: CommandOptions) {
  return function <T extends constructor<any>>(target: T): T {
    // Target should have a action method
    if (!isFunction(target.prototype.action)) throw new Error(`${target.name} does not have an action method`);

    // Validate arguments
    // Function throws error if anything is wrong
    validateArguments(options.arguments, target.name);

    class newTarget extends target implements CommandClass {
      name = camelCase(options.name);
      alias = options.alias?.map(camelCase);
      nameRegExp = options.nameRegExp;
      description = options.description ?? '';

      async action(context: ActionContext) {
        const message = context?.message;
        const actionFunction: ActionFunction = target.prototype.action;

        // Parse input arguments
        const rawArguments = splitMessageContent(context?.args?.rawArg);
        const parsedArguments: any = {};
        let errorHappened = false;

        // Parse and validate all arguments
        for await (const [idx, argument] of (options.arguments || []).entries()) {
          if (argument.rest) {
            const inputArguments = rawArguments.slice(idx);
            // If no rest arguments are sent, push undefined to error out
            if (inputArguments.length == 0) inputArguments.push(undefined as any);
            parsedArguments[camelCase(argument.key)] = [];

            for (const inputArgument of inputArguments) {
              const parsedArgument = await parseAndValidateArgument(argument, inputArgument, message);
              errorHappened = parsedArgument?.status == 'error';
              if (errorHappened) break;

              parsedArguments[camelCase(argument.key)].push(parsedArgument);
            }

            continue;
          }

          const inputArgument = rawArguments[idx];
          const parsedArgument = await parseAndValidateArgument(argument, inputArgument, message);
          errorHappened = parsedArgument?.status == 'error';
          if (errorHappened) return;

          parsedArguments[camelCase(argument.key)] = parsedArgument;
        }

        if (errorHappened) return;

        try {
          const actionContext: ActionContext = {
            message,
            args: parsedArguments,
          };

          const actionReturn = await actionFunction.apply(this, [actionContext]);
          if (actionReturn) message.channel.send(actionReturn);
        } catch (error) {
          console.log(error);
          message.channel.send('Whoops, somthing bad happened');
        }
      }

      async canRun(messageContext: Message): Promise<AuthReturn> {
        if (!options.canRun) return { status: 'succes' };
        const authFunctions: AuthFunction[] = anyToArray(options.canRun);

        const errors: string[] = [];

        for await (const func of authFunctions) {
          const funcReturn = await func(messageContext);
          if (funcReturn.status == 'error') {
            errors.push(funcReturn.message);
          }
        }

        if (errors.length > 0) return { status: 'error', message: errors.join('\n') };
        return { status: 'succes' };
      }

      generateHelpEmbed(): MessageEmbed {
        const helpEmbed = new MessageEmbed().setTitle(options.name).setDescription(options.description);

        if (options.arguments) helpEmbed.addField('Syntax', generateSyntax(options.arguments));

        return helpEmbed;
      }
    }

    // Activate dependency injection
    const injectableDecorator = injectable();
    injectableDecorator(newTarget);
    return newTarget;
  };
}

function generateSyntax(args: Argument[]): string {
  return args
    .map((arg) => {
      const { optional, key, rest } = arg;
      const [start, end] = optional ? ['[', ']'] : ['<', '>'];

      return `${start}${rest ? '...' : ''}${key}${end}`;
    })
    .join(' ');
}
