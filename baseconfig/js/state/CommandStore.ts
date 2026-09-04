import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {type StoreEvent} from "../../../../stemjs/state/State";

export interface SelectArgumentChoice {
    key: string | number;
    label: string;
}

// One argument a command accepts, spread straight into an AutoFormField by CommandManager.
export interface CommandRunOption {
    shortName: string;
    longName: string;
    // BaseCommandArgument.INVALID 0, STRING 1, INT 2, BOOL 3, SELECT 4
    type: number;
    description: string;
    // String, Int and Bool arguments only
    defaultValue?: string | number | boolean;
    // Select arguments only
    choices?: SelectArgumentChoice[];
}

export interface CommandLogEntry {
    level: string;
    timestamp: number;
    message: string;
}

// The log_entries column, which CommandRun.log and set_progress build together
export interface CommandLog {
    entries: CommandLogEntry[];
    progress: Record<string, any>;
}

@globalStore
export class CommandInstance extends BaseStore("CommandInstance") {
    declare name: string;
    declare description: string;
    declare promptForConfirmation: boolean;
    declare runOptions: CommandRunOption[];

    toString() {
        return this.name;
    }

    requiresConfirmation() {
        return this.promptForConfirmation || (this.runOptions.length !== 0);
    }
}

const verboseStatus = ["Waiting", "Running", "Failed", "Successful"];


@globalStore
export class CommandRun extends BaseStore("CommandRun") {
    declare userId: number;
    declare commandInstanceId: number;
    declare dateCreated: number;
    declare dateFinished?: number;
    declare arguments?: Record<string, any>;
    // Whatever the command's run returned, or the traceback lines on failure; only ever stringified
    declare result?: unknown;

    declare logEntries?: CommandLog;
    // CommandRun.COMMAND_RUN_STATUS: 0 waiting, 1 running, 2 failed, 3 successful
    declare status: number;

    applyEvent(event: StoreEvent) {
        if (event.type === "logMessage") {
            this.logEntries = this.logEntries || {
                entries: [],
                progress: {}
            };
            this.logEntries.entries.push(event.data);
        } else {
            super.applyEvent(event);
        }
    }

    getVerboseStatus() {
        return verboseStatus[this.status];
    }
}
