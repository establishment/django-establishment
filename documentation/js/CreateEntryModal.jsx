import {DocumentationEntryStore} from "./state/DocumentationStore";
import {UI, ActionModal, ActionModalButton, Form, FormField, TextInput, Select} from "UI";
import {Ajax} from "Ajax";
import {GlobalState} from "State";

export class EditEntryModal extends ActionModal {
    getTitle() {
        return "Edit documentation entry";
    }

    getActionName() {
        return "Apply";
    }

    getEntry() {
        return this.options.entry;
    }

    getParentInput() {}

    getAjaxUrl() {
        return "/docs/edit_entry/";
    }

    getAjaxRequest() {
        return {
            entryId: this.getEntry().id,
            urlName: this.urlNameInput.getValue(),
            name: this.nameInput.getValue(),
            articleId: parseInt(this.articleIdInput.getValue()) || 0,
            parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
        };
    }

    getBody() {
        return [
            <Form style={{marginTop: "10px", color: "initial", fontSize: "initial"}}>
                <FormField label="URL name" style={{fontWeight: "initial"}}>
                    <TextInput ref="urlNameInput"  value={this.getEntry().urlName}/>
                </FormField>
                <FormField label="Name" style={{fontWeight: "initial"}}>
                    <TextInput ref="nameInput"  value={this.getEntry().name}/>
                </FormField>
                <FormField label="Article Id" style={{fontWeight: "initial"}}>
                    <TextInput ref="articleIdInput" value={this.getEntry().articleId}
                               placeholder="Enter 0 (or leave blank) to create a new article instead"/>
                </FormField>
                {this.getParentInput()}
                <FormField label="Parent index" style={{fontWeight: "initial"}}>
                    <TextInput ref="parentIndexInput"  value={this.getEntry().parentIndex}/>
                </FormField>
            </Form>
        ];
    }

    check(data) {
        if (!data.urlName) {
            return "URL name cannot be empty.";
        }
        if (!data.name) {
            return "Name cannot be empty.";
        }
        for (let entry of DocumentationEntryStore.all()) {
            if (entry === this.getEntry()) {
                continue;
            }
            if (entry.getName() === data.name) {
                return "Name already exists.";
            }
            if (entry.urlName === data.urlName) {
                return "URL name already exists";
            }
        }
    }

    action() {
        let request = this.getAjaxRequest();
        let errorMessage = this.check(request);
        if (!errorMessage) {
            Ajax.postJSON(this.getAjaxUrl(), request);
        } else {
            this.messageArea.showMessage(errorMessage, "red");
        }
        this.hide();
    }
}

export class CreateEntryModal extends EditEntryModal {
    getTitle() {
        return "Create documentation entry";
    }

    getActionName() {
        return "Create";
    }

    getEntry() {
        return {
            urlName: "",
            name: "",
            articleId: "",
            parentIndex: "",
            id: 0
        };
    }

    getParentInput() {
        let entries = DocumentationEntryStore.all();
        entries.push({
            toString: () => {
                return "No Parent"
            },
            id: 0
        });
        return <FormField label="Parent" style={{fontWeight: "initial"}}>
                    <Select ref="parentInput" options={entries} selected={entries[entries.length - 1]} style={{height: "30px"}}/>
                </FormField>;
    }

    getAjaxUrl() {
        return "/docs/create/";
    }

    getAjaxRequest() {
        let request = super.getAjaxRequest();
        request.parentId = this.parentInput.get().id;
        return request;
    }
}

export const CreateEntryButton = ActionModalButton(CreateEntryModal);