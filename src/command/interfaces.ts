import { APIMessageContentResolvable, Message, MessageAdditions, MessageOptions } from "discord.js";
import { Argument } from "src/arguments/argument";
import { AuthFunction } from "../utils/authentication";
import { MessageReader } from "../utils/reader";

export interface CommandInterface {
    name: string;
    alias?: string[];
    description?: string;
    arguments: Argument[];
    canRun: AuthFunction;
    execute(messageReader: MessageReader): void;
}

type PromiseOrNot<T> = Promise<T> | T;

export interface Action {
    action: ActionFunction;
}

export type MessageContentResolvable = APIMessageContentResolvable | (MessageOptions & { split?: false }) | MessageAdditions;
export type ActionContext = {
    message: Message;
    args: { [arg: string]: any };
};
export type ActionFunction = (context: ActionContext) => PromiseOrNot<MessageContentResolvable | void>;