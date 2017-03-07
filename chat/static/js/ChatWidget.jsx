import {Ajax} from "Ajax";
import {UI} from "UI";
import {GlobalState} from "State";
import {MessageThreadStore, MessageThread, MessageInstance, MessageInstanceStore, GroupChatStore} from "MessageThreadStore";
import {LoginModal} from "LoginModal";
import {UserHandle} from "UserHandle";
import {MarkupEditorModal} from "MarkupEditorModal";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {CommentVotingWidgetWithThumbs} from "VotingWidget";
import {RunOnce} from "Dispatcher";
import {isDifferentDay} from "Time";
import {css, hover, focus, active} from "Style";
import {StemDate} from "Time";
import {FAIcon} from "FontAwesome";
import {ChatStyle} from "ChatStyle";

let chatStyle = ChatStyle.getInstance();

class PreviewMarkupButton extends UI.Button {
    setOptions(options) {
        if (!options.faIcon) {
            options.label = options.label || UI.T("Preview");
        }
        options.level = options.level || UI.Level.PRIMARY;
        options.size = options.size || UI.Size.LARGE;
        super.setOptions(options);
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            if (!this.markupEditorModal) {
                this.markupEditorModal = <MarkupEditorModal
                    classMap={ChatMarkupRenderer.classMap}
                    showCallback={() => {this.markupEditorModal.markupEditor.setValue(this.options.getValue());
                                         /*this.markupEditorModal.markupEditor.codeEditor.getAce().focus();*/}}
                    hideCallback={() => {this.options.setValue(this.markupEditorModal.markupEditor.getValue());}}
                />;
                this.markupEditorModal.mount(document.body);
            }
            this.markupEditorModal.show();
        });
    }
}

//TODO(@all) Find a way to remove margin from p elements.

class GroupChatMessage extends UI.Panel {
    setOptions(options) {
        super.setOptions(options);
        this.message = options.message;
        if (this.message.hasTemporaryId()) {
            // TODO: this can also happen when editing a message, another case for later
            this.message.addListener("postError", (postError) => {
                this.redraw();
            });
            this.message.addListener("updateId", () => {
                // TODO: we might need to updated our position here
                this.options.key = this.message.id;
            })
        }
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass(chatStyle.groupChatMessage);
        // attr.setStyle("margin", "1.5rem");
        return attr;
    }

    shouldShowDayTimestamp() {
        let lastMessage = this.options.message.getPreviousMessage();
        return !lastMessage || isDifferentDay(lastMessage.timeAdded, this.options.message.timeAdded);
    }

