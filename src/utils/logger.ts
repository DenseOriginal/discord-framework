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

const labelsToColor = {
    crit: Styles.Red,
    error: Styles.BrightRed,
    warn: Styles.BrightYellow,
    info: Styles.BrightGreen,
    debug: Styles.Magenta,
    verbose: Styles.Cyan,
}

export type Labels = "crit" | "error" | "warn" | "info" | "debug" | "verbose";
export const LabelsArray: Labels[] = ["crit", "error", "warn", "info", "debug", "verbose"];
interface Log {
    label: Labels,
    message: Error | string;
}

class Logger {
    private queue: Log[] = [];
    private disabled = new Map<Labels, boolean>();
    isPaused = false;

    pause() { this.isPaused = true; }
    resume() {
        this.isPaused = false;
        // On resume empty the queue
        while (this.queue.length > 0) this.log(this.queue.shift());
    }

    disable(...labels: Labels[]) { labels.forEach(label => this.disabled.set(label, true)); }
    disableAll() { LabelsArray.forEach(l => this.disable(l)); }
    enable(...labels: Labels[]) { labels.forEach(label => this.disabled.set(label, false)); }

    log(log: Log | undefined) {
        if (!log) return;
        const { label, message } = log;
        if (this.disabled.get(label)) return;
        if (this.isPaused) { this.queue.push(log); return; }
        const timestamp = new Date().toLocaleString().substr(9).replace(/\./g, ':');

        const messageToLog = '[' +
            (<any>labelsToColor)[label] + // Format level with color
            Styles.Bold + // Make level bold
            label.toUpperCase() + // Make level uppercase
            Styles.Reset + // Rest the style so we can display the rest normal
            '] ' + Styles.BrightBlack + timestamp +
            Styles.Reset + ' ' + (message instanceof Error ? message.stack || message.message : message);

        console.log(messageToLog);
        if (label == 'crit') process.exit(1);
    }

    private logTemplate = (label: Labels) => (message: string | Error) => this.log({ label, message });

    crit = this.logTemplate("crit");
    error = this.logTemplate("error");
    warn = this.logTemplate("warn");
    info = this.logTemplate("info");
    debug = this.logTemplate("debug");
    verbose = this.logTemplate("verbose");
}

export const InternalLogger = new Logger();

// Start in paused mode
// We can resume normal function in bootstrap if user wants it
InternalLogger.pause();

// Disable debug and verbose by default
InternalLogger.disable('debug', 'verbose');