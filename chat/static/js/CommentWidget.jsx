import {UI} from "UI";
import {GlobalState} from "State";
import {GroupChatStore, MessageThreadStore, MessageThread, MessageInstance} from "MessageThreadStore";
import {ChatMessageScrollSection, ChatWidget, PreviewMarkupButton} from "ChatWidget";
import {isDifferentDay, StemDate} from "Time";
import "MarkupRenderer";
import {UserHandle} from "UserHandle";
import {LoginModal} from "LoginModal";
import {CommentVotingWidgetWithThumbs} from "VotingWidget";
import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";
import {BlogStyle} from "BlogStyle";
let blogStyle = BlogStyle.getInstance();

class ThreadMessage extends UI.Panel {
    setOptions(options) {
        super.setOptions(options);
        this.message = options.message;
    }

    render() {
        let messageDate = <UI.TimePassedSpan timeStamp={this.message.getDate()} style={{color: "#666 !important", textTransform: "uppercase", fontSize: ".85em",}} />

        let editButton;
        if (this.message.userId === USER.id || USER.isSuperUser) {
            editButton = <a style={Object.assign({"cursor": "pointer", padding: "0 10px", fontSize: "1.05em", lineHeight: "0px",})} onClick={() => this.toggleEditMode()}>
                edit
            </a>;
        }

        if (!this.contentSwitcher) {
            this.contentSwitcher = <UI.Switcher>
                <UI.MarkupRenderer ref="content" value={this.message.getContent()} />
            </UI.Switcher>;
        }

        let votes = <CommentVotingWidgetWithThumbs height={40} style={{float: "left"}} message={this.message} ref="commentVotingWidget" />;

        return [
            <span style={{float: "right", display: "inline-block", height: "40px", lineHeight: "40px", fontFamily: "lato",}}>{messageDate}</span>,
            <div style={{
                height: "40px",
                lineHeight: "40px",
            }}>
                <div style={{
                    height: "40px",
                    lineHeight: "40px",
                    display: "inline-block",
                    float: "left",
                    fontFamily: "lato",
                    fontSize: ".95em",
                    color: "#333",
                }}>
                    <UserHandle userId={this.message.userId} style={{fontSize: "1.1em",}}/>
                </div>
                {editButton}
            </div>,
            <div style={{
                paddingTop: "5px",
                fontFamily: "lato",
                fontSize: "16px",
            }}>
                {this.contentSwitcher}
            </div>,
            <div style={{
                height: "40px",
            }}>
                {votes}
            </div>,
            <div style={{
                height: "1px",
                width: "100%",
                backgroundColor: "#ddd",
            }}></div>,
        ];
    }

    showEditMode() {
        if (!this.editContent) {
            //TODO: duplicated from ChatWidget.renderMessageBox, refactor to common class (UI.MessageBox)
            let writingSectionStyle = {
                "margin-top": "5px"
            };
            let chatInputStyle = {
                display: "inline-block",
                overflow: "auto",
                resize: "none",
                height: "46px",
                "vertical-align": "top"
            };
            let buttonContainerStyle = {
                display: "inline-block",
                "vertical-align": "top"
            };
            let buttonStyle = {
                "margin-left": "5px"
            };

            this.editContent = <div style={writingSectionStyle}>
                <UI.TextArea ref={this.refLink("messageInput")} style={chatInputStyle} className="form-control"
                             value={this.message.getContent()}/>
                <div style={buttonContainerStyle}>
                    <UI.Button label={UI.T("Cancel")} level={UI.Level.DEFAULT} onClick={() => {this.hideEditMode()}} />
                    <PreviewMarkupButton style={buttonStyle} size={UI.Size.DEFAULT}
                                         getValue={() => {return this.messageInput.getValue();}}
                                         setValue={(value) => {this.messageInput.setValue(value);this.messageInput.node.focus();}}
                    />
                    <UI.Button label={UI.T("Save changes")} style={buttonStyle} level={UI.Level.PRIMARY}
                               onClick={() => this.saveMessageChanges()} />
                </div>
            </div>;
        } else {
            this.messageInput.setValue(this.message.getContent());
        }

        if (!this.contentSwitcher.hasChild(this.editContent)) {
            this.contentSwitcher.appendChild(this.editContent);
        }
        this.contentSwitcher.setActive(this.editContent);
    }

    hideEditMode() {
        this.contentSwitcher.setActive(this.content);
    }

    toggleEditMode() {
        if (this.contentSwitcher.getActive() === this.content) {
            this.showEditMode();
        } else {
            this.hideEditMode();
        }
    }

    saveMessageChanges() {
        let content = this.messageInput.getValue();

        if (content) {
            this.message.edit(content, () => {
                this.hideEditMode();
            });
        }
    }

    onMount() {
        this.message.addListener("edit", () => {
            this.content.setValue(this.message.getContent());
            this.content.redraw();
            this.redraw();
        })
    }
}

class ToggleLogin extends UI.Primitive("span") {
    onMount() {
        super.onMount();
        this.addClickListener(() => {
            LoginModal.show();
            return;
        });
    }
}

