import {UI, SortableTable, Button} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";
import {Ajax} from "Ajax";

class GatewayModal extends UI.ActionModal {
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
                } else {
                    this.hide();
                }
            },
            (error) => {
                for (let field of this.fields) {
                    if (error.message.contains(field)) {
                        this[field + "Field"].setError("Invalid " + field);
                    }
                }
                console.log("Error in adding contest !!");
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in gateway operation!!", "red");
            }
        );
    }
}


class AddGatewayModal extends GatewayModal {
    getTitle() {
        return "New gateway";
    }

    getActionName() {
        return "Add Gateway";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    getAjaxAction() {
        return "new";
    }
}


class EditGatewayModal extends GatewayModal {
    getTitle() {
        return "Edit gateway";
    }

    getActionName() {
        return "Save Gateway";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    getAjaxAction() {
        return "update";
    }
}


class EmailGatewayTableRow extends UI.TableRow {
    deleteGateway() {
        const request = {
            action: "delete",
            objectType: "gateway",
            id: this.options.entry.id,
        };

        Ajax.getJSON("/email/control/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    this.hide();
                }
            },
            (error) => {
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in gateway deletion!!", "red");
            }
        );
    }

    onMount() {
        super.onMount();
        this.deleteGatewayButton.addClickListener(() => {
            this.deleteGateway();
        });

        this.editGatewayButton.addClickListener(() => {
            const editGatewayModal = <EditGatewayModal gateway={this.options.entry} />;
            editGatewayModal.show();
        });
        this.options.entry.addUpdateListener((event) => {
            // console.warn(event);
            this.redraw();
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
                textAlign: "right",
            };
            const headerStyle = {
                textAlign: "right",
                width: "16%",
            };

            const deleteButton = (gateway) => {
                return <Button level={UI.Level.DANGER} ref="deleteGatewayButton">Delete Gateway</Button>;
            };

            const editButton = (gateway) => {
                return <Button level={UI.Level.INFO} ref="editGatewayButton">Edit Gateway</Button>;
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
        // TODO: This is not working, you have to refresh the page to get updates.
        // TODO: Also, the event is outdated, pretty sad.
        EmailGatewayStore.addUpdateListener((event) => {
            console.warn(event);
            this.redraw();
        });
    }
}


class EmailGatewayWidget extends UI.Panel {
    extraNodeAttributes(attr) {
        attr.setStyle({
            marginLeft: "10%",
            marginRight: "10%",
            marginTop: "30px",
        });
    }

    render() {
        return [<EmailGatewayTable />,
            <Button level={UI.Level.SUCCESS} ref="addGatewayButton">Add Gateway</Button>
        ];
    }

    onMount() {
        EmailGatewayStore.registerStreams();
        this.addGatewayButton.addClickListener(() => {
            const addGatewayModal = <AddGatewayModal />;
            addGatewayModal.show();
        });
    }
}

export {EmailGatewayWidget};