    render() {
        let editButton;
        //if (this.message.userId === USER.id || USER.isSuperUser) {
        if (USER.isSuperUser) {
            editButton = <a style={Object.assign({"cursor": "pointer"}, chatStyle.timestamp)} onClick={() => this.toggleEditMode()}>Edit</a>;
        }

        if (!this.contentSwitcher) {
            this.contentSwitcher = <UI.Switcher>
                <span ref="contentContainer" style={{"white-space": "pre-line"}}>
                    {this.message.hasMarkupEnabled() ?
                        <ChatMarkupRenderer ref={this.refLink("content")} value={this.message.getContent()}
                                           style={{height:"auto"}} /> :
                        <UI.TextElement ref="content" value={this.message.getContent()}/>
                    }
                </span>
            </UI.Switcher>;
        }

        let date = null;
        if (this.shouldShowDayTimestamp()) {
            date = <div className={chatStyle.messageTimeStampHr}>
                <div ref="dayTimestamp" className={chatStyle.messageTimeStamp}>
                    {StemDate.unix(this.message.timeAdded).format("dddd, MMMM Do")}
                </div>
            </div>;
        }

        let errorElement = null;
        if (this.message.postError) {
            errorElement = <span ref="errorArea" style={{marginLeft: "1rem"}} className="fa fa-warning"
                                 HTMLTitle={"Error: " + this.message.postError}/>;
        }

        return [
            date,
            <div className={chatStyle.comment}>
                <UserHandle userId={this.message.userId}/>
                <span className={chatStyle.timestamp}>{this.message.getTimeOfDay()}</span>
                {editButton}
                {errorElement}
                <div className={chatStyle.commentContent}>
                    {this.contentSwitcher}
                </div>
            </div>
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
            let buttonStyle = {
                "margin-left": "5px"
            };

            this.editContent = <div style={writingSectionStyle}>
                <UI.TextArea ref={this.refLink("messageInput")} style={chatInputStyle} className="form-control"
                             value={this.message.getContent()}/>
                <div>
                    <UI.Button label={UI.T("Cancel")} level={UI.Level.DEFAULT} onClick={() => {this.hideEditMode()}} />
                    <PreviewMarkupButton style={buttonStyle} size={UI.Size.DEFAULT}
                                         getValue={() => {return this.messageInput.getValue();}}
                                         setValue={(value) => {this.messageInput.setValue(value);this.messageInput.node.focus();}}
                    />
                    <UI.Button label={UI.T("Save changes")} style={buttonStyle} level={UI.Level.PRIMARY}
                               onClick={() => this.saveMessageChanges()} />
                    <UI.Button level={UI.Level.DANGER} label={UI.T("Delete")} onClick={() => this.deleteMessage()} className="pull-right"/>
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
        this.contentSwitcher.setActive(this.contentContainer);
    }

    toggleEditMode() {
        if (this.contentSwitcher.getActive() === this.contentContainer) {
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

    deleteMessage() {
        this.message.deleteMessage();
    }

    onMount() {
        this.message.addListener("edit", () => {
            this.content.setValue(this.message.getContent());
            this.content.redraw();
            this.redraw();
        });

        this.message.addListener("delete", () => {
            // TODO: refactor this, should delete message, not hide
            this.hide();
        });
    }
}

class PrivateChatMessage extends UI.Panel {
    setOptions(options) {
        super.setOptions(options);
        this.message = options.message;
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        if (this.message.userId === USER.id) {
            attr.addClass("ownMessage");
        }
        attr.addClass("chatMessageDiv");
        return attr;
    }

    render() {
        let userTag;
        //if (this.message.userId !== USER.id) {
            // TODO(@gem): Fix popup position (place popup node in the same node as trigger.node)
            userTag = <div>
                <UserHandle userId={this.message.userId} noPopup/>
                <span className="chatMessageTimestamp">{this.message.getTimeOfDay()}</span>
            </div>;
        //}
        return [
            <div className="chatBubble">
                {this.message}
                {userTag}
                <span className="messageText" style={{"white-space": "pre-line"}}>
                    {this.message.hasMarkupEnabled() ? <ChatMarkupRenderer value={this.message.getContent()}
                                   style={{height:"auto", overflow: "auto"}} /> : this.message.getContent()}
                </span>
            </div>
        ];
    }
}

class ChatMessageScrollSection extends UI.InfiniteScrollable {
    setOptions(options) {
        options = Object.assign({
            entryComparator: (a, b) => {
                return a.getNormalizedId() - b.getNormalizedId();
            }
        }, options);
        super.setOptions(options);
    }
}

let ChatWidget = (ChatMessageClass, enterToSend=true) => {
    return class ChatWidget extends UI.Panel {
        setOptions(options) {
            super.setOptions(options);

            this.options.renderMessage = (messageInstance) => {
                return <ChatMessageClass key={messageInstance.getNormalizedId()} message={messageInstance} />
            };

            // TODO: we may not want this as default
            if (options.dateTimestamps == null) {
                options.dateTimestamps = true;
            }

            this.messageThread = options.messageThread;

            // TODO: this is a shitty way of knowing if there are more messages!
            if (this.messageThread.getNumMessages() >= 20) {
                this.showLoadMoreButton = true;
            }

            this.messageThread.addUpdateListener((event) => {
                if (event.type === "muted") {
                    this.redraw();
                }
            });

            this.messageThread.addListener("newMessage", (event) => {
                //console.log("Received chat message: ", event);
                let messageInstance = MessageInstanceStore.get(event.data.id);

                // We calculate before adding new message
                let messageWindowScrollTop = this.messageWindow.node.scrollTop;
                let messageWindowscrollMax = this.messageWindow.node.scrollHeight - this.messageWindow.node.offsetHeight;

                this.messageWindow.insertEntry(messageInstance);

                // If we were at the bottom before message was appended, scroll automatically
                if (messageWindowScrollTop + 20 > messageWindowscrollMax) {
                    setTimeout(() => {
                        this.messageWindow.scrollToBottom();
                    }, 0);
                }

            });
        }

        canOverwrite() {
            return false;
        }

        sendMessage(message) {
            if (!USER.isAuthenticated) {
                LoginModal.show();
                return;
            }
            let request = Object.assign({}, this.options.baseRequest || {});

            message = message || this.chatInput.getValue();
            message = message.trim();

            if (!message) {
                return;
            }
            request.message = message;

            // Create a virtual message to be drawn temporarily
            let virtualMessageInstance = null;

            // TODO: this should not depend on enterToSend!
            if (enterToSend) {
                let virtualId = this.messageThread.getMaxMessageId() + "-" + MessageInstanceStore.generateVirtualId() + "-" + Math.random();
                virtualMessageInstance = MessageInstanceStore.createVirtualMessageInstance(message, this.messageThread, virtualId);
                request.virtualId = virtualId;
            }

            let onSuccess = (data) => {
                if (data.error) {
                    virtualMessageInstance.setPostError(data.error);
                    return;
                }
                if (virtualMessageInstance && virtualMessageInstance.hasTemporaryId()) {
                    MessageInstanceStore.applyUpdateObjectId(virtualMessageInstance, data.messageId);
                    GlobalState.importState(data.state);
                }
            };

            let onError = (xhr, errmsg, err) => {
                if (virtualMessageInstance) {
                    virtualMessageInstance.setPostError(42);
                }
                console.log("Error in sending chat message:\n" + xhr.status + ":\n" + xhr.responseText);
            };

            this.messageWindow.scrollToBottom();

            this.chatInput.setValue("");

            Ajax.request({
                url: this.getPostURL(),
                type: "POST",
                dataType: "json",
                data: request,
                success: onSuccess,
                error: onError
            });
        }

        saveScrollPosition() {
            this.scrollPosition = this.messageWindow.node.scrollTop;
            this.scrollPercent = this.scrollPosition / (this.messageWindow.node.scrollHeight - this.messageWindow.node.clientHeight);
        }

        applyScrollPosition() {
            this.messageWindow.node.scrollTop = this.scrollPosition || this.messageWindow.node.scrollHeight;
            this.chatInput.node.focus();
        }

        onMount() {
            super.onMount();

            if (enterToSend) {
                this.messageWindow.node.scrollTop = this.messageWindow.node.scrollHeight;

                this.chatInput.addNodeListener("keydown", (event) => {
                    if (!(event.shiftKey || event.ctrlKey) && (event.key === "Enter" || event.keyCode === 13)) {
                        this.sendMessage();
                        event.preventDefault();
                    }
                });
            }

            this.messageWindow.addNodeListener("scroll", () => {
                let scrollTop = this.messageWindow.node.scrollTop;
                if (scrollTop < 20) {
                    this.loadMoreMessages();
                }
                // TODO: Remove this is you want "load more messages" ... although right now it does not work
            });

            this.addListener("hide", () => {this.saveScrollPosition();});
            this.addListener("show", () => {this.applyScrollPosition();});

            window.addEventListener("resize", () => {
                this.saveScrollPosition();
                this.setAdaptiveHeight();
            });

            this.addListener("resize", () => {
                this.setAdaptiveHeight();
                this.messageWindow.node.scrollTop = this.scrollPercent * (this.messageWindow.node.scrollHeight - this.messageWindow.node.clientHeight);
            });
        }

        getDesiredHeight() {
            if (this.options.style && this.options.style.height) {
                return this.options.style.height;
            }
            let viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            let navbarHeight = document.getElementById("navbar").offsetHeight; // use offsetHeight to accommodate padding and margin

            let availableHeight = viewportHeight - navbarHeight - (this.options.extraHeightOffset || 25);
            return Math.max(availableHeight || 0, 100) + "px"; // it needs at least 100px
        }

        setAdaptiveHeight() {
            // TODO: duplicated code from ContestWidget.ContestTaskSwitcher
            if (!this.domAttributes) return;

            this.setStyle("height", this.getDesiredHeight());
        }

        getNodeAttributes() {
            let attr = super.getNodeAttributes();
            attr.addClass("auto-height-parent");
            //attr.setStyle("border", "1px solid #ccc");
            return attr;
        }

        setHeight(height) {
            this.setStyle("height", height);
        }

        renderMessageView() {
            let loadMoreButton;


            if (this.showLoadMoreButton) {
                loadMoreButton = (
                    <div className="text-center">
                        <UI.AjaxButton ref={this.refLink("loadMoreButton")} level={UI.Level.DEFAULT} onClick={() => {this.loadMoreMessages()}}
                                       style={chatStyle.loadMoreButton} statusOptions={["Load more messages", {faIcon: "spinner fa-spin", label:" loading messages..."}, "Load more messages", "Failed"]}
                        />
                    </div>
                );
            }

            return [
                <ChatMessageScrollSection className={chatStyle.renderMessageView}
                                          ref="messageWindow"
                                          entryRenderer={this.options.renderMessage}
                                          entries={this.messageThread.getMessages()}
                                          staticTop={loadMoreButton} />
            ];
        }

        loadMoreMessages() {
            // TODO: wrap this in something
            if (this.outstandingRequest) {
                return;
            }
            this.outstandingRequest = true;

            let messageInstances = this.messageThread.getMessages();
            let lastMessageId = 999999999;
            if (messageInstances.length) {
                lastMessageId = messageInstances[0].id;
            }

            let request = Object.assign({
                lastMessageId: lastMessageId
            }, this.options.baseRequest || {});

            if (this.loadMoreButton) {
                this.loadMoreButton.ajaxCall({
                    url: this.getGetURL(),
                    type: "GET",
                    dataType: "json",
                    data: request,
                    success: (data) => {
                        if (data.state.MessageInstance.length < 50) {
                            if (this.loadMoreButton) {
                                this.loadMoreButton.hide();
                            }
                            this.showLoadMoreButton = false;
                        }
                        let scrollPosition = this.messageWindow.getExcessTop();
                        let oldHeight = this.messageWindow.node.scrollHeight;
                        GlobalState.importState(data.state);
                        this.messageWindow.scrollToHeight(scrollPosition + this.messageWindow.node.scrollHeight - oldHeight);
                        // debugger;
                        this.outstandingRequest = false;
                    },
                    error: (xhr, errmsg, err) => {
                        console.log("Error loading more messages:\n" + xhr.status + ":\n" + xhr.responseText);
                    },
                    complete: () => {
                        //TODO(@Rocky): find out why this doesn't work
                        this.outstandingRequest = false;
                    }
                });
            }
        }

        renderMessageBox() {
            return <div ref="writingSection" className={chatStyle.renderMessage}>
                <UI.TextArea readOnly={this.messageThread.muted} 
                             ref="chatInput"
                             placeholder="Type a message..."
                             className={chatStyle.chatInput} />
                <UI.Button ref="sendMessageButton"
                           faIcon="paper-plane"
                           disabled={this.messageThread.muted} 
                           level={UI.Level.PRIMARY}
                           onClick={() => this.sendMessage()}
                           className={chatStyle.sendMessageButton} />
            </div>;
        }

        renderStatus() {
            if (this.messageThread.muted) {
                return [
                    <h4 style={{color: "red", textAlign: "center"}}>This chat is currently turned off.</h4>
                ];
            } else {
                if (USER.isSuperUser) {
                    let userData = [];
                    for (let userId of this.messageThread.online) {
                        userData.push([
                            <UserHandle id={parseInt(userId)}/>
                        ]);
                    }
                    return userData;
                }
            }
        }

        render() {
            return [
                this.renderMessageView(),
                this.renderMessageBox(),
            ];
        }
    }
};

class GroupChatWidget extends ChatWidget(GroupChatMessage) {
    setOptions(options) {
        if (!options.messageThread) {
            let chat = GroupChatStore.get(this.options.chatId);
            options.messageThread = MessageThreadStore.get(chat.messageThreadId);
        }
        super.setOptions(options);
        this.options.baseRequest = {
            chatId: this.options.chatId,
        };
    }

    getPostURL() {
        return "/chat/group_chat_post/";
    }

    getGetURL() {
        return "/chat/group_chat_state/";
    }
}

class PrivateChatWidget extends ChatWidget(PrivateChatMessage) {
    setOptions(options) {
        options = Object.assign({
            messageThread: options.privateChat.getMessageThread(),
            baseRequest: {
                privateChatId: options.privateChat.id
            }
        }, options);
        super.setOptions(options);
    }

    setPrivateChat(privateChat) {
        this.options.privateChat = privateChat;
        this.setOptions(this.options);
    }

    getPostURL() {
        return "/chat/private_chat_post/";
    }

    getGetURL() {
        return "/chat/private_chat_state/";
    }
}

class VotableChatMessage extends GroupChatMessage {
    render() {
        let result = super.render();
        result[1].options.children.push(<CommentVotingWidgetWithThumbs style={{display: "inline-block"}} message={this.options.message} />);
        return result;
    }
}

class VotableGroupChatWidget extends ChatWidget(VotableChatMessage) {
    setOptions(options) {
        options.messageThread = options.messageThread || MessageThreadStore.get(GroupChatStore.get(options.chatId).messageThreadId);
        super.setOptions(options);
        this.options.baseRequest = {
            chatId: this.options.chatId,
        };
    }

    getPostURL() {
        return "/chat/group_chat_post/";
    }

    getGetURL() {
        return "/chat/group_chat_state/";
    }
}

export {ChatWidget, ChatMessageScrollSection,
    GroupChatWidget, PrivateChatWidget, VotableGroupChatWidget,
    GroupChatMessage, PrivateChatMessage, VotableChatMessage,
    PreviewMarkupButton};
