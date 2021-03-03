import { Collection } from "discord.js";

export class BaseRegistry<T> {
    collection = new Collection<string, T>();

    register(id: string, instance: T): void {
        if(this.collection.has(id)) throw new Error(`"${id}" is already defined in ${(<any>this).constructor.name || 'registry'}`);
        this.collection.set(id, instance);
    }

    find(id: string): T | undefined {
        return this.collection.get(id);
    }
}