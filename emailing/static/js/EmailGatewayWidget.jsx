import {UI, SortableTable, Button} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";
import {Ajax} from "Ajax";

class EmailGatewayModal extends UI.ActionModal {
    constructor(options) {
        super(options);
        this.fields = ["name", "host", "port", "useTLS", "username"];
    }

    getBody() {
        const gatewayValues = this.options.gateway || {};
        return [
            <UI.FormField label="Name" ref="nameField">
                <UI.TextInput value={gatewayValues.name || ""} ref="nameInput"/>
            </UI.FormField>,
            <UI.FormField label="Host" ref="hostField">
                <UI.TextInput value={gatewayValues.host || ""} ref="hostInput"/>
            </UI.FormField>,
            <UI.FormField label="Port" ref="portField">
                <UI.NumberInput value={gatewayValues.port || ""} ref="portInput"/>
            </UI.FormField>,
            <UI.FormField label="Use TLS" ref="useTLSField" >
                <UI.CheckboxInput value={gatewayValues.useTLS || ""} ref="useTLSInput"/>
            </UI.FormField>,
            <UI.FormField label="Username" ref="usernameField">
                <UI.TextInput value={gatewayValues.username || ""} ref="usernameInput"/>
            </UI.FormField>,
            <UI.FormField label="Password" ref="passwordField">
                <UI.TextInput value={gatewayValues.password || ""} ref="passwordInput"/>
            </UI.FormField>
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
            (data) => {
                if (data.error) {
                    console.log(data.error);
                    for (let field of this.fields) {
                        if (data.error.toString().indexOf(field) !== -1) {
                            this[field + "Field"].setError("Invalid " + field);
                        }
                    }
                    this.messageArea.showMessage("Error in gateway operation!!", "red");
                } else {
                    this.hide();
                }
            },
            (error) => {
                console.log("Error in adding contest !!");
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in gateway operation!!", "red");
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
        return UI.Level.PRIMARY;
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
        return UI.Level.PRIMARY;
    }

    getAjaxAction() {
        return "update";
    }
}


class GenericConfirmModal extends UI.ActionModal {
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
            d: this.options.gateway ? this.options.gateway.id : null,
        };

        Ajax.postJSON("/email/control/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                    for (let field of this.fields) {
                        if (data.error.toString().indexOf(field) !== -1) {
                            this[field + "Field"].setError("Invalid " + field);
                        }
                    }
                    this.messageArea.showMessage("Error in campaign operation!!", "red");
                } else {
                    this.hide();
                }
            },
            (error) => {
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in campaign operation!!", "red");
            }
        );
    }

    getActionName() {
        return "Confirm!";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
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


class EmailGatewayTableRow extends UI.TableRow {
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


class EmailGatewayTable extends SortableTable {
    getRowClass() {
        return EmailGatewayTableRow;
    }

    getEntries() {
        return EmailGatewayStore.all();
    }

    setColumns(columns) {
        if (!columns || columns.length === 0) {
            const cellStyle = {
                textAlign: "center",
            };
            const headerStyle = {
                textAlign: "center",
                width: "16%",
            };

            const deleteButton = (gateway) => {
                return <Button level={UI.Level.DANGER} ref="deleteGatewayButton">Delete</Button>;
            };

            const editButton = (gateway) => {
                return <Button level={UI.Level.INFO} ref="editGatewayButton">Edit</Button>;
            };

            columns.push({
                value: gateway => gateway.name,
                headerName: UI.T("Name"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: gateway => gateway.host,
                headerName: UI.T("Host"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: gateway => gateway.port,
                headerName: UI.T("Port"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: gateway => gateway.useTLS,
                headerName: UI.T("Use TLS"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: gateway => gateway.username,
                headerName: UI.T("Username"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: deleteButton,
                headerName: "Delete",
                headerStyle: {width: "10%"},
            });
            columns.push({
                value: editButton,
                headerName: "Edit",
                headerStyle: {width: "10%"},
            });
        }
        super.setColumns(columns);
    }

    onMount() {
        EmailGatewayStore.addUpdateListener(() => {
            this.redraw();
        });
        EmailGatewayStore.addDeleteListener(() => {
            this.redraw();
        });
        EmailGatewayStore.addCreateListener(() => {
            this.redraw();
        });
    }
}


class EmailGatewayWidget extends UI.Panel {
    render() {
        return [<EmailGatewayTable />,
                <Button level={UI.Level.SUCCESS} ref="addGatewayButton">Add Gateway</Button>,
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
