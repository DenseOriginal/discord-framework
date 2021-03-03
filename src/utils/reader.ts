import { Message, MessageEmbed } from "discord.js";
import { FriendlyError } from "../errors/base";
import { createErrorEmbed } from "../errors/embeds";

export class MessageReader {
    body: string;
    cleanBody: string;
    args: string[];
    cleanArgs: string[];
    private _index = 0;
    get index(): number { return this._index; }

    constructor(
        public message: Message,
        public prefix: string,

        // Clean prefix used for error loggin
        // used in the case where a ping is used as prefix
        // It will print @bot name instead if <@!7239468230843745>
        public cleanPrefix = prefix
    ) {
        this.body = message.content
            .replace(prefix, '')
            .trim();

        this.cleanBody = message.cleanContent
            .replace(prefix, '')
            .trim();

        this.args = getArguments(this.body);
        this.cleanArgs = getArguments(this.cleanBody);
    }

    getNext(): string | undefined {
        return this.args[this._index++] || undefined;
    }

    get(idx: number): string | undefined {
        return this.args[idx] || undefined;
    }

    rest(): string[] {
        return this.args.slice(this._index);
    }

    createArgumentErrorEmbed(idx: number, error: FriendlyError): MessageEmbed | undefined {
        const truncatedArgs = this.args.map(truncate(25));
        const arrowOffset = truncatedArgs.slice(0, idx).join(' ').length + (this.cleanPrefix || this.prefix).length + 1;
        const arrowLength = (truncatedArgs[idx] || Array(5)).length;

        return createErrorEmbed(error,
            `${this.cleanPrefix || this.prefix}${truncatedArgs.join(' ')}` + '\n' +
            `${' '.repeat(arrowOffset)}${'^'.repeat(arrowLength)}`
        );
    }
}

function truncate(len: number) {
    return (val: string) => val.slice(0, len);
}

function getArguments(body: string): string[] {
    const args: string[] = [];
    let str = body.trim();

    while (str.length) {
        let arg: string;
        if (str.startsWith('"') && str.indexOf('"', 1) > 0) {
            arg = str.slice(1, str.indexOf('"', 1));
            str = str.slice(str.indexOf('"', 1) + 1);
        } else if (str.startsWith("'") && str.indexOf("'", 1) > 0) {
            arg = str.slice(1, str.indexOf("'", 1));
            str = str.slice(str.indexOf("'", 1) + 1);
        } else if (str.startsWith("```") && str.indexOf("```", 3) > 0) {
            arg = str.slice(3, str.indexOf("```", 3));
            str = str.slice(str.indexOf("```", 3) + 3);
        } else {
            arg = str.split(/\s+/g)[0].trim();
            str = str.slice(arg.length);
        }
        args.push(arg.trim());
        str = str.trim();
    }

    return args;
}