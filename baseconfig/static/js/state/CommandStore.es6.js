import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

export class CommandInstance extends StoreObject {
    toString() {
        return this.name;
    }
}

const verboseStatus = ["Waiting", "Running", "Failed", "Successful"];

export class CommandRun extends StoreObject {
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

export let CommandInstanceStore = new GenericObjectStore("CommandInstance", CommandInstance);
export let CommandRunStore = new GenericObjectStore("CommandRun", CommandRun);
