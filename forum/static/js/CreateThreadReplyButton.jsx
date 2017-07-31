import {Ajax} from "Ajax";
import {UI, Button, registerStyle} from "UI";
import {GlobalState} from "State";
import {MarkupEditorModal} from "MarkupEditorModal";
import {LoginModal} from "LoginModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {ButtonStyle} from "ForumStyle";
import {Level, Size} from "Constants";

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
        let request = {
            forumThreadId: this.options.forumThreadId,
            message: this.markupEditor.getValue(),
        };

        Ajax.request({
            url: "/forum/forum_thread_post/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    // TODO: should be a dispatch: it should jump and highlight your post
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in posting forum thread message:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}

export {CreateThreadReplyButton};
