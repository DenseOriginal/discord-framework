import { HandlerClass } from '../handler';
import { ListenerClass } from '../listener';
import { Client, Message } from 'discord.js';
import { container } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';

export interface BootstrapOptions {
  token: string;
  prefix: string;
  listners?: constructor<any>[];
}

export function bootstrap(mainHandler: constructor<any>, options: BootstrapOptions, client = new Client()): Client {
  Reflect.defineMetadata('discord:client', client, global);

  const handler: HandlerClass = container.resolve(mainHandler);
  client.on('message', (message: Message) => {
    if (!message.content.startsWith(options.prefix)) return;
    handler.run(message, message.content.slice(options.prefix.length));
  });

  options?.listners?.forEach((constructor: constructor<ListenerClass>) => {
    const listener = container.resolve(constructor);
    client.on(listener.event, listener.listener);
  });

  client.login(options.token);

  return client;
}
