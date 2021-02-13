import { inject as tsyringeInject } from 'tsyringe';

/**
 * @description
 * Proxy for tsyringe injection
 * We need to do this because any project that uses this framework
 * Cannot access tsyringe decorators
 */
export const inject = tsyringeInject;
