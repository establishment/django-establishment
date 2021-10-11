import {UI, Button, Level} from "UI";
import {MarkupEditorModal} from "markup/MarkupEditorModal";
import {LoginModal} from "LoginModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";


class EditThreadReplyButton extends Button {
    setOptions(options) {
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

class EditThreadReplyModal extends MarkupEditorModal {
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
