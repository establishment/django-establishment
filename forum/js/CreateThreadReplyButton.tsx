import {UI, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {Level, Size} from "../../../stemjs/ui/Constants";
import {Ajax} from "../../../stemjs/base/Ajax";

import {MarkupEditorModal} from "../../content/js/markup/MarkupEditorModal";
import {LoginModal} from "../../accounts/js/LoginModal";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer";
import {ForumButton} from "./ForumButton";

export interface CreateThreadReplyButtonOptions {
    forumThreadId?: any;
}

class CreateThreadReplyButton extends ForumButton {
    declare options: ExtendedOptions<ForumButton, CreateThreadReplyButtonOptions>;
    declare markupEditorModal: any;

    getDefaultOptions() {
        return {
            level: Level.PRIMARY,
            size: Size.LARGE,
            label: UI.T("Preview")
        };
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

export interface CreateThreadReplyModalOptions {
    forumThreadId?: any;
}

class CreateThreadReplyModal extends MarkupEditorModal {
    declare options: ExtendedOptions<MarkupEditorModal, CreateThreadReplyModalOptions>;

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
