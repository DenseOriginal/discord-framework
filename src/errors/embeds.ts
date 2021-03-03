import { MessageEmbed } from "discord.js";
import { FriendlyError } from "./base";

export function createErrorEmbed(error: FriendlyError, textInCodeBlock?: string): MessageEmbed | undefined {
    if(!error.message) return;
    return new MessageEmbed()
        .addField(
            'Whoops something happened',
            textInCodeBlock ? wrapInCodeBlock(textInCodeBlock) + '\n' + error.message :
            error.message
        )
        .setColor('#ff4242');
}

function wrapInCodeBlock(str: string): string {
    if(str.startsWith('```') && str.endsWith('```')) return str;
    return '```' + str + '```';
}