import {UI, SortableTable, Button} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";
import {EmailCampaignStore} from "EmailCampaignStore";
import {EmailTemplateStore} from "EmailTemplateStore";
import {Ajax} from "Ajax";

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
            objectType: "campaign",
            id: this.options.campaign ? this.options.campaign.id : null,
        };

        Ajax.postJSON("/email/control/", request).then(
            (data) => {
                if (data.error) {
                    console.log(data.error);
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


class DeleteCampaignConfirmModal extends GenericConfirmModal {
    getActionText() {
        return "Are you sure you want to delete this entry?";
    }

    getAjaxAction() {
        return "delete";
    }
}


class ClearStatusCampaignConfirmModal extends GenericConfirmModal {
    getActionText() {
        return "Are you sure you want to clear all status for this entry?";
    }

    getAjaxAction() {
        return "clearStatus";
    }
}

class SendCampaignConfirmModal extends GenericConfirmModal {
    getActionText() {
        return "Are you sure you want to start sending this email campaign?";
    }

    getAjaxAction() {
        return "start";
    }
}


class TestSendCampaignModal extends UI.ActionModal {
    constructor(options) {
        super(options);
    }

    getBody() {
        return [
            <UI.FormField label="Name" ref="fromIdField">
                <UI.TextInput value={USER.id} ref="fromIdInput"/>
            </UI.FormField>,
            <UI.FormField label="From address" ref="toIdField">
                <UI.TextInput value={USER.id} ref="toIdInput"/>
            </UI.FormField>
        ];
    }

    action() {
        const request = {
            action: "test",
            objectType: "campaign",
            fromId: this.fromIdInput.getValue(),
            toId: this.toIdInput.getValue(),
            id: this.options.campaign ? this.options.campaign.id : null,
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

    getTitle() {
        return "Campaign send test";
    }

    getActionName() {
        return "Send test emails!";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }
}


class EmailCampaignModal extends UI.ActionModal {
    constructor(options) {
        super(options);
        this.fields = ["name", "fromAddress", "gatewayId", "isNewsletter"];
    }

    getBody() {
        const campaignValues = this.options.campaign || {};
        return [
            <UI.FormField label="Name" ref="nameField">
                <UI.TextInput value={campaignValues.name || ""} ref="nameInput"/>
            </UI.FormField>,
            <UI.FormField label="From address" ref="fromAddressField">
                <UI.TextInput value={campaignValues.fromAddress || ""} ref="fromAddressInput"/>
            </UI.FormField>,
            <UI.FormField label="Gateway" ref="gatewayIdField">
                <UI.Select ref="gatewaySelect" options={EmailGatewayStore.all()} selected={EmailGatewayStore.get(campaignValues.gatewayId)}/>
            </UI.FormField>,
            <UI.FormField label="Is newsletter" ref="isNewsletterField">
                <UI.CheckboxInput value={campaignValues.isNewsletter || ""} ref="isNewsletterInput"/>
            </UI.FormField>,
        ];
    }

    action() {
        const request = {
            action: this.getAjaxAction(),
            objectType: "campaign",
            name: this.nameInput.getValue(),
            fromAddress: this.fromAddressInput.getValue(),
            gatewayId: this.gatewaySelect.get().id,
            isNewsletter: this.isNewsletterInput.getValue(),
            id: this.options.campaign ? this.options.campaign.id : null,
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
}


class AddEmailCampaignModal extends EmailCampaignModal {
    getTitle() {
        return "New Email campaign";
    }

    getActionName() {
        return "Add Email campaign";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    getAjaxAction() {
        return "new";
    }
}


class EditEmailCampaignModal extends EmailCampaignModal {
    getTitle() {
        return "Edit Email campaign";
    }

    getActionName() {
        return "Save Email campaign";
    }

    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    getAjaxAction() {
        return "update";
    }
}


class EmailCampaignTableRow extends UI.TableRow {
    onMount() {
        super.onMount();
        this.deleteCampaignButton.addClickListener(() => {
            const deleteCampaignConfirmModal = <DeleteCampaignConfirmModal campaign={this.options.entry}/>
            deleteCampaignConfirmModal.show();
        });

        this.editCampaignButton.addClickListener(() => {
            const editCampaignModal = <EditEmailCampaignModal campaign={this.options.entry} />;
            editCampaignModal.show();
        });

        this.testSendCampaignButton.addClickListener(() => {
            const testSendCampaignModal = <TestSendCampaignModal campaign={this.options.entry} />;
            testSendCampaignModal.show();
        });

        this.sendCampaignButton.addClickListener(() => {
            const sendCampaignConfirmModal = <SendCampaignConfirmModal campaign={this.options.entry}/>
            sendCampaignConfirmModal.show();
        });

        this.clearStatusCampaignButton.addClickListener(() => {
            const clearStatusCampaignConfirmModal = <ClearStatusCampaignConfirmModal campaign={this.options.entry} />
            clearStatusCampaignConfirmModal.show();
        });
    }
}


class EmailCampaignTable extends SortableTable {
    getRowClass() {
        return EmailCampaignTableRow;
    }

    getEntries() {
        return EmailCampaignStore.all();
    }

    setColumns(columns) {
        if (!columns || columns.length === 0) {
            const cellStyle = {
                textAlign: "center",
            };
            const headerStyle = {
                textAlign: "center",
                width: "20%",
            };

            const deleteButton = (campaign) => {
                return <Button level={UI.Level.DANGER} ref="deleteCampaignButton">Delete</Button>;
            };

            const editButton = (campaign) => {
                return <Button level={UI.Level.INFO} ref="editCampaignButton">Edit</Button>;
            };

            const testSendButton = (campaign) => {
                return <Button level={UI.Level.INFO} ref="testSendCampaignButton">Test Send</Button>
            };

            const sendButton = (campaign) => {
                return <Button level={UI.Level.INFO} ref="sendCampaignButton">Send</Button>
            };

            const clearStatusButton = (campaign) => {
                return <Button level={UI.Level.DANGER} ref="clearStatusCampaignButton">Clear Status</Button>
            };

            columns.push({
                value: campaign => campaign.name,
                headerName: UI.T("Name"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: campaign => campaign.fromAddress,
                headerName: UI.T("From Address"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: campaign => campaign.isNewsletter,
                headerName: UI.T("Is Newsletter"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: campaign => EmailGatewayStore.get(campaign.gatewayId).name,
                headerName: UI.T("Gateway"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: campaign => campaign.emailsRead,
                headerName: UI.T("Emails Read"),
                cellStyle: cellStyle,
                headerStyle: headerStyle
            });
            columns.push({
                value: campaign => campaign.emailsSent,
                headerName: UI.T("Emails Sent"),
                cellStyle: cellStyle,
                headerStyle: headerStyle
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
            columns.push({
                value: testSendButton,
                headerName: "Test Send",
                headerStyle: {width: "10%"}
            });
            columns.push({
                value: sendButton,
                headerName: "Send",
                headerStyle: {width: "10%"}
            });
            columns.push({
                value: clearStatusButton,
                headerName: "Clear Status",
                headerStyle: {width: "10%"}
            });
        }
        super.setColumns(columns);
    }

    onMount() {
        EmailCampaignStore.addUpdateListener(() => {
            this.redraw();
        });
        EmailCampaignStore.addCreateListener(() => {
            this.redraw();
        });
        EmailCampaignStore.addDeleteListener(() => {
            this.redraw();
        });
    }
}


class EmailCampaignWidget extends UI.Panel {
    render() {
        return [<EmailCampaignTable />,
            <Button level={UI.Level.SUCCESS} ref="addCampaignButton">Add Campaign</Button>
       ];
    }

    onMount() {
        super.onMount();

        EmailGatewayStore.registerStreams();
        EmailCampaignStore.registerStreams();

        this.addCampaignButton.addClickListener(() => {
            const addCampaignModal = <AddEmailCampaignModal campaign={this.options.entry} />;
            addCampaignModal.show();
        });
    }
}

export {EmailCampaignWidget};
