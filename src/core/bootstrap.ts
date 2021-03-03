import { Client, Message } from 'discord.js';
import { HandlerInterface } from '../handler/interfaces';
import { initHandler } from '../utils/helpers';
import { MessageReader } from '../utils/reader';

export interface BootstrapOptions {
  /**
   * @description
   * The token that the bot should use to authenticate with
   */
  token: string;

  /**
   * @description
   * The prefix the bot listens for
   */
  prefix: string;

  /**
   * @description
   * Should the bot react to being pinged
   * If this is active pinging the bot acts as a valid prefix
   * And bypasses the set prefix
   *
   * @default false
   */
  usePingAsPrefix?: boolean;
}

type constructor<T = any> = new (...args: any[]) => T;

export function bootstrap(mainHandler: constructor, options: BootstrapOptions, client = new Client()): Client {
  let prefix = options.prefix;
  let cleanPrefix: string;
  const main: HandlerInterface = initHandler(mainHandler);

  // Define the client on global
  // So that you can use the client in a class
  Reflect.defineMetadata('discord:client', client, global);

  client.on('message', (message) => {
    if (!shouldHandleMessage(message)) return;
    if (!message.content.startsWith(prefix)) {
      // If message doesn't start with prefix
      // AND usePingAsPrefix is true try again with the bot tag as prefix
      // Otherwise just exit
      if (options.usePingAsPrefix) {
        prefix = '<@!' + client.user?.id + '>';

        // If message doesn't start with bot tag either, then return
        if (!message.content.startsWith(prefix)) return;

        // If the message starts with the tag
        // Set the cleanPrefix to the name of the bot
        // So that error logging will result in the name of the bot
        // Instead of the id
        // @bot name instead if <@!7239468230843745>
        cleanPrefix = `@${message.guild?.me?.nickname || client.user?.username} `;
      } else {
        return;
      }
    }

    // Create a messageReader for the message
    // And run it
    const reader = new MessageReader(message, prefix, cleanPrefix);
    main.run(reader);
  });

  client.login(options.token);
  return client;
}

function shouldHandleMessage(message: Message): boolean {
  if (message.partial) return false;
  if (message.author.bot) return false;
  return true;
}
