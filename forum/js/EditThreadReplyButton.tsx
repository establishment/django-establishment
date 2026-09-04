import {UI, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {type MessageInstance} from "../../chat/js/state/MessageThreadStore";
import {Button} from "../../../stemjs/ui/button/Button";
import {Level} from "../../../stemjs/ui/Constants";
import {MarkupEditorModal} from "../../content/js/markup/MarkupEditorModal";
import {LoginModal} from "../../accounts/js/LoginModal";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer";


export interface EditThreadReplyButtonOptions {
    messageInstance?: MessageInstance;
}

class EditThreadReplyButton extends Button {
    declare options: ExtendedOptions<Button, EditThreadReplyButtonOptions>;

    setOptions(options: typeof this.options) {
        if (!options.icon) {
            options.label = options.label || UI.T("Preview");
        }
        options.level = options.level || Level.PRIMARY;
        super.setOptions(options);
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            EditThreadReplyModal.show({
                messageInstance: this.options.messageInstance,
                classMap: ChatMarkupRenderer.classMap
            });
        });
    }
}

export interface EditThreadReplyModalOptions {
    messageInstance?: MessageInstance;
}

class EditThreadReplyModal extends MarkupEditorModal {
    declare options: ExtendedOptions<MarkupEditorModal, EditThreadReplyModalOptions>;

    onMount() {
        super.onMount();
        this.markupEditor.setValue(this.options.messageInstance.getContent());
        // this.markupEditor.codeEditor.getAce().focus();
        this.doneButton.addClickListener(() => {
            this.options.messageInstance.edit(this.markupEditor.getValue());
        });
    }
}

export {EditThreadReplyButton};
