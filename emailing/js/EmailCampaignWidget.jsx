import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Level} from "../../../stemjs/src/ui/Constants.js";
import {SortableTable} from "../../../stemjs/src/ui/table/SortableTable.jsx";
import {Button} from "../../../stemjs/src/ui/button/Button.jsx";
import {FormField} from "../../../stemjs/src/ui/form/Form.jsx";
import {TextInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {RawCheckboxInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {Select} from "../../../stemjs/src/ui/input/Input.jsx";
import {ActionModal} from "../../../stemjs/src/ui/modal/Modal.jsx";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {TableRow} from "../../../stemjs/src/ui/table/Table.jsx";
import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {EmailGatewayStore} from "./state/EmailGatewayStore.js";
import {EmailCampaignStore} from "./state/EmailCampaignStore.js";
import {autoredraw} from "../../../stemjs/src/decorators/AutoRedraw.js";


class GenericConfirmModal extends ActionModal {
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


class TestSendCampaignModal extends ActionModal {
    constructor(options) {
        super(options);
    }

    getBody() {
        return [
            <FormField label="Receiver id" ref="receiverIdField">
                <TextInput ref="receiverIdInput"/>
            </FormField>,
        ];
    }

    action() {
        const request = {
            action: "test",
            objectType: "campaign",
            receiverId: this.receiverIdInput.getValue(),
            id: this.options.campaign ? this.options.campaign.id : null,
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

    getTitle() {
        return "Campaign send test";
    }

    getActionName() {
        return "Send test emails!";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }
}


class EmailCampaignModal extends ActionModal {
    constructor(options) {
        super(options);
        this.fields = ["name", "fromAddress", "gatewayId", "isNewsletter"];
    }

    getBody() {
        const campaignValues = this.options.campaign || {};
        return [
            <FormField label="Name" ref="nameField">
                <TextInput value={campaignValues.name || ""} ref="nameInput"/>
            </FormField>,
            <FormField label="From address" ref="fromAddressField">
                <TextInput value={campaignValues.fromAddress || ""} ref="fromAddressInput"/>
            </FormField>,
            <FormField label="Gateway" ref="gatewayIdField">
                <Select ref="gatewaySelect" options={EmailGatewayStore.all()} selected={EmailGatewayStore.get(campaignValues.gatewayId)}/>
            </FormField>,
            <FormField label="Is newsletter" ref="isNewsletterField">
                <RawCheckboxInput value={campaignValues.isNewsletter || ""} ref="isNewsletterInput"/>
            </FormField>,
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


class AddEmailCampaignModal extends EmailCampaignModal {
    getTitle() {
        return "New Email campaign";
    }

    getActionName() {
        return "Add Email campaign";
    }

    getActionLevel() {
        return Level.PRIMARY;
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
        return Level.PRIMARY;
    }

    getAjaxAction() {
        return "update";
    }
}


class EmailCampaignTableRow extends TableRow {
    onMount() {
        super.onMount();
        this.deleteCampaignButton.addClickListener(() => {
            const deleteCampaignConfirmModal = <DeleteCampaignConfirmModal campaign={this.options.entry}/>;
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
            const sendCampaignConfirmModal = <SendCampaignConfirmModal campaign={this.options.entry}/>;
            sendCampaignConfirmModal.show();
        });

        this.clearStatusCampaignButton.addClickListener(() => {
            const clearStatusCampaignConfirmModal = <ClearStatusCampaignConfirmModal campaign={this.options.entry} />;
            clearStatusCampaignConfirmModal.show();
        });
    }
}


@autoredraw(EmailCampaignStore)
class EmailCampaignTable extends SortableTable {
    getRowClass() {
        return EmailCampaignTableRow;
    }

    getEntries() {
        return EmailCampaignStore.all();
    }

    getDefaultColumns() {
        const cellStyle = {
            textAlign: "center",
        };
        const headerStyle = {
            textAlign: "center",
            width: "20%",
        };

        const deleteButton = (campaign) => {
            return <Button level={Level.DANGER} ref="deleteCampaignButton">Delete</Button>;
        };

        const editButton = (campaign) => {
            return <Button level={Level.INFO} ref="editCampaignButton">Edit</Button>;
        };

        const testSendButton = (campaign) => {
            return <Button level={Level.INFO} ref="testSendCampaignButton">Test Send</Button>
        };

        const sendButton = (campaign) => {
            return <Button level={Level.INFO} ref="sendCampaignButton">Send</Button>
        };

        const clearStatusButton = (campaign) => {
            return <Button level={Level.DANGER} ref="clearStatusCampaignButton">Clear Status</Button>
        };

        return [{
            value: campaign => campaign.name,
            headerName: UI.T("Name"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: campaign => campaign.fromAddress,
            headerName: UI.T("From Address"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: campaign => campaign.isNewsletter,
            headerName: UI.T("Is Newsletter"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: campaign => (campaign.gatewayId && EmailGatewayStore.get(campaign.gatewayId).name) || "default",
            headerName: UI.T("Gateway"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: campaign => campaign.emailsRead,
            headerName: UI.T("Emails Read"),
            cellStyle: cellStyle,
            headerStyle: headerStyle
        }, {
            value: campaign => campaign.emailsSent,
            headerName: UI.T("Emails Sent"),
            cellStyle: cellStyle,
            headerStyle: headerStyle
        }, {
            value: deleteButton,
            headerName: "Delete",
            headerStyle: {width: "10%"},
        }, {
            value: editButton,
            headerName: "Edit",
            headerStyle: {width: "10%"},
        }, {
            value: testSendButton,
            headerName: "Test Send",
            headerStyle: {width: "10%"}
        }, {
            value: sendButton,
            headerName: "Send",
            headerStyle: {width: "10%"}
        }, {
            value: clearStatusButton,
            headerName: "Clear Status",
            headerStyle: {width: "10%"}
        }];
    }
}


class EmailCampaignWidget extends Panel {
    render() {
        return [<EmailCampaignTable />,
            <Button level={Level.SUCCESS} ref="addCampaignButton">Add Campaign</Button>
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
