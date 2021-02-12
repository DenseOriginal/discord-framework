import { singleton } from "tsyringe";

/**
 * @description
 * Proxy for tsyringe singletond
 * This insures that a service class is only instantiated oncy
 */
export const Service = singleton;