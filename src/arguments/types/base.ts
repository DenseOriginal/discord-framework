/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Message } from "discord.js";
import { FriendlyError } from "../../errors";

type PromiseOrNot<T> = Promise<T> | T;

export abstract class BaseArgumentType<T = unknown> {
	constructor(public id: string) {
		if(id !== id.toLowerCase()) throw new Error('Argument type ID must be lowercase.');
	}

	abstract parse(val: any, message: Message): PromiseOrNot<FriendlyError | T>

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEmpty(val: any, message: Message): boolean {
		if(Array.isArray(val)) return val.length === 0;
		return !val;
	}
}