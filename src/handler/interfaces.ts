import { AuthFunction } from "../utils/authentication";
import { MessageReader } from "../utils/reader";

export interface HandlerInterface {
    name: string;
    alias?: string[];
    canRun: AuthFunction;
    run(messageReader: MessageReader): void;
}