import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Button} from "../../../stemjs/src/ui/button/Button.jsx";
import {ActionModal, ActionModalButton} from "../../../stemjs/src/ui/modal/Modal.jsx";
import {Input} from "../../../stemjs/src/ui/input/Input.jsx";
import {Link} from "../../../stemjs/src/ui/primitives/Link.jsx";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {Router} from "../../../stemjs/src/ui/Router.jsx";
import {TimePassedSpan} from "../../../stemjs/src/ui/misc/TimePassedSpan.jsx";
import {registerStyle} from "../../../stemjs/src/ui/style/Theme.js";
import {Level, Size} from "../../../stemjs/src/ui/Constants.js";
import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {NOOP_FUNCTION} from "../../../stemjs/src/base/Utils.js";
import {ConcentricCirclesLoadingScreen} from "../../../stemjs/src/ui/ConcentricCirclesLoadingScreen.jsx";
import {MarkupEditorModal} from "../../content/js/markup/MarkupEditorModal.jsx";
import {LoginModal} from "../../accounts/js/LoginModal.jsx";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer.jsx";
import {UserHandle} from "../../../csaaccounts/js/UserHandle.jsx";
import {EditThreadReplyButton} from "./EditThreadReplyButton.jsx";
import {DeleteThreadReplyButton} from "./DeleteThreadReplyButton.jsx";
import {CreateThreadReplyButton} from "./CreateThreadReplyButton.jsx";
import {CommentVotingWidgetWithThumbs} from "../../chat/js/VotingWidget.jsx";
import {ErrorHandlers} from "../../errors/js/ErrorHandlers.js";
import {ForumThreadPanelStyle, ForumButtonStyle} from "./ForumStyle.js";

let forumThreadPanelStyle = ForumThreadPanelStyle.getInstance();
ForumButtonStyle.getInstance(); // To ensure css importance order


class CreateForumThreadModal extends MarkupEditorModal {
    render() {
        let inputStyle = {
            "margin-bottom": "4px",
            "border": "0",
            //"border-radius": "4px",
            //"border": "2px solid #dcdcdc",
            "outline": "none",
            "color": "#333",
            "font-size": "14px",
            "padding-left": "8px",
            "width": "100%",
            "text-align": "center",
            "font-weight": "bold",
        };

        return [
            <Input label={UI.T("Title")} ref="titleInput" style={inputStyle} placeholder="Click here to edit the title (max. 160 characters)." />,
            ...super.render(),
        ];
    }

    onMount() {
        this.doneButton.addClickListener(() => {
            this.createForumThread();
        });
    }

    routeToThread(forumThreadId) {
        // TODO: add the temp forum title
        Router.changeURL(["forum", forumThreadId, "title"])
    }

    createForumThread() {
        let request = {
            forumId: this.options.forumId,
            title: this.titleInput.getValue(),
            message: this.markupEditor.getValue(),
        };

        Ajax.postJSON("/forum/create_forum_thread/", request).then(
            (data) => {
                this.routeToThread(data.forumThreadId);
                this.titleInput.setValue("");
                this.markupEditor.setValue("");
                this.markupEditor.redraw();
                this.hide();
            }
        );
    }
}

@registerStyle(ForumButtonStyle)
class CreateForumThreadButton extends Button {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.button);
    }

    setOptions(options) {
        if (!options.icon) {
            options.label = options.label || UI.T("Preview");
        }
        options.level = options.level || Level.PRIMARY;
        options.size = options.size || Size.LARGE;
        super.setOptions(options);
    }

    getModalClass() {
        return CreateForumThreadModal;
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            this.getModalClass().show({
                forumId: this.options.forumId,
                classMap: ChatMarkupRenderer.classMap,
            });
        });
    }
}

class DeleteForumThreadModal extends ActionModal {
    getTitle() {
        return UI.T("Delete forum thread");
    }

    getActionName() {
        return UI.T("Delete");
    }

    getBody() {
        return <p>
            {UI.T("Are you sure you want to delete thread")}
            {" \"" + this.options.forumThread.title + "\"?"}
        </p>;
    }

    action() {
        this.options.forumThread.deleteThread();
        this.hide();
    }
}

let DeleteForumThreadButton = ActionModalButton(DeleteForumThreadModal);

