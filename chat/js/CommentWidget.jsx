import {UI, TimePassedSpan, Switcher, AjaxButton, TextArea, Button, registerStyle} from "UI";
import {GlobalState} from "State";
import {GroupChatStore, MessageThreadStore, MessageThread, MessageInstance} from "MessageThreadStore";
import {ChatMessageScrollSection, ChatWidget, EditableMessage} from "ChatWidget";
import {isDifferentDay, StemDate} from "Time";
import {UserHandle} from "UserHandle";
import {LoginModal} from "LoginModal";
import {CommentVotingWidgetWithThumbs} from "VotingWidget";
import {BlogStyle} from "BlogStyle";
import {Level} from "ui/Constants";
import {MarkupRenderer} from "MarkupRenderer";
import {CommentWidgetStyle} from "./CommentWidgetStyle";


class ThreadMessage extends EditableMessage {
    getDefaultOptions() {
        return Object.assign({}, super.getDefaultOptions(), {
            deletable: false,
        });
    }

    render() {
        let messageDate = <TimePassedSpan timeStamp={this.message.getDate()} style={{color: "#666 !important", textTransform: "uppercase", fontSize: ".85em",}} />

        let editButton;
        if (this.message.userId === USER.id || USER.isSuperUser) {
            editButton = <a style={Object.assign({"cursor": "pointer", padding: "0 10px", fontSize: "1.05em", lineHeight: "0px",})} onClick={() => this.toggleEditMode()}>
                edit
            </a>;
        }

        if (!this.contentSwitcher) {
            this.contentSwitcher = <Switcher>
                <div ref="contentContainer">
                    <MarkupRenderer ref="content" value={this.message.getContent()} />
                </div>
            </Switcher>;
        }

        let votes = <CommentVotingWidgetWithThumbs height={40} style={{float: "left"}} message={this.message} ref="commentVotingWidget" />;

        return [
            <span style={{float: "right", display: "inline-block", height: "40px", lineHeight: "40px",}}>{messageDate}</span>,
            <div style={{
                height: "40px",
                lineHeight: "40px",
            }}>
                <div style={{
                    height: "40px",
                    lineHeight: "40px",
                    display: "inline-block",
                    float: "left",
                    fontSize: ".95em",
                    color: "#333",
                }}>
                    <UserHandle userId={this.message.userId} style={{fontSize: "1.1em",}}/>
                </div>
                {editButton}
            </div>,
            <div style={{
                paddingTop: "5px",
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


@registerStyle(BlogStyle)
class BlogCommentWidget extends ChatWidget(ThreadMessage) {
    getDefaultOptions() {
        return Object.assign({}, super.getDefaultOptions(), {
            entryComparator: (a, b) => {
                return b.getNormalizedId() - a.getNormalizedId();
            }
        })
    }

    get commentWidgetStyle() {
        return CommentWidgetStyle.getInstance();
    }

    renderMessageView() {
        let loadMoreButton;

        if (this.showLoadMoreButton) {
            loadMoreButton = (
                <div className="text-center">
                    <AjaxButton ref={this.refLink("loadMoreButton")} level={Level.DEFAULT} onClick={() => {this.loadMoreMessages()}}
                                style={this.commentWidgetStyle.loadMoreButton} statusOptions={["Load more messages", {faIcon: "spinner fa-spin", label:" loading messages..."}, "Load more messages", "Failed"]}
                    />
                </div>
            );
        }

        return [
            <ChatMessageScrollSection ref="messageWindow"
                                      entryRenderer={this.options.renderMessage}
                                      entries={this.messageThread.getMessages(true)}
                                      entryComparator={this.options.entryComparator}
                                      staticTop={loadMoreButton} />
        ];
    }

    renderMessageBox() {
        return [
            <div ref="writingSection" style={this.commentWidgetStyle.writingSectionStyle}>
                <TextArea readOnly={this.messageThread.muted}
                          ref="chatInput"
                          onChange={() => {
                              if (this.chatInput.getValue()) {
                                  this.chatInput.addClass(this.commentWidgetStyle.chatInputMax);
                              } else {
                                  this.chatInput.removeClass(this.commentWidgetStyle.chatInputMax);
                              }
                          }}
                          className={this.commentWidgetStyle.chatInputStyle}
                          placeholder="Leave a comment..."/>
                <Button disabled={this.messageThread.muted}
                           label="SUBMIT"
                           ref="sendMessageButton"
                           className={this.styleSheet.sendMessageButtonStyle}
                           level={Level.PRIMARY}
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

    getDefaultPlugins() {
        return CommentWidget.defaultPlugins || [];
    }

    createVirtualMessage(request, message) {
        return null;
    }
}

@registerStyle(BlogStyle)
class CommentWidget extends BlogCommentWidget {
    setOptions(options) {
        super.setOptions(options);

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
                color: "#333",
                paddingTop: "5px",
                paddingBottom: "5px",
            }}>You need to&nbsp;
                <ToggleLogin style={{
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

        commentsTitle = <div className={this.styleSheet.commentsTitle}>
            {commentsCount} {commentsCount != 1 ? "comments" : "comment"}
        </div>;

        return [commentsTitle, super.render()];
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
