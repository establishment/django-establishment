import {UI} from "UI";
import {MarkupEditorModal} from "MarkupEditorModal";
import {LoginModal} from "LoginModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";

class EditThreadReplyButton extends UI.Button {
    setOptions(options) {
        if (!options.faIcon) {
            options.label = options.label || UI.T("Preview");
        }
        options.level = options.level || UI.Level.PRIMARY;
        super.setOptions(options);
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            if (!this.markupEditorModal) {
                this.markupEditorModal = <EditThreadReplyModal
                    messageInstance={this.options.messageInstance}
                    classMap={ChatMarkupRenderer.classMap}
                />;
                this.markupEditorModal.mount(document.body);
            }
            this.markupEditorModal.show();
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
