import {UI, Select, Button, Table, ProgressBar, Modal, ActionModal, Form, FormField, TextInput} from "UI";
import {FAIcon} from "FontAwesome";
import {Ajax} from "Ajax";
import {StemDate} from "Time";
import {StateDependentElement} from "StateDependentElement";
import {CommandInstanceStore, CommandRunStore} from "CommandStore";
import {GlobalState} from "State";
import {UserHandle} from "UserHandle";
import {util} from "csa";

class CommandRunStatus extends UI.Element {
    render() {
        switch(this.options.commandRun.status) {
            case 0: {
                return "In queue..";
            }
            case 1: {
                return <ProgressBar ref="progressBar" style={{margin: "0 auto"}}/>;
            }
            case 2: {
                return <FAIcon icon="check" style={{color: "green"}}/>;
            }
            case 3: {
                return <FAIcon icon="times" style={{color: "red"}}/>;
            }
        }
    }

    onMount() {
        this.attachEventListener(this.options.commandRun, "logProgress", (event) => {
            if (this.progressBar) {
                this.progressBar.set(event.data.percent || 0);
            } else {
                this.redraw();
            }
        });
    }
}

const verboseCommandStatus = ["Waiting", "Running", "Successful", "Failed"];

class CommandRunDetailsModal extends Modal {
    getGivenChildren() {
        return [
            <h2>Command run #{this.options.commandRun.id}</h2>,
            <h4>Ran by <UserHandle userId={this.options.commandRun.userId} /></h4>,
            <h4>Command instance: {CommandInstanceStore.get(this.options.commandRun.commandInstanceId).name}</h4>,
            <h4 ref="statusField">Status: {verboseCommandStatus[this.options.commandRun.status]}</h4>,
            <h4>Logs</h4>,
            <UI.StaticCodeHighlighter ref="logger" numLines={40} readOnly={true} />
        ];
    }

    getFormattedMessage(logEntry) {
        let message = "";
        message += "[" + StemDate(logEntry.timestamp).format("DD/MM/YYYY HH:mm:SS") + "]";
        message += " ";
        message += logEntry.message;
        message += "\n";
        return message;
    }

    onMount() {
        super.onMount();
        if (this.options.commandRun.logEntries && this.options.commandRun.logEntries.entries) {
            for (let entry of this.options.commandRun.logEntries.entries) {
                this.logger.append(this.getFormattedMessage(entry));
            }
        }
        this.attachEventListener(this.options.commandRun, "logMessage", (event) => {
            this.logger.append(this.getFormattedMessage(event.data));
        });
        this.attachEventListener(this.options.commandRun, "updateOrCreate", () => {
            this.statusField.node.textContent = "Status: " + verboseCommandStatus[this.options.commandRun.status];
        });
    }
}

class CommandRunDetails extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle("cursor", "pointer");
        attr.setStyle("text-decoration", "underline");
    }

    render() {
        return "Details";
    }

    onMount() {
        this.commandRunDetailsModal = <CommandRunDetailsModal commandRun={this.options.commandRun} destroyOnHide={false}/>;
        this.commandRunDetailsModal.mount(document.body);
        this.addClickListener(() => {
            this.commandRunDetailsModal.show();
        });
    }
}

class CommandRunDuration extends UI.Primitive("span") {
    render() {
        if (this.options.commandRun.status == 0) {
            return "-";
        }
        let time;
        if (this.options.commandRun.status == 1) {
            time = StemDate.now() / 1000 - this.options.commandRun.dateCreated;
        } else {
            time = this.options.commandRun.dateFinished - this.options.commandRun.dateCreated
        }
        return util.Formatter.truncate(time, 2);
    }

    onMount() {
        this.intervalId = setInterval(() => {
            if (this.options.commandRun.status >= 2) {
                clearInterval(this.intervalId);
                delete this.intervalId;
            } else {
                this.redraw();
            }
        }, 80);
    }
}

class PastCommandsTable extends Table {
    getEntries() {
        return CommandRunStore.all().sort((a, b) => {
            return b.dateCreated - a.dateCreated;
        });
    }

    setColumns() {
        super.setColumns([
            {
                value: commandRun => CommandInstanceStore.get(commandRun.commandInstanceId).name,
                headerName: "Command",
            }, {
                value: commandRun => <UserHandle userId={commandRun.userId} />,
                headerName: "User"
            }, {
                value: commandRun => StemDate(commandRun.dateCreated).format("DD/MM/YYYY HH:mm"),
                headerName: "Date"
            }, {
                value: commandRun => <CommandRunDuration commandRun={commandRun} />,
                headerName: "Duration"
            }, {
                value: (commandRun) => {
                    return <CommandRunStatus commandRun={commandRun} />;
                },
                headerName: "Status",
                headerStyle: {
                    textAlign: "center"
                },
                cellStyle: {
                    textAlign: "center"
                }
            }, {
                value: commandRun => <CommandRunDetails commandRun={commandRun} />,
                headerName: "Details"
            }
        ])
    }
}

class CommandRunCreationModal extends ActionModal {
    getTitle() {
        return this.options.commandInstance.name;
    }

    getBody() {
        let body = [];
        if (this.options.commandInstance.promptForConfirmation) {
            body.push(<h4 style={{color: "red"}}>This command requires a confirmation. Are you sure you want to run this command?</h4>);
        }
        return body;
    }

    getActionName() {
        return [
            <FAIcon icon="cogs" style={{paddingRight: "7px"}}/>,
            "Run"
        ];
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    action() {
        let requestJson = {
            commandInstanceId: this.options.commandInstance.id
        };
        runCommand(requestJson, () => {
            CommandRunStore.dispatch("redrawTable");
        });
        this.hide();
    }
}

function runCommand(json, callback) {
    Ajax.postJSON("/baseconfig/run_command/", json).then((data) => {
        if (data.error) {
            console.error(data.error);
        } else {
            GlobalState.importState(data.state || {});
            callback();
        }
    }, (error) => {
        console.error(error);
    });
}

class CommandManager extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle("margin-left", "15%");
        attr.setStyle("margin-right", "15%");
    }

    render() {
        return [
            <h3>Command manager</h3>,
            <div>
                <h4>Run a command</h4>
                <Select options={CommandInstanceStore.all()} style={{marginLeft: "10px"}} ref="commandSelect"/>
                <Button level={UI.Level.PRIMARY} size={UI.Size.SMALL} ref="runCommandButton"
                        faIcon="cogs" style={{marginLeft: "10px"}}/>
            </div>,
            <div style={{marginTop: "20px"}}>
                <h4>Past commands</h4>
                <PastCommandsTable ref="pastCommandsTable" />
            </div>
        ];
    }

    onMount() {
        GlobalState.registerStream("GlobalCommandRuns");
        CommandRunStore.addCreateListener(() => {
            this.pastCommandsTable.redraw();
        });
        CommandRunStore.addListener("redrawTable", () => {
            this.pastCommandsTable.redraw();
        });
        this.runCommandButton.addClickListener(() => {
            let commandInstance = this.commandSelect.get();
            if (commandInstance.promptForConfirmation || commandInstance.arguments) {
                let commandRunCreationModal = <CommandRunCreationModal commandInstance={commandInstance} />;
                commandRunCreationModal.show();
            } else {
                runCommand({
                    commandInstanceId: commandInstance.id
                }, () => {
                    this.pastCommandsTable.redraw();
                });
            }
        });
    }
}

class DelayedCommandManager extends StateDependentElement(CommandManager) {
    getAjaxUrl() {
        return "/baseconfig/command/manager/";
    }
}

export {CommandManager, DelayedCommandManager};