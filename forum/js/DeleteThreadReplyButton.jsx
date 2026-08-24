import {UI} from "../../../stemjs/ui/UIBase";
import {ActionModal, ActionModalButton} from "../../../stemjs/ui/modal/Modal";

class DeleteThreadReplyModal extends ActionModal {
    getTitle() {
        return UI.T("Delete message");
    }

    getActionName() {
        return UI.T("Delete");
    }

    getBody() {
        return <p>{UI.T("Are you sure you want to delete the message?")}</p>;
    }

    action() {
        this.options.messageInstance.deleteMessage();
        this.hide();
    }
}

let DeleteThreadReplyButton = ActionModalButton(DeleteThreadReplyModal);

export {DeleteThreadReplyButton};