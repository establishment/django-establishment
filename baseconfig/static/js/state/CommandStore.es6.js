import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

export class CommandInstance extends StoreObject {
    toString() {
        return this.name;
    }
}

export class CommandRun extends StoreObject {
    update(event) {
        if (event.type === "logMessage") {
            this.logs = this.logs || [];
            this.logs.push(event.data);
        } else {
            super.update(event);
        }
    }
}

export let CommandInstanceStore = new GenericObjectStore("CommandInstance", CommandInstance);
export let CommandRunStore = new GenericObjectStore("CommandRun", CommandRun);
