import { GuildMember, Message } from "discord.js";
import { FriendlyError } from "../../errors";
import { BaseArgumentType } from "./base";

export class MemberArgumentType extends BaseArgumentType<GuildMember> {
    constructor() { super('member'); }

    async validate(val: string, msg: Message): Promise<FriendlyError | void> {
        const matches = val.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (matches) {
            try {
                const member = await msg.guild?.members.fetch(await msg.client.users.fetch(matches[1]));
                if (!member) return new FriendlyError('Cannot find that user');
                return;
            } catch (err) {
                return new FriendlyError('Cannot find that user');
            }
        }
        const search = val.toLowerCase();
        let members = msg.guild?.members.cache.filter(memberFilterInexact(search));
        if (!members) return new FriendlyError('Cannot find that user');
        if (members.size === 0) return new FriendlyError('Cannot find that user');
        if (members.size === 1) {
            return;
        }
        const exactMembers = members.filter(memberFilterExact(search));
        if (exactMembers.size === 1) {
            return;
        }
        if (exactMembers.size > 0) members = exactMembers;
        return new FriendlyError(members.size <= 15 ?
            `${disambiguation(
                members.map(mem => `${mem.user.username}#${mem.user.discriminator}`), 'members', null
            )}\n` :
            'Multiple members found. Please be more specific.');
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async parse(val: string, msg: Message): Promise<GuildMember | FriendlyError> {
        const validate = await this.validate(val, msg);
        if(validate) return validate;

        const matches = val.match(/^(?:<@!?)?([0-9]+)>?$/);
        if (matches) return msg?.guild?.member(matches[1]) || new FriendlyError('Cannot find that user');
        const search = val.toLowerCase();
        const members = msg?.guild?.members.cache.filter(memberFilterInexact(search));
        if (!members) return new FriendlyError('Cannot find that user');
        if (members.size === 0) return new FriendlyError('Cannot find that user');
        if (members.size === 1) return members.first() || new FriendlyError('Cannot find that user');
        const exactMembers = members.filter(memberFilterExact(search));
        if (exactMembers.size === 1) return exactMembers.first() || new FriendlyError('Cannot find that user');
        return new FriendlyError('Cannot find that user');
    }
}

function memberFilterExact(search: string) {
    return (mem: GuildMember) => mem.user.username.toLowerCase() === search ||
        (mem.nickname && mem.nickname.toLowerCase() === search) ||
        `${mem.user.username.toLowerCase()}#${mem.user.discriminator}` === search;
}

function memberFilterInexact(search: string) {
    return (mem: GuildMember) => mem.user.username.toLowerCase().includes(search) ||
        (mem.nickname && mem.nickname.toLowerCase().includes(search)) ||
        `${mem.user.username.toLowerCase()}#${mem.user.discriminator}`.includes(search);
}

function disambiguation(items: any[], label: string, property: any = 'name') {
	const itemList = items.map(item => `"${(property ? item[property] : item).replace(/ /g, '\xa0')}"`).join(',   ');
	return `Multiple ${label} found, please be more specific: ${itemList}`;
}