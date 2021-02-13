import { HandlerClass } from '@src/handler';
import { Client, Message } from 'discord.js';
import { container } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';

export interface BootstrapOptions {
  token: string;
  prefix: string;
}

export function bootstrap(mainHandler: constructor<any>, options: BootstrapOptions, client = new Client()): Client {
  const handler: HandlerClass = container.resolve(mainHandler);
  client.on('message', (message: Message) => {
    if (!message.content.startsWith(options.prefix)) return;
    handler.run(message, message.content.slice(options.prefix.length));
  });

  client.login(options.token);

  return client;
}