class BlogCommentWidget extends ChatWidget(ThreadMessage) {
    renderMessageView() {
        let loadMoreButton;

        let loadMoreButtonStyle = {
            border: "0px",
            fontFamily: "lato",
            color: "#333",
            borderRadius: "0",
            borderBottom: "0",
            backgroundColor: "#eee",
            padding: "5px 10px",
        };

        if (this.showLoadMoreButton) {
            loadMoreButton = (
                <div className="text-center">
                    <UI.AjaxButton ref={this.refLink("loadMoreButton")} level={UI.Level.DEFAULT} onClick={() => {this.loadMoreMessages()}}
                                   style={loadMoreButtonStyle} statusOptions={["Load more messages", {faIcon: "spinner fa-spin", label:" loading messages..."}, "Load more messages", "Failed"]}
                    />
                </div>
            );
        }

        return [
            <ChatMessageScrollSection ref="messageWindow"
                                      entryRenderer={this.options.renderMessage}
                                      entries={this.messageThread.getMessages(true)}
                                      staticTop={loadMoreButton} />
        ];
    }

    renderMessageBox() {
        let writingSectionStyle = {
            height: "auto",
            marginTop: "10px",
        };

        let chatInputStyle = css({
            height: "30px",
            width: "100%",
            // "line-height": "30px",
            "padding-top": "0",
            "padding-bottom": "0",
            "font-size": "14px",
            "border-radius": "0",
            fontFamily: "lato",
            outline: "none",
            paddingLeft: "8px",
            paddingTop: "5px",
            resize: "none",
            transition: ".2s",
            display: "block",
            border: "1px solid #aaa",
        }, focus({
            height: "120px",
            transition: ".2s",
        }), active({
            height: "120px",
            transition: ".2s",
        }));

        let chatInputMax = css({
            height: "120px",
        });

        let previewButtonStyle = { // TODO: This is currently not restyled. We might not want to use it because previewButton is bad practice
            "height": "30px",
            "width": "auto",
            "font-size": "100%",
            "margin-left": "5px",
        };


        return [
            <div ref="writingSection" style={writingSectionStyle}>
                <UI.TextArea readOnly={this.messageThread.muted}
                             ref="chatInput"
                             onChange={() => {
                                 if (this.chatInput.getValue()) {
                                     this.chatInput.addClass(chatInputMax);
                                 } else {
                                     this.chatInput.removeClass(chatInputMax);
                                 }
                             }}
                             className={chatInputStyle}
                             placeholder="Leave a comment..."/>
                <UI.Button disabled={this.messageThread.muted}
                           label="SUBMIT"
                           ref="sendMessageButton"
                           className={blogStyle.sendMessageButtonStyle}
                           level={UI.Level.PRIMARY}
                           onClick={() => this.sendMessage()} />
                {/*{this.messageThread.hasMarkupEnabled() ?
                        <PreviewMarkupButton disabled={this.messageThread.muted} ref="markupButton" style={previewButtonStyle}
                                         getValue={() => {return this.chatInput.getValue();}}
                                         setValue={(value) => {this.chatInput.setValue(value);this.chatInput.node.focus();}}
                        /> : null}*/ /* UNCOMMENT THIS !! */}
            </div>
        ];
    }

    render() {
        return [
            this.renderMessageBox(),
            this.renderMessageView(),
        ];
    }

    createVirtualMessage(request, message) {
        return null;
    }
}

class CommentWidget extends BlogCommentWidget {
    setOptions(options) {
        super.setOptions(options);

        // TODO: remove old message thread, if any
        this.messageThread = options.messageThread;
        this.key = this.messageThread.id;

        this.options.baseRequest = {
            chatId: this.options.chatId,
        };
        this.options.dateTimestamps = false;
    }

    getPostURL() {
        return "/chat/group_chat_post/";
    }

    renderMessageBox() {
        if (USER.isAuthenticated) {
            return super.renderMessageBox();
        } else {
            return <div style={{
                fontFamily: "lato",
                color: "#333",
                paddingTop: "5px",
                paddingBottom: "5px",
            }}>You need to&nbsp;
                <ToggleLogin style={{
                    fontFamily: "lato",
                    backgroundColor: "#eee",
                    cursor: "pointer",
                    padding: "5px 10px",
                }}>
                    login
                </ToggleLogin>
                &nbsp;to send a comment.</div>;
        }
    }

    render() {
        let commentsCount = this.messageThread.getMessages().length;
        let commentsTitle;

        commentsTitle = <div className={blogStyle.commentsTitle}>
            {commentsCount} {commentsCount != 1 ? "comments" : "comment"}
        </div>;

        return [commentsTitle, super.render()];
    }

    onMount() {
        super.onMount();
        this.messageThread.addListener("newMessage", () => {
            this.redraw();
        });
    }
}

class AsyncCommentThread extends UI.Element {
    getMessageThread() {
        let groupChat = GroupChatStore.get(this.options.chatId);
        return groupChat && groupChat.getMessageThread();
    }

    render() {
        let messageThread = this.getMessageThread();
        let commentWidgetOptions = {
            marginBottom: "10px",
            paddingBottom: "10px",
            height: "auto",
            width: "100%",
            marginTop: "50px",
            marginLeft: "0px",
            marginRight: "0px",
            border: "0px",
            maxWidth: "900px"
        };

        if (messageThread) {
            return [<CommentWidget ref="commentsSection" chatId={this.options.chatId} messageThread={messageThread}
                                   style={commentWidgetOptions} />];
        } else {
            GroupChatStore.fetch(this.options.chatId, (groupChat) => {
                this.redraw();
            });
            return [
                <div style={{
                    width: "100%",
                    height: "60px",
                    lineHeight: "60px",
                    fontFamily: "lato",
                    fontSize: "1em",
                    textAlign: "center",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                }}>
                    <span className="fa fa-spinner fa-spin" style={{
                        padding: "0 8px",
                    }}/>
                    Comments loading...
                </div>
            ];
        }
    }
}

export {CommentWidget, AsyncCommentThread};
