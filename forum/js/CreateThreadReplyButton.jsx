import {Ajax} from "base/Ajax";
import {UI, Button, registerStyle, Level, Size} from "ui/UI";

import {MarkupEditorModal} from "markup/MarkupEditorModal";
import {LoginModal} from "LoginModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {ButtonStyle} from "ForumStyle";

@registerStyle(ButtonStyle)
class CreateThreadReplyButton extends Button {
    getDefaultOptions() {
        return {
            level: Level.PRIMARY,
            size: Size.LARGE,
            label: UI.T("Preview")
        };
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.button);
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            if (!this.markupEditorModal) {
                this.markupEditorModal = <CreateThreadReplyModal forumThreadId={this.options.forumThreadId}
                    classMap={ChatMarkupRenderer.classMap}
                />;
            }
            this.markupEditorModal.show();
        });
    }
}

class CreateThreadReplyModal extends MarkupEditorModal {
    onMount() {
        super.onMount();
        this.doneButton.addClickListener(() => {
            this.createThreadReply();
        });
    }

    createThreadReply() {
        // TODO: should be a dispatch: it should jump and highlight your post
        Ajax.postJSON("/forum/forum_thread_post/", {
            forumThreadId: this.options.forumThreadId,
            message: this.markupEditor.getValue(),
        });
    }
}

export {CreateThreadReplyButton};
