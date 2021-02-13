import { ClientEvents } from "discord.js";
import { injectable } from "tsyringe";
import { constructor } from "tsyringe/dist/typings/types";
import { ListenerClass } from "./interfaces";

export function Listener(event: keyof ClientEvents) {
  return function <T extends constructor<any>>(target: T): T {
    // Target should have a action method
    if (!isFunction(target.prototype.listener)) throw new Error(`${target.name} does not have a listener method`);

    class newTarget extends target implements ListenerClass {
      event = event;
      listener = target.prototype.listener.bind(this);
    }

    // Activate dependency injection
    const injectableDecorator = injectable();
    injectableDecorator(newTarget);
    return newTarget;
  };
}

function isFunction(func: any): boolean {
  return !!(func && func.constructor && func.call && func.apply);
}