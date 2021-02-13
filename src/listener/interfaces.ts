import { ClientEvents } from 'discord.js';

/**
 * @description
 * Default class for a listener
 */
export interface ListenerClass {
  event: keyof ClientEvents;
  listener: any;
}

export interface ListenerAction<K extends keyof ClientEvents> {
  listener(...args: ClientEvents[K]): void;
}
