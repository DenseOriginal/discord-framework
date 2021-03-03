import { container } from 'tsyringe';

export function initCommand(command: new (...args: any[]) => any): any {
  return container.resolve(command);
}

export function initHandler(handler: new (...args: any[]) => any): any {
  return container.resolve(handler);
}
