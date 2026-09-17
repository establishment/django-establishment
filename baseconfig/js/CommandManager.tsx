import {UI, type ElementOptions, type ExtendedOptions, type UIElement, type NodeAttributes} from "../../../stemjs/ui/UIBase";
import {Select, TextInput, RawCheckboxInput, NumberInput} from "../../../stemjs/ui/input/Input";
import {Button} from "../../../stemjs/ui/button/Button";
import {Table} from "../../../stemjs/ui/table/Table";
import {ProgressBar} from "../../../stemjs/ui/ProgressBar";
import {Modal, ActionModal} from "../../../stemjs/ui/modal/Modal";
import {FormField} from "../../../stemjs/ui/form/Form";
import {StaticCodeHighlighter} from "../../../stemjs/ui/CodeEditor";

import {UserHandle} from "../../../csaaccounts/js/UserHandle";
import {Ajax} from "../../../stemjs/base/Ajax";
import {GlobalState, type StoreEvent} from "../../../stemjs/state/State";
import {StemDate} from "../../../stemjs/time/Date";


import {FAIcon} from "../../../stemjs/ui/FontAwesome";
import {Level, Size} from "../../../stemjs/ui/Constants";

import {CommandInstance, CommandRun, type CommandRunOption, type SelectArgumentChoice, type CommandLogEntry} from "./state/CommandStore";
import {Popup} from "../../content/js/Popup";

import {autoredraw} from "../../../stemjs/decorators/AutoRedraw";

// TODO: This is CSAcademy dependency. Fix this!!
import {Formatter} from "../../../csabase/js/util";


export interface CommandRunStatusOptions {
    commandRun?: CommandRun;
}

@autoredraw
class CommandRunStatus extends UI.Element {
    declare options: ElementOptions<CommandRunStatusOptions>;

    render() {
        switch (this.options.commandRun.status) {
            case 0: {
                return "In queue..";
            }
            case 1: {
                return <ProgressBar ref="progressBar" style={{margin: "0 auto"}}/>;
            }
            case 2: {
                return <FAIcon icon="times" style={{color: "red"}}/>;
            }
            case 3: {
                return <FAIcon icon="check" style={{color: "green"}}/>;
            }
        }
    }
}

export interface CommandRunDetailsModalOptions {
    commandRun?: CommandRun;
}

class CommandRunDetailsModal extends Modal {
    declare options: ExtendedOptions<Modal, CommandRunDetailsModalOptions>;
    declare logger: StaticCodeHighlighter;
    declare resultField: StaticCodeHighlighter;

    render() {
        let children = [
            <h2>Command run #{this.options.commandRun.id}</h2>,
            <h4>Ran by <UserHandle userId={this.options.commandRun.userId}/></h4>,
            <h4>Command instance: {CommandInstance.get(this.options.commandRun.commandInstanceId).name}</h4>,
            <h4 ref="statusField">Status: {this.options.commandRun.getVerboseStatus()}</h4>,
            <h4>Logs</h4>,
            <StaticCodeHighlighter ref="logger" numLines={40} readOnly={true}/>
        ];
        if (this.options.commandRun.status >= 2) {
            // The command is finished, show the result
            children.push(<h4>Result:</h4>);
            children.push(<StaticCodeHighlighter ref="resultField" numLines={15} readOnly={true}/>);
        }
        return children;
    }

    getFormattedMessage(logEntry: {timestamp: number, message: string}) {
        let message = "";
        message += "[" + StemDate.format(logEntry.timestamp, "DD/MM/YYYY HH:mm:SS") + "]";
        message += " ";
        message += logEntry.message;
        message += "\n";
        return message;
    }

    getFormattedResult(resultJson: unknown) {
        if (!resultJson) {
            return "Success!";
        }
        return JSON.stringify(resultJson);
    }

    onMount() {
        super.onMount();
        if (this.options.commandRun.logEntries && this.options.commandRun.logEntries.entries) {
            for (let entry of this.options.commandRun.logEntries.entries) {
                this.logger.append(this.getFormattedMessage(entry));
            }
        }
        this.attachEventListener(this.options.commandRun, "logMessage", (event: StoreEvent & {data?: CommandLogEntry}) => {
            this.logger.append(this.getFormattedMessage(event.data));
        });
        this.attachEventListener(this.options.commandRun, "createOrUpdate", () => {
            this.redraw();
            if (this.options.commandRun.status >= 2) {
                this.resultField.append(this.getFormattedResult(this.options.commandRun.result));
            }
        });
        if (this.options.commandRun.status >= 2) {
            this.resultField.append(this.getFormattedResult(this.options.commandRun.result));
        }
    }
}

