import { Status } from '../core/interfaces';
import { GuildMember, Message, MessageEmbed, Role } from 'discord.js';
import { PromiseOrNot } from './interfaces';

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
  val: any;
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
