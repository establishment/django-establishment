import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Level} from "../../../stemjs/src/ui/Constants.js";
import {SortableTable} from "../../../stemjs/src/ui/table/SortableTable.jsx";
import {Button} from "../../../stemjs/src/ui/button/Button.jsx";
import {ActionModal} from "../../../stemjs/src/ui/modal/Modal.jsx";
import {FormField} from "../../../stemjs/src/ui/form/Form.jsx";
import {TextInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {NumberInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {RawCheckboxInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {PasswordInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {TableRow} from "../../../stemjs/src/ui/table/Table.jsx";
import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {EmailGatewayStore} from "./state/EmailGatewayStore.js";
import {autoredraw} from "../../../stemjs/src/decorators/AutoRedraw.js";

class EmailGatewayModal extends ActionModal {
    constructor(options) {
        super(options);
        this.fields = ["name", "host", "port", "useTLS", "username"];
    }

    getBody() {
        const gatewayValues = this.options.gateway || {};
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
                <PasswordInput value={gatewayValues.password || ""} ref="passwordInput"/>
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


class GenericConfirmModal extends ActionModal {
    constructor(options) {
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


@autoredraw(EmailGatewayStore)
class EmailGatewayTable extends SortableTable {
    getRowClass() {
        return EmailGatewayTableRow;
    }

    getEntries() {
        return EmailGatewayStore.all();
    }

    getDefaultColumns() {
        const cellStyle = {
            textAlign: "center",
        };
        const headerStyle = {
            textAlign: "center",
            width: "16%",
        };

        const deleteButton = (gateway) => {
            return <Button level={Level.DANGER} ref="deleteGatewayButton">Delete</Button>;
        };

        const editButton = (gateway) => {
            return <Button level={Level.INFO} ref="editGatewayButton">Edit</Button>;
        };

        return [{
            value: gateway => gateway.name,
            headerName: UI.T("Name"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: gateway => gateway.host,
            headerName: UI.T("Host"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: gateway => gateway.port,
            headerName: UI.T("Port"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: gateway => gateway.useTLS,
            headerName: UI.T("Use TLS"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: gateway => gateway.username,
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


class EmailGatewayWidget extends Panel {
    render() {
        return [<EmailGatewayTable />,
                <Button level={Level.SUCCESS} ref="addGatewayButton">Add Gateway</Button>,
        ];
    }

    onMount() {
        EmailGatewayStore.registerStreams();
        this.addGatewayButton.addClickListener(() => {
            const addGatewayModal = <AddEmailGatewayModal />;
            addGatewayModal.show();
        });
    }
}

export {EmailGatewayWidget};
