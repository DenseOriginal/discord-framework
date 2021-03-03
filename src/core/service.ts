import { singleton } from 'tsyringe';

/**
 * @description
 * Proxy for tsyringe singleton
 * This insures that a service class is only instantiated oncy
 */
export const Service = singleton;
