import { createLogger, format } from "winston";
import { Console } from "winston/lib/winston/transports";

const Styles = {
    Black: "\u001b[30m",
    Red: "\u001b[38;5;1m",
    Green: "\u001b[32m",
    Yellow: "\u001b[33m",
    Blue: "\u001b[34m",
    Magenta: "\u001b[35m",
    Cyan: "\u001b[36m",
    White: "\u001b[37m",
    BrightBlack: "\u001b[30;1m",
    BrightRed: "\u001b[31;1m",
    BrightGreen: "\u001b[32;1m",
    BrightYellow: "\u001b[33;1m",
    BrightBlue: "\u001b[34;1m",
    BrightMagenta: "\u001b[35;1m",
    BrightCyan: "\u001b[36;1m",
    BrightWhite: "\u001b[37;1m",
    Reset: "\u001b[0m",
    Bold: "\u001b[1m",
    Underline: "\u001b[4m",
    Reversed: "\u001b[7m",
};

const levelsToColor = {
    crit: Styles.Red,
    error: Styles.BrightRed,
    warn: Styles.BrightYellow,
    info: Styles.BrightGreen,
    debug: Styles.Magenta,
    verbose: Styles.Cyan,
}

const levels = {
    crit: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5
}

// https://github.com/winstonjs/winston/issues/1338#issuecomment-393238865
const enumerateErrorFormat = format(info => {
    if (isError(info.message)) {
        info.message = Object.assign({
            message: info.message.message,
            stack: info.message.stack
        }, info.message);
    }

    if (isError(info)) {
        return Object.assign({
            message: info.message,
            stack: info.stack
        }, info);
    }

    return info;
});

const formatter = format.combine(
    enumerateErrorFormat(),
    format.timestamp(),
    format.printf((template) => {
        const { level, message, timestamp, stack: errorStack } = template;
        
        return '[' +
            (<any>levelsToColor)[level] + // Format level with color
            Styles.Bold + // Make level bold
            level.toUpperCase() + // Make level uppercase
            Styles.Reset + // Rest the style so we can display the rest normal
            '] ' + Styles.BrightBlack + formatDate(timestamp) +
            Styles.Reset + ' ' + (errorStack || message);
    })
)


function isError(val: any): val is Error {
    return val instanceof Error;
}

function formatDate(date: string): string {
    return new Date(date).toLocaleString().substr(9).replace(/\./g, ':');
}

export const InternalLogger = createLogger({
    levels: levels,
    format: formatter,
    handleExceptions: false,
    transports: [
        new Console({ level: 'verbose', handleExceptions: false })
    ]
});

// Start in paused mode
// We can resume normal function in bootstrap if user wants it
InternalLogger.pause();