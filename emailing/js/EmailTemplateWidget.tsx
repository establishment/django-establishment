import {UI, type ExtendedOptions, type ElementOptions, type UIElement} from "../../../stemjs/ui/UIBase";
import {Level, Orientation} from "../../../stemjs/ui/Constants";
import {SortableTable} from "../../../stemjs/ui/table/SortableTable";
import {Button} from "../../../stemjs/ui/button/Button";
import {SectionDivider} from "../../../stemjs/ui/section-divider/SectionDivider";
import {TableRow} from "../../../stemjs/ui/table/Table";
import {ActionModal} from "../../../stemjs/ui/modal/Modal";
import {FormField} from "../../../stemjs/ui/form/Form";
import {TextInput} from "../../../stemjs/ui/input/Input";
import {Select} from "../../../stemjs/ui/input/Input";
import {TextArea} from "../../../stemjs/ui/input/Input";
import {Ajax} from "../../../stemjs/base/Ajax";
import {Language} from "../../localization/js/state/LanguageStore";
import {EmailGateway} from "state/EmailGatewayStore";
import {EmailCampaign} from "state/EmailCampaignStore";
import {EmailTemplate} from "state/EmailTemplateStore";
import {autoredraw} from "../../../stemjs/decorators/AutoRedraw";

export interface EmailTemplateModalOptions {
    template?: any;
}

abstract class EmailTemplateModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, EmailTemplateModalOptions>;
    abstract getAjaxAction(): string;

    declare campaignSelect: Select<any>;
    declare fields: any;
    declare gatewaySelect: Select<any>;
    declare htmlInput: TextArea;
    declare htmlRenderer: UIElement;
    declare languageSelect: Select<any>;
    declare subjectInput: TextInput;

    constructor(options) {
        super(options);
        this.fields = ["subject", "html", "campaignId", "languageId", "gatewayId"];
    }

    getModalWindowStyle() {
        return {
            ...super.getModalWindowStyle(),
            height: "90vh",
            width: "70vw",
            display: "flex",
            flexDirection: "column",
        };
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
                <Select ref="campaignSelect" options={EmailCampaign.all()} selected={EmailCampaign.get(templateValues.campaignId)}/>
            </FormField>,
            <FormField label="Language" ref="languageIdField" style={{margin: "initial"}}>
                <Select ref="languageSelect" options={Language.all()} selected={Language.get(templateValues.languageId)}/>
            </FormField>,
            <FormField label="Gateway" ref="gatewayIdField" style={{margin: "initial"}}>
                <Select ref="gatewaySelect" options={EmailGateway.all()} selected={EmailGateway.get(templateValues.gatewayId)}/>
            </FormField>,
            <FormField label="Html" ref="htmlField" inline={false} style={{margin: "initial"}}>
            </FormField>,
            <SectionDivider orientation={Orientation.HORIZONTAL} style={{width: "100%", flex: "1"}}>
                <div style={{width: "50%", height: "100%", overflow: "hidden"}}>
                    <TextArea value={templateValues.html || ""} ref="htmlInput" style={{height: "100%", width: "100%", resize: "none"}}/>
                </div>
                <div style={{width: "50%", height: "100%", overflow: "auto", position: "relative"}}>
                  <UI.Element ref="htmlRenderer" style={{height: "100%", position: "absolute"}}/>
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


export interface GenericConfirmModalOptions {
    template?: any;
}

abstract class GenericConfirmModal extends ActionModal {
    declare options: ExtendedOptions<ActionModal, GenericConfirmModalOptions>;
    abstract getActionText(): string;
    abstract getAjaxAction(): string;


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
    declare deleteTemplateButton: Button;
    declare editTemplateButton: Button;
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


@autoredraw(EmailTemplate)
class EmailTemplateTable extends SortableTable {
    getRowClass() {
        return EmailTemplateTableRow;
    }

    getEntries() {
        return EmailTemplate.all();
    }

    getDefaultColumns() {
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

        return [{
            value: template => template.subject,
            headerName: UI.T("Subject"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: template => EmailCampaign.get(template.campaignId).name,
            headerName: UI.T("Campaign"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: template => Language.get(template.languageId).name,
            headerName: UI.T("Language"),
            cellStyle: cellStyle,
            headerStyle: headerStyle,
        }, {
            value: template => EmailGateway.get(template.gatewayId).name,
            headerName: UI.T("Gateway"),
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


export interface EmailTemplateWidgetOptions {
    entry?: any;
}

export class EmailTemplateWidget extends UI.Element {
    declare options: ElementOptions<EmailTemplateWidgetOptions>;
    declare addTemplateButton: Button;

    render() {
        return [<EmailTemplateTable />,
            <Button level={Level.SUCCESS} ref="addTemplateButton">Add Template</Button>
       ];
    }

    onMount() {
        super.onMount();

        EmailGateway.registerStreams();
        EmailCampaign.registerStreams();
        EmailTemplate.registerStreams();

        this.addTemplateButton.addClickListener(() => {
            const addTemplateModal = <AddEmailTemplateModal template={this.options.entry} />;
            addTemplateModal.show();
        });
    }
}
