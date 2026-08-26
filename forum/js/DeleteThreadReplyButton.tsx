import {UI} from "../../../stemjs/ui/UIBase";
import {ActionModal, ActionModalButton, type ActionModalOptions} from "../../../stemjs/ui/modal/Modal";

interface DeleteThreadReplyModalOptions extends ActionModalOptions {
    messageInstance?: any;
}

class DeleteThreadReplyModal extends ActionModal<DeleteThreadReplyModalOptions> {
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