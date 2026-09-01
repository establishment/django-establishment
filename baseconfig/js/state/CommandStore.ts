import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {type StoreEvent} from "../../../../stemjs/state/State";

// One argument a command accepts, spread straight into an AutoFormField by CommandManager
export interface CommandRunOption {
    shortName: string;
}

// One line of a run's log, from CommandRunLogger.log_message in establishment/baseconfig/models.py
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
    declare dateCreated: number;

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
