import {UI, SortableTable, Button, SectionDivider, Panel, TableRow, ActionModal, FormField, TextInput, Select, TextArea} from "UI";
import {EmailGatewayStore} from "EmailGatewayStore";
import {EmailCampaignStore} from "EmailCampaignStore";
import {EmailTemplateStore} from "EmailTemplateStore";
import {Language} from "LanguageStore";
import {Ajax} from "Ajax";
import {Orientation} from "ui/Constants";
import {Level} from "ui/Constants";

class EmailTemplateModal extends ActionModal {
    constructor(options) {
        super(options);
        this.fields = ["subject", "html", "campaignId", "languageId", "gatewayId"];
    }

    getModalWindowStyle() {
        return Object.assign({}, super.getModalWindowStyle(), {
            height: "90vh",
            width: "70vw",
            display: "flex",
            flexDirection: "column",
        });
    }

    render() {
        return [
            <div className={this.styleSheet.header}>{this.getHeader()}</div>,
            (
                this.getBody() ?
                <div className={this.styleSheet.body}
                     style={{flex: "1", display: "flex", flexDirection: "column"}}>
                    {this.getBody()}
                </div> : null
            ),
            (
                this.getFooter() ?
                <div className={this.styleSheet.footer}>
                    {this.getFooter()}
                </div> : null
            )
        ];
    }

    getBody() {
        const templateValues = this.options.template || {};
        return [
            <FormField label="Subject" ref="subjectField" style={{margin: "initial"}}>
                <TextInput value={templateValues.subject || ""} ref="subjectInput"/>
            </FormField>,
            <FormField label="Campaign" ref="campaignIdField" style={{margin: "initial"}}>
                <Select ref="campaignSelect" options={EmailCampaignStore.all()} selected={EmailCampaignStore.get(templateValues.campaignId)}/>
            </FormField>,
            <FormField label="Language" ref="languageIdField" style={{margin: "initial"}}>
                <Select ref="languageSelect" options={Language.all()} selected={Language.get(templateValues.languageId)}/>
            </FormField>,
            <FormField label="Gateway" ref="gatewayIdField" style={{margin: "initial"}}>
                <Select ref="gatewaySelect" options={EmailGatewayStore.all()} selected={EmailGatewayStore.get(templateValues.gatewayId)}/>
            </FormField>,
            <FormField label="Html" ref="htmlField" inline={false} style={{margin: "initial"}}>
            </FormField>,
            <SectionDivider orientation={Orientation.HORIZONTAL} style={{width: "100%", flex: "1"}}>
                <div style={{width: "50%", height: "100%", overflow: "hidden"}}>
                    <TextArea value={templateValues.html || ""} ref="htmlInput" style={{height: "100%", width: "100%", resize: "none"}}/>
                </div>
                <div style={{width: "50%", height: "100%", overflow: "auto", position: "relative"}}>
                  <Panel ref="htmlRenderer" style={{height: "100%", position: "absolute"}}/>
                </div>
            </SectionDivider>,
        ];
    }

    action() {
        const request = {
            action: this.getAjaxAction(),
            objectType: "template",
            subject: this.subjectInput.getValue(),
            html: this.htmlInput.getValue(),
            campaignId: this.campaignSelect.get().id,
            languageId: this.languageSelect.get().id,
            gatewayId: this.gatewaySelect.get().id,
            id: this.options.template ? this.options.template.id : null,
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

    onMount() {
        this.htmlRenderer.node.innerHTML = this.htmlInput.getValue();
        this.htmlInput.addNodeListener("keyup", () => {
            this.htmlRenderer.node.innerHTML = this.htmlInput.getValue();
        });
        this.htmlInput.addNodeListener("change", () => {
            this.htmlRenderer.node.innerHTML = this.htmlInput.getValue();
        });
    }
}


class AddEmailTemplateModal extends EmailTemplateModal {
    getTitle() {
        return "New Email template";
    }

    getActionName() {
        return "Add Email template";
    }

    getActionLevel() {
        return Level.PRIMARY;
    }

    getAjaxAction() {
        return "new";
    }
}


class EditEmailTemplateModal extends EmailTemplateModal {
    getTitle() {
        return "Edit Email template";
    }

    getActionName() {
        return "Save Email template";
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
            objectType: "template",
            id: this.options.template ? this.options.template.id : null,
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


class DeleteTemplateConfirmModal extends GenericConfirmModal {
    getActionText() {
        return "Are you sure you want to delete this entry?";
    }

    getAjaxAction() {
        return "delete";
    }
}


class EmailTemplateTableRow extends TableRow {
    onMount() {
        super.onMount();
        this.deleteTemplateButton.addClickListener(() => {
            const deleteTemplateConfirmModal = <DeleteTemplateConfirmModal template={this.options.entry}/>
            deleteTemplateConfirmModal.show();
        });

        this.editTemplateButton.addClickListener(() => {
            const editTemplateModal = <EditEmailTemplateModal template={this.options.entry} />;
            editTemplateModal.show();
        });
    }
}


class EmailTemplateTable extends SortableTable {
    getRowClass() {
        return EmailTemplateTableRow;
    }

    getEntries() {
        return EmailTemplateStore.all();
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

            const deleteButton = (template) => {
                return <Button level={Level.DANGER} ref="deleteTemplateButton">Delete</Button>;
            };

            const editButton = (template) => {
                return <Button level={Level.INFO} ref="editTemplateButton">Edit</Button>;
            };

            columns.push({
                value: template => template.subject,
                headerName: UI.T("Subject"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: template => EmailCampaignStore.get(template.campaignId).name,
                headerName: UI.T("Campaign"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: template => Language.get(template.languageId).name,
                headerName: UI.T("Language"),
                cellStyle: cellStyle,
                headerStyle: headerStyle,
            });
            columns.push({
                value: template => EmailGatewayStore.get(template.gatewayId).name,
                headerName: UI.T("Gateway"),
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
        EmailTemplateStore.addUpdateListener(() => {
            this.redraw();
        });
        EmailTemplateStore.addCreateListener(() => {
            this.redraw();
        });
        EmailTemplateStore.addDeleteListener(() => {
            this.redraw();
        });
    }
}


class EmailTemplateWidget extends Panel {
    render() {
        return [<EmailTemplateTable />,
            <Button level={Level.SUCCESS} ref="addTemplateButton">Add Template</Button>
       ];
    }

    onMount() {
        super.onMount();

        EmailGatewayStore.registerStreams();
        EmailCampaignStore.registerStreams();
        EmailTemplateStore.registerStreams();

        console.log(EmailTemplateStore.all());

        this.addTemplateButton.addClickListener(() => {
            const addTemplateModal = <AddEmailTemplateModal template={this.options.entry} />;
            addTemplateModal.show();
        });
    }
}

export {EmailTemplateWidget};
