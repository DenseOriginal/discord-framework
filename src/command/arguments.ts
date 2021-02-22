import { Status } from '../core/interfaces';
import { GuildMember, Message, MessageEmbed, Role } from 'discord.js';
import { PromiseOrNot } from './interfaces';
import { anyToArray } from './utils/helper';

export type ArgumentTypes = 'string' | 'number' | 'member' | 'role';
export interface Argument {
  key: string;
  type: ArgumentTypes;
  description?: string;
  optional?: boolean;
  rest?: boolean;
  validator?: ArgumentValidator | ArgumentValidator[];
}

export interface ParsingError {
  error: string;
}

export const ArgumentParsers = {
  string: stringParser,
  number: numberParser,
  member: memberParser,
  role: roleParser,
};

export interface ValidatorContext {
  argument: any;
  message: Message;
}
export type ArgumentValidatorReturn = Status.Error | Status.Succes;
export type ArgumentValidator = (context: ValidatorContext) => PromiseOrNot<ArgumentValidatorReturn>;

export function parseAny(type: ArgumentTypes, val: string, message: Message): any {
  switch (type) {
    case 'string':
      return stringParser(val);
    case 'number':
      return numberParser(val);
    case 'member':
      return memberParser(val, message);
    case 'role':
      return roleParser(val, message);

    default:
      throw new Error('Trying to parse wrong type');
  }
}

export function stringParser(val: string): string | ParsingError {
  if (!val) return { error: 'Argument of type string is missing' };

  return val;
}

export function numberParser(val: string): number | ParsingError {
  if (!val) return { error: 'Argument of type number is missing' };

  const parsedNumber = Number(val);
  if (isNaN(parsedNumber)) return { error: 'Argument is not a number' };
  return parsedNumber;
}

export async function memberParser(val: string, message: Message): Promise<GuildMember | ParsingError> {
  if (!val) return { error: 'Argument of type member is missing' };

  const syntaxRegExp = /(<@!?\d+>)/g;
  if (!syntaxRegExp.test(val)) return { error: 'Argument is not a mention' };
  const memberId = (val.match(/\d/g) || []).join('');
  if (!message.guild) return { error: 'Message not sent in guild' };

  try {
    const member = await message.guild.members.fetch(memberId);
    if (!member) return { error: 'Cannot find member' };
    return member;
  } catch (error) {
    return { error: 'Cannot find member' };
  }
}

export async function roleParser(val: string, message: Message): Promise<Role | ParsingError> {
  if (!val) return { error: 'Argument of type role is missing' };

  const syntaxRegExp = /(<@&\d+>)/g;
  if (!syntaxRegExp.test(val)) return { error: 'Argument is not a role' };
  const roleId = (val.match(/\d/g) || []).join('');
  if (!message.guild) return { error: 'Message not sent in guild' };

  try {
    const role = await message.guild.roles.fetch(roleId);
    if (!role) return { error: 'Cannot find role' };
    return role;
  } catch (error) {
    return { error: 'Cannot find role' };
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isParsingError(val: any): val is ParsingError {
  return typeof val?.error == 'string';
}

export function createArgumentErrorEmbed(message: Message, invalidArg: string, error: ParsingError): MessageEmbed {
  const { content } = message;
  const offset = content.indexOf(invalidArg) < 0 ? content.length + 1 : content.indexOf(invalidArg);
  const arrowLength = invalidArg?.length || 5;
  const correctionArrows = `${' '.repeat(offset)}${'^'.repeat(arrowLength)}`;

  return new MessageEmbed()
    .setColor('#ff4d4d')
    .addField('Whoops something happened', '```' + `${content}\n${correctionArrows}` + '``` \n' + error.error);
}

/**
 * @description
 * Function to validate that the arguments are in valid order
 * Automaticly throw an error to alert the developer
 * 
 * @param args The arguments to check
 * @param className The name of the class the arguments belong to
 */
export function validateArguments(args: Argument | Argument[] | undefined, className: string): void {
  if (!args || !Array.isArray(args)) return;

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

/**
 * @description
 * Parses and validatet an input against an argument
 * Returns the parsed argument
 * 
 * @param argument Argument to check
 * @param input Input to check the argument against
 * @param message The origin message
 */
export async function parseAndValidateArgument(argument: Argument, input: string, message: Message): Promise<any> {
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
    const validators: ArgumentValidator[] = anyToArray(validator);

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