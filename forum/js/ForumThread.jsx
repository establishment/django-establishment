import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {
    ActionModal,
    ActionModalButton,
    Button,
    Input,
    Link,
    Panel,
    Router,
    TimePassedSpan,
    UI,
    registerStyle,
} from "UI";
import {ConcentricCirclesLoadingScreen} from "ui/ConcentricCirclesLoadingScreen";
import {MarkupEditorModal} from "markup/MarkupEditorModal";
import {LoginModal} from "LoginModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {UserHandle} from "UserHandle";
import {EditThreadReplyButton} from "EditThreadReplyButton";
import {DeleteThreadReplyButton} from "DeleteThreadReplyButton";
import {CreateThreadReplyButton} from "CreateThreadReplyButton";
import {CommentVotingWidgetWithThumbs} from "VotingWidget";
import {ErrorHandlers} from "ErrorHandlers";
import {ForumThreadPanelStyle, ForumThreadReplyStyle} from "ForumStyle";
import {ButtonStyle} from "ForumStyle";
import {Level, Size} from "ui/Constants";
import {NOOP_FUNCTION} from "Utils";

let forumThreadPanelStyle = ForumThreadPanelStyle.getInstance();
let buttonStyle = ButtonStyle.getInstance();


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

@registerStyle(ButtonStyle)
class CreateForumThreadButton extends Button {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.button);
    }

    setOptions(options) {
        if (!options.faIcon) {
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
                faIcon="trash"
                level={Level.DANGER}
                className={forumThreadPanelStyle.deleteButton}
                modalOptions={{messageInstance: messageInstance}} />;
            editMessage = <EditThreadReplyButton
                faIcon={"pencil"}
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
            deleteButton = <DeleteForumThreadButton faIcon="trash"
                                                    level={Level.DANGER}
                                                    className={this.styleSheet.deleteButton}
                                                    modalOptions = {{
                                                        forumThread: this.getForumThread()
                                                    }}/>;
            editButton = <EditThreadReplyButton faIcon="pencil"
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
                            size={Size.DEFAULT}
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
