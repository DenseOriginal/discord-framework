import { TypeRegistry } from '../../registers';
import { BooleanArgumentType } from './boolean';
import { StringArgumentType } from './string';
import { IntegerArgumentType } from './integer';
import { FloatArgumentType } from './float';
import { MemberArgumentType } from './member';

export * from './base';
export * from './boolean';
export * from './string';
export * from './integer';
export * from './float';

// Register default types
TypeRegistry.register('string', new StringArgumentType());
TypeRegistry.register('boolean', new BooleanArgumentType());
TypeRegistry.register('integer', new IntegerArgumentType());
TypeRegistry.register('float', new FloatArgumentType());
TypeRegistry.register('member', new MemberArgumentType());