class ForumThreadReply extends UI.Element {
    extraNodeAttributes(attr) {
        // attr.addClass(forumThreadReplyStyle.mainClass);
    }

    getMessageInstance() {
        return this.options.messageInstance;
    }

    render() {
        let messageInstance = this.getMessageInstance();
        let deleteMessage;
        let editMessage;
        let editAndDeleteButtons = <span/>;

        if (USER.isSuperUser || USER.id === messageInstance.userId) {
            deleteMessage = <DeleteThreadReplyButton
                icon="trash"
                level={Level.DANGER}
                className={forumThreadPanelStyle.deleteButton}
                modalOptions={{messageInstance: messageInstance}} />;
            editMessage = <EditThreadReplyButton
                icon={"pencil"}
                level={Level.INFO}
                messageInstance={messageInstance}
                forumThreadPanel={this}
                className={forumThreadPanelStyle.editButton} />;
            editAndDeleteButtons = <div className={forumThreadPanelStyle.editDeleteButtons} style={{width: "auto",}}>
                {editMessage}
                {deleteMessage}
            </div>;
        }

        return [
            <div className={forumThreadPanelStyle.fullPost}>
                <div className={forumThreadPanelStyle.author}
                    style={{
                        fontSize: "1em",
                        paddingLeft: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}>
                    <UserHandle id={messageInstance.userId} style={{
                        textTransform: "initial",
                        fontSize: "1.1em",
                    }}/>
                    <TimePassedSpan timeStamp={messageInstance.getDate()} style={{
                        color: "#262626 !important",
                        paddingRight: "12px",
                    }}/>
                </div>
                <ChatMarkupRenderer ref={this.refLink("postContent" + messageInstance.id)} value={messageInstance.getContent()} className={forumThreadPanelStyle.message}/>
                <div className={forumThreadPanelStyle.bottomPanel}>
                    {editAndDeleteButtons}
                    <CommentVotingWidgetWithThumbs height={40} balanceColor={"#313534"} notVoteColor={"#313534"} message={messageInstance} className={forumThreadPanelStyle.voting}/>
                </div>
            </div>
        ];
    }

    onMount() {
        this.attachEventListener(this.getMessageInstance(), "messageDelete", () => {
            this.hide();
        });
        this.attachEventListener(this.getMessageInstance(), "messageEdit", () => {
            this.redraw();
        });
    }
}

@registerStyle(ForumThreadPanelStyle)
class ForumThreadPanel extends Panel {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.mainClass);
    }

    returnToMainForum() {
        Router.changeURL(this.getMainForumURL());
    }

    getMainForumURL() {
        return "/forum/";
    }

    getForumThreadState(callback=NOOP_FUNCTION) {
        let request = {
            forumThreadId: this.options.forumThread.id,
        };

        Ajax.postJSON("/forum/forum_thread_state/", request).then(
            callback,
            (error) => {
                this.returnToMainForum();
                ErrorHandlers.showErrorAlert(error);
            }
        );
    }

    getForumThread() {
        return this.options.forumThread;
    }

    getTitle() {
        return [
            <div className={this.styleSheet.title}>
                <Link href={this.getMainForumURL()} className={this.styleSheet.backButton}
                    value={<span className="fa fa-arrow-left" style={{
                        paddingRight: "10px",
                        fontSize: ".8em",
                        color: "#333",
                    }} />} />
                {this.getForumThread().getTitle()}
            </div>
        ];
    }

    getAuthor() {
        return <div className={this.styleSheet.author}>
            {UI.T("written by")}&nbsp;
            <UserHandle id={this.getForumThread().authorId} style={{
                textTransform: "initial",
            }}/>
            &nbsp;
            <TimePassedSpan timeStamp={this.getForumThread().getTimeAdded()} style={{color: "#262626 !important",}}/>
        </div>;
    }

    getMessage() {
        return <div className={this.styleSheet.message}>
                 <ChatMarkupRenderer ref={this.refLink("content")} value={this.getForumThread().getContentMessage().getContent()} style={{height:"auto"}}/>
            </div>;
    }

    getNumReplies(postsLength) {
        return [
            <div className={this.styleSheet.numReplies}>
                <span style={{"font-weight": "bold", }}>{postsLength}</span>
                &nbsp;{"replies in this thread" + (postsLength == 0 ? ", be the first one to comment" : "")}
            </div>
        ];
    }

    getVoting() {
        return <div className={this.styleSheet.voting}>
            <CommentVotingWidgetWithThumbs height={40} balanceColor={"#313534"} notVoteColor={"#313534"} message={this.getForumThread().getContentMessage()} style={{"margin-left": "0", }} />
        </div>;
    }

    render() {
        if (!this.options.forumThread.isLoaded()) {
            this.getForumThreadState(() => {
                this.redraw();
                this.initializeListeners();
            });
            return <ConcentricCirclesLoadingScreen />;
        }

        let replies = [];
        let spaceBetween;
        let forumThread = this.options.forumThread;

        // sort the forum replies by the activity date
        let forumThreadMessages = Array.from(forumThread.getMessageThread().getMessages());
        forumThreadMessages.sort((a, b) => {
            return a.getDate() - b.getDate();
        });

        for (let messageInstance of forumThreadMessages) {
            if (messageInstance !== forumThread.getContentMessage()) {
                replies.push(<ForumThreadReply className={this.styleSheet.replies} messageInstance={messageInstance} />);
            }
        }

        if (replies.length) {
            spaceBetween = <div style={{
                height: "60px",
                borderBottom: "1px solid #ddd",
                width: "90%",
                maxWidth: "1200px",
                margin: "0 auto",
            }}></div>;
        }

        let deleteButton;
        let editButton;
        let editAndDeleteButtons;

        if (USER.isSuperUser || USER.id === this.getForumThread().authorId) {
            deleteButton = <DeleteForumThreadButton icon="trash"
                                                    level={Level.DANGER}
                                                    className={this.styleSheet.deleteButton}
                                                    modalOptions = {{
                                                        forumThread: this.getForumThread()
                                                    }}/>;
            editButton = <EditThreadReplyButton icon="pencil"
                                                level={Level.INFO}
                                                className={this.styleSheet.editButton}
                                                messageInstance={this.getForumThread().getContentMessage()}/>;
            editAndDeleteButtons = <div className={this.styleSheet.editDeleteButtons}>
                {editButton}
                {deleteButton}
            </div>;
        }

        return [
            <div style={{marginBottom: "60px",}}>
                <div className={this.styleSheet.header}>
                    {this.getTitle()}
                    <div className={this.styleSheet.replyButtonDiv}>
                        {this.getAuthor()}
                        <CreateThreadReplyButton
                            label={UI.T("REPLY")}
                            className={this.styleSheet.replyButton}
                            forumThreadId={forumThread.id}
                            forumThread={this.getForumThread()}
                            classMap={ChatMarkupRenderer.classMap}
                        />
                    </div>
                </div>
                <div style={{width: "90%", maxWidth: "1200px", margin: "0 auto", height: "3px", backgroundColor: "#333", marginTop: "10px",}}></div>
                <div className={this.styleSheet.fullPost}>
                    {this.getMessage()}
                    <div className={this.styleSheet.bottomPanel}>
                        {this.getNumReplies(replies.length)}
                        {this.getVoting()}
                    </div>
                    {editAndDeleteButtons}
                </div>
                {spaceBetween}
                {replies}
            </div>
        ];
    }

    deleteThread() {
        this.getForumThread().deleteThread();
    }

    initializeListeners() {
        // These listeners need to be attached after the ForumThread is loaded in the js state
        this.getForumThread().getMessageThread().addListener("newMessage", () => {
            this.redraw();
        });
        this.getForumThread().getMessageThread().addListener("deleteMessage", () => {
            this.redraw();
        });
        this.getForumThread().getContentMessage().addEventListener("messageEdit", () => {
            this.content.setValue(this.getForumThread().getContentMessage().getContent());
            this.content.redraw();
        });
    }

    onMount() {
        // This applies only for a newly created forum thread, since the listeners from
        // render do not get attached when the thread is already in the state.

        if (this.options.forumThread.isLoaded()) {
            this.initializeListeners();
        }

        this.getForumThread().addDeleteListener(() => {
            this.returnToMainForum();
        });
    }
}

export {CreateForumThreadButton, ForumThreadPanel};
