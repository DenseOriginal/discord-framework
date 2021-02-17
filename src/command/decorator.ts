import { Message, MessageEmbed } from 'discord.js';
import { injectable } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';
import {
  Argument,
  ArgumentValidator,
  createArgumentErrorEmbed,
  isParsingError,
  parseAny,
  ValidatorContext,
} from './arguments';
import { AuthFunction, AuthReturn } from './authentication';
import { ActionContext, ActionFunction, CommandClass } from './interfaces';

export interface CommandOptions {
  name: string;
  alias?: string[];
  nameRegExp?: RegExp;
  description?: string;
  arguments?: Argument[];
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
        const authFunctions: AuthFunction[] = [];
        if (Array.isArray(options.canRun)) {
          authFunctions.push(...options.canRun);
        } else {
          authFunctions.push(options.canRun);
        }

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

function camelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

function isFunction(func: any): boolean {
  return !!(func && func.constructor && func.call && func.apply);
}

function splitMessageContent(str: string) {
  //The parenthesis in the regex creates a captured group within the quotes
  const testRegex = /[^\s"]+|"([^"]*)"/gi;
  const matches = [];
  let match: RegExpExecArray | null;

  do {
    //Each call to exec returns the next regex match as an array
    match = testRegex.exec(str);
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      matches.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);

  return matches;
}

function validateArguments(args: Argument | Argument[] | undefined, className: string) {
  if (!args || !Array.isArray(args)) return true;

  let optionalFound = false;
  let restFound = false;
  const checkedKeys: string[] = [];

  for (const arg of args) {
    const { optional: isOptinal, rest: isRest, key } = arg;

    // Check for duplicate key
    if (checkedKeys.includes(key)) throw new Error(`Duplicate key "${key}" found on command ${className}`);
    checkedKeys.push(key);

    // Check optional and rest arguments are placed correctly
    if (!isOptinal && optionalFound) throw new Error(`Optional arguments can only be last: ${className}`);
    if (isRest && restFound) throw new Error(`There can only be one rest argument: ${className}`);
    if (restFound) throw new Error(`Rest argument can only be last: ${className}`);

    if (isOptinal) optionalFound = true;
    if (isRest) restFound = true;
  }
}

async function parseAndValidateArgument(argument: Argument, input: string, message: Message) {
  const { type, validator, optional } = argument;
  let errorHappened = false;

  // Parse Argument
  const inputArgument = input;
  const parsedArgument = await parseAny(type, inputArgument, message);

  if (isParsingError(parsedArgument)) {
    if (optional) return;
    errorHappened = true;
    message.channel.send(createArgumentErrorEmbed(message, inputArgument, parsedArgument));
  }

  // Validate argument if theres any validators
  // And the wasn't any errors with parsend
  if (validator && !errorHappened) {
    const validators: ArgumentValidator[] = [];
    if (Array.isArray(validator)) {
      validators.push(...validator);
    } else {
      validators.push(validator);
    }

    for await (const validator of validators) {
      const validatorContext: ValidatorContext = {
        argument: parsedArgument,
        message,
      };

      const validatorReturn = await validator(validatorContext);
      if (validatorReturn.status == 'error') {
        errorHappened = true;
        message.channel.send(createArgumentErrorEmbed(message, inputArgument, { error: validatorReturn.message }));
        break;
      }
    }
  }

  if (errorHappened) return { status: 'error', msg: '' };
  return parsedArgument;
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
