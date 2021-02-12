import { Status } from "@src/core/interfaces";
import { Message, PermissionResolvable } from "discord.js";
import { PromiseOrNot } from "./interfaces";

export type AuthReturn = Status.Error | Status.Succes;

/**
 * @description
 * A return type of string should be treated as an error
 */
export type AuthFunction = (messageContext: Message) => PromiseOrNot<AuthReturn>;

/**
 * @description
 * Check wether or not message author has permissions
 * Always return true for messages not sent in a guild
 * 
 * @param errorMsg Message to say if this check fails
 */
export function hasPermissionTo(permissions: PermissionResolvable, errorMsg = '', checkAdmin?: boolean): AuthFunction {
    return (messageContext: Message) => {
        // If message wasn't sent in guild, return true
        if(!messageContext.guild) return { status: 'succes' };

        // Cast type to boolean, because member is possible undefined
        const hasPermissions = !!messageContext.member?.permissions.has(permissions, checkAdmin);
        return hasPermissions ? { status: 'succes' } : { status: 'error', message: errorMsg };
    };
}

/**
 * @description
 * Checks if author has specific roles
 * Always return true messages not sent in a guild
 * 
 * @param roles
 * Names of roles to check for, as an array
 * 
 * @param errorMsg Message to say if this check fails
 */
export function hasRoles(roles: string[], errorMsg = ''): AuthFunction {
    return (messageContext: Message) => {
        // If message wasn't sent in guild, return true
        if(!messageContext.guild) return { status: 'succes' };
        const hasRoles = roles.every(role => !!messageContext.member?.roles.cache.find(r => r.name == role));
        return hasRoles ? { status: 'succes' } : { status: 'error', message: errorMsg };
    }
}

/**
 * @description
 * Check if message was sent in a guild
 * 
 * @param errorMsg Message to say if this check fails
 */
export function isSentInGuild(errorMsg = ''): AuthFunction {
    return (messageContext: Message) => {
        return messageContext.guild ? { status: 'succes' } : { status: 'error', message: errorMsg };
    }
}

/**
 * @description
 * Check if message was sent in DM channel
 * 
 * @param errorMsg Message to say if this check fails
 */
export function isSentInDM(errorMsg = ''): AuthFunction {
    return (messageContext: Message) => {
        return messageContext.channel.type == 'dm' ? { status: 'succes' } : { status: 'error', message: errorMsg };
    }
}

/**
 * @description
 * Check if author of a message is in any voiceChannel
 * 
 * @param errorMsg Message to say if this check fails
 */
export function isUserInVoiceChannel(errorMsg = ''): AuthFunction {
    return (messageContext: Message) => {
        return messageContext.member?.voice.channel ? { status: 'succes' } : { status: 'error', message: errorMsg };
    }
}

/**
 * @description
 * Check if author of a message is in a specific voiceChannel
 * 
 * @param errorMsg Message to say if this check fails
 * @param channelID ID for the voiceChannel to check for
 */
export function isUserInSpecificVoiceChannel(channelID: string, errorMsg = ''): AuthFunction {
    return (messageContext: Message) => {
        return messageContext.member?.voice.channelID == channelID ? { status: 'succes' } : { status: 'error', message: errorMsg };
    }
}