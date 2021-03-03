import { Message } from "discord.js";
import { FriendlyError } from "src/errors/base";

type PromiseOrNot<T> = Promise<T> | T;

/**
 * @description
 * Type for authentication function
 * If the user fails it should return a friendlyError
 * That can be sent back to the user
 */
export type AuthFunction = (messageContext: Message) => PromiseOrNot<FriendlyError | void>;