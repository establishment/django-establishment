import {globalStore, BaseStore} from "../../../../stemjs/state/Store";

@globalStore
export class CommandInstance extends BaseStore("CommandInstance") {
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
    update(event) {
        if (event.type === "logMessage") {
            this.logEntries = this.logEntries || {
                entries: [],
                progress: {}
            };
            this.logEntries.entries.push(event.data);
        } else {
            super.update(event);
        }
    }

    getVerboseStatus() {
        return verboseStatus[this.status];
    }
}
