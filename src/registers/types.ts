import { BaseArgumentType } from 'src/arguments';
import { BaseRegistry } from './base';

class TypeRegistry extends BaseRegistry<BaseArgumentType> {}
const TypeRegistry_ = new TypeRegistry();

export { TypeRegistry_ as TypeRegistry };
