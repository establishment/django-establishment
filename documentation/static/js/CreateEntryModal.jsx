import {DocumentationEntryStore} from "./state/DocumentationStore";
import {UI, ActionModal, ActionModalButton, Form, FormField, TextInput, Select} from "UI";
import {Ajax} from "Ajax";
import {GlobalState} from "State";

export class CreateEntryModal extends ActionModal {
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
            parentIndex: ""
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
        let parent = entries[entries.length - 1];
        if (this.getEntry().parentId) {
            parent = this.getEntry().getParent();
        }
        return <FormField label="Parent" style={{"font-weight": "initial"}}>
                    <Select ref="parentInput" options={entries} selected={parent} style={{"height": "30px"}}/>
                </FormField>;
    }

    getBody() {
        return [
            <Form style={{"margin-top": "10px", "color": "initial", "font-size": "initial"}}>
                <FormField label="URL name" style={{"font-weight": "initial"}}>
                    <TextInput ref="urlNameInput"  value={this.getEntry().urlName}/>
                </FormField>
                <FormField label="Name" style={{"font-weight": "initial"}}>
                    <TextInput ref="nameInput"  value={this.getEntry().name}/>
                </FormField>
                <FormField label="Article Id" style={{"font-weight": "initial"}}>
                    <TextInput ref="articleIdInput" value={this.getEntry().articleId}
                               placeholder="Enter 0 (or leave blank) to create a new article instead"/>
                </FormField>
                {this.getParentInput()}
                <FormField label="Parent index" style={{"font-weight": "initial"}}>
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

    getAjaxUrl() {
        return "/docs/create/";
    }

    getAjaxRequest() {
        return {
            urlName: this.urlNameInput.getValue(),
            name: this.nameInput.getValue(),
            articleId: parseInt(this.articleIdInput.getValue()) || 0,
            parentId: this.parentInput.get().id,
            parentIndex: parseInt(this.parentIndexInput.getValue()) || 0
        };
    }

    action() {
        let request = this.getAjaxRequest();
        let errorMessage = this.check(request);
        if (!errorMessage) {
            Ajax.postJSON(this.getAjaxUrl(), request).then(
                (data) => {
                    if (data.error) {
                        console.log(data.error);
                    } else {
                        GlobalState.importState(data.state || {});
                    }
                },
                (error) => {
                    console.log("Error in deleting workspace:\n" + error.message);
                    console.log(error.stack);
                }
            );
        } else {
            this.messageArea.showMessage(errorMessage, "red");
        }
        this.hide();
    }
}

export const CreateEntryButton = ActionModalButton(CreateEntryModal);

export class EditEntryModal extends CreateEntryModal {
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
        let request = super.getAjaxRequest();
        delete request.parentId;
        request.entryId = this.getEntry().id;
        return request;
    }
}