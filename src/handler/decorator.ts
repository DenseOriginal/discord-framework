import { ActionContext, AuthFunction, AuthReturn, CommandClass } from '../command';
import { Status } from '../core/interfaces';
import { Message, MessageEmbed } from 'discord.js';
import { container, injectable } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';
import { HandlerClass } from './interfaces';

export interface HandlerOptions {
  name: string;
  alias?: string[];
  nameRegExp?: RegExp;
  commands?: constructor<any>[];
  handlers?: constructor<any>[];
  canRun?: AuthFunction | AuthFunction[];
  silentOnNoCommand?: boolean;
}

export function Handler(options: HandlerOptions) {
  return function <T extends constructor<any>>(target: T): T {
    class newTarget extends target implements HandlerClass {
      name = camelCase(options.name);
      alias = options.alias?.map(camelCase);
      nameRegExp = options.nameRegExp;
      commands: CommandClass[] = options.commands?.map(instantiateCommand) || [];
      handlers: HandlerClass[] = options.handlers?.map(instantiateHandler) || [];

      async run(message: Message, input: string) {
        // If handler was called as a subCommand
        // It will be passed a input string
        // Which is message.content minus the previous handlers names
        let inputCommand = input;

        // If inputCommand doesn't start with name
        // Then stop execution
        // if (!inputCommand.startsWith(this.name)) return;

        // Remove name and extract commandName
        inputCommand = inputCommand.replace(this.name, '');
        const [commandName, ...rest] = inputCommand.split(' ');

        // Find command- or handler instance that match the name
        // Command takes superiority over handler
        // And name propery take superiority over alias
        const command =
          this.commands.find((command) => nameMatches(command.nameRegExp || command.name, commandName)) ||
          this.commands.find((command) => command.alias?.includes(commandName)) ||
          this.handlers.find((handler) => nameMatches(handler.nameRegExp || handler.name, commandName)) ||
          this.handlers.find((handler) => handler.alias?.includes(commandName));
        
        // Log an error to the user on discord that it couldn't find any command
        if (!command) {
          // Quit without any output to the discord user
          // If options.silentOnNoCommand is true
          if(options.silentOnNoCommand) return;
          message.channel.send(createErrorEmbed(message, { status: 'error', message: 'I cannot find that command' }));
          return;
        }

        // Check if command can be run
        const canRunReturn = await command.canRun(message);
        if (canRunReturn.status == 'error' && !canRunReturn.message) return;
        if (canRunReturn.status == 'error') {
          message.channel.send(createErrorEmbed(message, canRunReturn));
          return;
        }

        const context: ActionContext = {
          message,
          args: { rawArg: rest.join(' ') },
        };

        try {
          if (isHandler(command)) {
            command.run(message, rest.join(' '));
          } else {
            command.action(context);
          }
        } catch (error) {
          message.channel.send('Whoops, something bad happened');
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
    }

    // Activate dependency injection
    const injectableDecorator = injectable();
    injectableDecorator(newTarget);
    return newTarget;
  };
}

function nameMatches(name: string | RegExp, testString: string): boolean {
  if (name instanceof RegExp) {
    name.lastIndex = 0;
    return name.test(testString);
  }
  return name == testString;
}

function instantiateCommand(constructor: constructor<CommandClass>): CommandClass {
  return container.resolve(constructor);
}

function instantiateHandler(constructor: constructor<HandlerClass>): HandlerClass {
  return container.resolve(constructor);
}

function isHandler(val: any): val is HandlerClass {
  return val.run;
}

// function isCommand(val: any): val is CommandClass {
//     return val.action;
// }

function createErrorEmbed(message: Message, error: Status.Error): MessageEmbed {
  return new MessageEmbed()
    .setColor('#ff4d4d')
    .addField('Whoops something happened', '```' + message.content + '``` \n' + error.message);
}

function camelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}
