import {UI, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {Level} from "../../../stemjs/ui/Constants";
import {SortableTable} from "../../../stemjs/ui/table/SortableTable";
import {Button} from "../../../stemjs/ui/button/Button";
import {ActionModal} from "../../../stemjs/ui/modal/Modal";
import {FormField} from "../../../stemjs/ui/form/Form";
import {TextInput} from "../../../stemjs/ui/input/Input";
import {NumberInput} from "../../../stemjs/ui/input/Input";
import {RawCheckboxInput} from "../../../stemjs/ui/input/Input";
import {PasswordInput} from "../../../stemjs/ui/input/Input";
import {TableRow} from "../../../stemjs/ui/table/Table";
import {Ajax} from "../../../stemjs/base/Ajax";
import {EmailGateway} from "./state/EmailGatewayStore";
import {autoredraw} from "../../../stemjs/decorators/AutoRedraw";

export interface EmailGatewayModalOptions {
    gateway?: EmailGateway;
}

abstract class EmailGatewayModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, EmailGatewayModalOptions>;
    abstract getAjaxAction(): string;

    declare fields: string[];
    declare hostInput: TextInput;
    declare nameInput: TextInput;
    declare passwordInput: PasswordInput;
    declare portInput: NumberInput;
    declare useTLSInput: RawCheckboxInput;
    declare usernameInput: TextInput;

    constructor(options: EmailGatewayModal["options"]) {
        super(options);
        this.fields = ["name", "host", "port", "useTLS", "username"];
    }

    getBody() {
        const gatewayValues: Partial<EmailGateway> = this.options.gateway || {};
        return [
            <FormField label="Name" ref="nameField">
                <TextInput value={gatewayValues.name || ""} ref="nameInput"/>
            </FormField>,
            <FormField label="Host" ref="hostField">
                <TextInput value={gatewayValues.host || ""} ref="hostInput"/>
            </FormField>,
            <FormField label="Port" ref="portField">
                <NumberInput value={gatewayValues.port || ""} ref="portInput"/>
            </FormField>,
            <FormField label="Use TLS" ref="useTLSField" >
                <RawCheckboxInput value={gatewayValues.useTLS || ""} ref="useTLSInput"/>
            </FormField>,
            <FormField label="Username" ref="usernameField">
                <TextInput value={gatewayValues.username || ""} ref="usernameInput"/>
            </FormField>,
            <FormField label="Password" ref="passwordField">
                <PasswordInput value="" ref="passwordInput"/>
            </FormField>
        ];
    }

    action() {
        const request = {
            action: this.getAjaxAction(),
            objectType: "gateway",
            name: this.nameInput.getValue(),
            host: this.hostInput.getValue(),
            port: this.portInput.getValue(),
            useTLS: this.useTLSInput.getValue(),
            username: this.usernameInput.getValue(),
            password: this.passwordInput.getValue(),
            id: this.options.gateway ? this.options.gateway.id : null,
        };

        Ajax.postJSON("/email/control/", request).then(
            () => this.hide(),
            (error) => {
                if (error.fieldName) {
                    error.message += " (" + error.fieldName + ")";
                }
                this.messageArea.showMessage(error.message, "red");
            }
        );
    }
}


class AddEmailGatewayModal extends EmailGatewayModal {
    getTitle() {
        return "New Email gateway";
    }

    getActionName() {
        return "Add Email gateway";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }

    getAjaxAction() {
        return "new";
    }
}


class EditEmailGatewayModal extends EmailGatewayModal {
    getTitle() {
        return "Edit Email gateway";
    }

    getActionName() {
        return "Save Email gateway";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }

    getAjaxAction() {
        return "update";
    }
}


export interface GenericConfirmModalOptions {
    gateway?: EmailGateway;
}

abstract class GenericConfirmModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, GenericConfirmModalOptions>;
    abstract getActionText(): string;
    abstract getAjaxAction(): string;


    constructor(options: GenericConfirmModal["options"]) {
        super(options);
    }

    getBody() {
        return [
            <div>{this.getActionText()}</div>
        ];
    }

    action() {
        const request = {
            action: this.getAjaxAction(),
            objectType: "gateway",
            id: this.options.gateway ? this.options.gateway.id : null,
        };

        Ajax.postJSON("/email/control/", request).then(
            () => this.hide(),
            (error) => {
                if (error.fieldName) {
                    error.message += " (" + error.fieldName + ")";
                }
                this.messageArea.showMessage(error.message, "red");
            }
        );
    }

    getActionName() {
        return "Confirm!";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }
}


class DeleteGatewayConfirmModal extends GenericConfirmModal {
    getActionText() {
        return "Are you sure you want to delete this entry?";
    }

    getAjaxAction() {
        return "delete";
    }
}


class EmailGatewayTableRow extends TableRow {
    declare deleteGatewayButton: Button;
    declare editGatewayButton: Button;
    onMount() {
        super.onMount();
        this.deleteGatewayButton.addClickListener(() => {
            const deleteGatewayConfirmModal = <DeleteGatewayConfirmModal gateway={this.options.entry}/>
            deleteGatewayConfirmModal.show();
        });
        this.editGatewayButton.addClickListener(() => {
            const editGatewayModal = <EditEmailGatewayModal gateway={this.options.entry} />;
            editGatewayModal.show();
        });
    }
}


@autoredraw(EmailGateway)
class EmailGatewayTable extends SortableTable {
    getRowClass() {
        return EmailGatewayTableRow;
    }

    getEntries() {
        return EmailGateway.all();
    }

    getDefaultColumns() {
        const cellStyle = {
            textAlign: "center",
        };
        const headerStyle = {
            textAlign: "center",
            width: "16%",
        };

        const deleteButton = (gateway: EmailGateway) => {
            return <Button level={Level.DANGER} ref="deleteGatewayButton">Delete</Button>;
        };

        const editButton = (gateway: EmailGateway) => {
            return <Button level={Level.INFO} ref="editGatewayButton">Edit</Button>;
        };

        return [{
            value: (gateway: EmailGateway) => gateway.name,
            headerName: UI.T("Name"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: (gateway: EmailGateway) => gateway.host,
            headerName: UI.T("Host"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: (gateway: EmailGateway) => gateway.port,
            headerName: UI.T("Port"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: (gateway: EmailGateway) => gateway.useTLS,
            headerName: UI.T("Use TLS"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: (gateway: EmailGateway) => gateway.username,
            headerName: UI.T("Username"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: deleteButton,
            headerName: "Delete",
            headerStyle: {width: "10%"},
        }, {
            value: editButton,
            headerName: "Edit",
            headerStyle: {width: "10%"},
        }];
    }
}


class EmailGatewayWidget extends UI.Element {
    declare addGatewayButton: Button;

    render() {
        return [<EmailGatewayTable />,
                <Button level={Level.SUCCESS} ref="addGatewayButton">Add Gateway</Button>,
        ];
    }

    onMount() {
        EmailGateway.registerStreams();
        this.addGatewayButton.addClickListener(() => {
            const addGatewayModal = <AddEmailGatewayModal />;
            addGatewayModal.show();
        });
    }
}

export {EmailGatewayWidget};
