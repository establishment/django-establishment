import {UI, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {Button} from "../../../stemjs/ui/button/Button";
import {registerStyle} from "../../../stemjs/ui/style/Theme";
import {Level, Size} from "../../../stemjs/ui/Constants";
import {Ajax} from "../../../stemjs/base/Ajax";

import {MarkupEditorModal} from "../../content/js/markup/MarkupEditorModal";
import {LoginModal} from "../../accounts/js/LoginModal";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer";
import {ForumButtonStyle} from "./ForumStyle";

export interface CreateThreadReplyButtonOptions {
    forumThreadId?: any;
}

@registerStyle(ForumButtonStyle)
class CreateThreadReplyButton extends Button {
    declare options: ExtendedOptions<Button, CreateThreadReplyButtonOptions>;
    declare markupEditorModal: any;

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