export interface CommandRunDetailsOptions {
    commandRun?: CommandRun;
}

class CommandRunDetails extends UI.Element {
    declare options: ElementOptions<CommandRunDetailsOptions>;

    extraNodeAttributes(attr: NodeAttributes) {
        attr.setStyle("cursor", "pointer");
        attr.setStyle("text-decoration", "underline");
    }

    render() {
        return UI.T("Details");
    }

    onMount() {
        this.addClickListener(() => {
            CommandRunDetailsModal.show({commandRun: this.options.commandRun});
        });
    }
}

export interface CommandRunDurationOptions {
    commandRun?: CommandRun;
}

@autoredraw
class CommandRunDuration extends UI.Primitive("span") {
    declare options: ElementOptions<CommandRunDurationOptions>;
    declare intervalId: ReturnType<typeof setInterval>;

    render() {
        if (this.options.commandRun.status === 0) {
            return "-";
        }
        const {status, dateCreated, dateFinished} = this.options.commandRun;
        const endTime = status === 1 ? StemDate.now() : dateFinished;
        return Formatter.truncate((endTime - dateCreated) / 1000, 2);
    }

    onMount() {
        this.intervalId = setInterval(() => {
            if (this.options.commandRun.status >= 2) {
                clearInterval(this.intervalId);
                delete this.intervalId;
            } else {
                this.redraw();
            }
        }, 700);
    }
}

class PastCommandsTable extends Table<CommandRun> {
    getEntries() {
        return CommandRun.all().sort((a, b) => {
            return b.dateCreated - a.dateCreated;
        });
    }

    getDefaultColumns() {
        return [
            {
                value: (commandRun: CommandRun) => CommandInstance.get(commandRun.commandInstanceId).name,
                headerName: "Command",
            }, {
                value: (commandRun: CommandRun) => <UserHandle userId={commandRun.userId}/>,
                headerName: "User"
            }, {
                value: (commandRun: CommandRun) => commandRun.dateCreated.format("DD/MM/YYYY HH:mm"),
                headerName: "Date"
            }, {
                value: (commandRun: CommandRun) => <CommandRunDuration commandRun={commandRun}/>,
                headerName: "Duration"
            }, {
                value: (commandRun: CommandRun) => {
                    return <CommandRunStatus commandRun={commandRun}/>;
                },
                headerName: "Status",
                headerStyle: {
                    textAlign: "center"
                },
                cellStyle: {
                    textAlign: "center"
                }
            }, {
                value: (commandRun: CommandRun) => <CommandRunDetails commandRun={commandRun}/>,
                headerName: "Details"
            }
        ];
    }
}

export interface AutoFormFieldHelperOptions {
    description?: string;
}

class AutoFormFieldHelper extends UI.Element {
    declare options: ElementOptions<AutoFormFieldHelperOptions>;
    declare container: UIElement;
    declare popup: Popup;
    declare span: FAIcon;

    render() {
        return [
            <span ref="container" style={{position: "relative", overflow: "hidden", cursor: "pointer",}}>
                    <FAIcon icon="question-circle" ref="span"/>
                </span>
        ];
    }

    onMount() {
        this.span.addNodeListener("mouseover", () => {
            this.popup = Popup.create(this.container, Object.assign({
                target: this.span,
                title: this.options.title,
                children: this.options.description,
                transitionTime: 300,
                titleFontSize: "10pt",
                contentStyle: {
                    padding: "8px",
                    textAlign: "left"
                },
                style: {
                    minWidth: "300px",
                    maxWidth: "500px"
                }
            }));
        });

        this.span.addNodeListener("mouseout", () => {
            if (this.popup) {
                this.popup.hide();
            }
        })
    }
}

class AutoFormFieldSelectOption {
    declare key: string | number;
    declare label: string;

    constructor(options: SelectArgumentChoice) {
        Object.assign(this, options);
    }

    toString() {
        return this.label;
    }

    getValue() {
        return this.key;
    }
}

// The spread of one CommandRunOption, which is what AutoFormField renders
export interface AutoFormFieldOptions extends CommandRunOption {}

class AutoFormField extends UI.Element {
    declare options: ElementOptions<AutoFormFieldOptions>;
    // Exactly one of render's four branches makes it, so which one is what the argument's type says
    declare input: TextInput | NumberInput | RawCheckboxInput | Select<AutoFormFieldSelectOption>;

    fieldType = {
        "text": 1,
        "number": 2,
        "checkbox": 3,
        "select": 4
    };

    render() {
        let formField = null;
        // The argument's type says which of the three the default is, so each branch asserts its own
        const {defaultValue} = this.options;

        if (this.options.type === this.fieldType.text) {
            formField = <TextInput ref="input" initialValue={defaultValue as string}/>;
        }
        if (this.options.type === this.fieldType.number) {
            formField = <NumberInput ref="input" initialValue={defaultValue as number}/>;
        }
        if (this.options.type === this.fieldType.checkbox) {
            formField = <RawCheckboxInput ref="input" initialValue={defaultValue as boolean}/>;
        }
        if (this.options.type === this.fieldType.select) {
            let options: AutoFormFieldSelectOption[] = [];
            for (let option of this.options.choices) {
                options.push(new AutoFormFieldSelectOption(option));
            }
            formField = <Select ref="input" options={options}/>;
        }

        return <div style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
        }}>
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "12px",
            }}>
                {
                    this.options.description &&
                    <AutoFormFieldHelper description={this.options.description} title={this.options.shortName}/>
                }
            </div>
            <div style={{flex: "1"}}>
                <FormField label={this.options.longName}>
                    {formField}
                </FormField>
            </div>
        </div>
    }

    getValue() {
        if (this.input instanceof Select) {
            return this.input.get().getValue();
        } else {
            return this.input.getValue();
        }
    }
}


export interface CommandRunCreationModalOptions {
    commandInstance?: CommandInstance;
}

class CommandRunCreationModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, CommandRunCreationModalOptions>;
    // One field per run option, keyed by the argument it fills in
    fields: Record<string, AutoFormField> = {};

    getTitle() {
        return this.options.commandInstance.name;
    }

    getBody() {
        let body = [];
        if (this.options.commandInstance.requiresConfirmation()) {
            if (this.options.commandInstance.promptForConfirmation) {
                body.push(<h4 style={{color: "red"}}>This command requires a confirmation. Are you sure you want to run
                    this command?</h4>);
            }
            for (let entry of this.options.commandInstance.runOptions) {
                body.push(<AutoFormField ref={{parent: this.fields, name: entry.shortName}} {...entry}/>);
            }
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
        return Level.PRIMARY;
    }

    action() {
        let commandArguments: Record<string, unknown> = {};
        for (let entry of this.options.commandInstance.runOptions) {
            commandArguments[entry.shortName] = this.fields[entry.shortName].getValue();
        }
        let requestJson = {
            commandInstanceId: this.options.commandInstance.id,
            arguments: JSON.stringify(commandArguments)
        };


        runCommand(requestJson, () => {
            CommandRun.dispatch("redrawTable");
        });
        this.hide();
    }
}

function runCommand(json: object, callback: () => void) {
    Ajax.postJSON("/baseconfig/run_command/", json).then(callback);
}

class CommandManager extends UI.Element {
    declare commandSelect: Select<CommandInstance>;
    declare descriptionArea: UIElement;
    declare pastCommandsTable: PastCommandsTable;
    declare runCommandButton: Button;

    extraNodeAttributes(attr: NodeAttributes) {
        attr.setStyle("margin-left", "15%");
        attr.setStyle("margin-right", "15%");
    }

    render() {
        return [
            <h3>Command manager</h3>,
            <div>
                <h4>Run a command</h4>
                <Select options={CommandInstance.all()} style={{marginLeft: "10px"}} ref="commandSelect"/>
                <Button level={Level.PRIMARY} size={Size.SMALL} ref="runCommandButton"
                        icon="cogs" style={{marginLeft: "10px"}}/>
            </div>,
            <div ref="descriptionArea" style={{margin: "10px"}}>
            </div>,
            <div style={{marginTop: "20px"}}>
                <h4>Past commands</h4>
                <PastCommandsTable ref="pastCommandsTable"/>
            </div>
        ];
    }

    onMount() {
        GlobalState.registerStream("GlobalCommandRuns");

        let redrawPastCommandsTable = () => {
            this.pastCommandsTable.redraw();
        };

        this.attachCreateListener(CommandRun, redrawPastCommandsTable);
        this.attachListener(CommandRun, "redrawTable", redrawPastCommandsTable);

        this.descriptionArea.node.textContent = this.commandSelect.get().description;
        this.commandSelect.addChangeListener(() => {
            this.descriptionArea.node.textContent = this.commandSelect.get().description;
        });

        this.runCommandButton.addClickListener(() => {
            let commandInstance = this.commandSelect.get();
            if (commandInstance.requiresConfirmation()) {
                CommandRunCreationModal.show({commandInstance});
            } else {
                runCommand({
                    commandInstanceId: commandInstance.id
                }, redrawPastCommandsTable);
            }
        });
    }
}

export {CommandManager};