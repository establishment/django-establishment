import {type Constructor} from "../../../stemjs/base/Utils";
import {type ChatPlugin} from "./ChatPlugin";
import {UI, type ExtendedOptions, type ElementOptions, type UIElement, type TextUIElement, type BaseUIElement, type NodeAttributes} from "../../../stemjs/ui/UIBase";
import {Switcher} from "../../../stemjs/ui/Switcher";
import {TextArea} from "../../../stemjs/ui/input/Input";
import {Button} from "../../../stemjs/ui/button/Button";
import {ButtonGroup} from "../../../stemjs/ui/button/ButtonGroup";
import {InfiniteScrollable} from "../../../stemjs/ui/misc/Scrollable";
import {registerStyle} from "../../../stemjs/ui/style/Theme";
import {Level, Size} from "../../../stemjs/ui/Constants";
import {Ajax} from "../../../stemjs/base/Ajax";
import {Pluginable} from "../../../stemjs/base/Plugin";
import {GlobalState, type StoreEvent, type StoreId} from "../../../stemjs/state/State";
import {StemDate, TimeUnit} from "../../../stemjs/time/Time";
import {AjaxButton} from "../../../stemjs/ui/button/AjaxButton";
import {ButtonStyle} from "../../../stemjs/ui/button/ButtonStyle";
import {InputStyle} from "../../../stemjs/ui/input/Style";

import {MessageThread, MessageInstance} from "./state/MessageThreadStore";
import {GroupChat, type PrivateChat} from "./state/ChatStore";
import {MarkupEditorModal} from "../../content/js/markup/MarkupEditorModal";
import {UserHandle} from "../../../csaaccounts/js/UserHandle";
import {ChatMarkupRenderer} from "./ChatMarkupRenderer";
import {CommentVotingWidgetWithThumbs} from "./VotingWidget";
import {LoginModal} from "../../accounts/js/LoginModal";
import {ChatStyle} from "./ChatStyle";

ButtonStyle.getInstance().ensureFirstUpdate();
InputStyle.getInstance().ensureFirstUpdate();

export interface PreviewMarkupButtonOptions {
    getValue?: () => string;
    setValue?: (value: string) => void;
}

class PreviewMarkupButton extends Button {
    declare options: ExtendedOptions<Button, PreviewMarkupButtonOptions>;

    setOptions(options: typeof this.options) {
        if (!options.icon) {
            options.label = options.label || UI.T("Preview");
        }
        super.setOptions(options);
    }

    onMount() {
        super.onMount();
        this.addClickListener(() => {
            MarkupEditorModal.show({
                classMap: ChatMarkupRenderer.classMap,
                showCallback: (modal: MarkupEditorModal) => {modal.markupEditor.setValue(this.options.getValue());
                                          modal.markupEditor.codeEditor.focus();},
                hideCallback: (modal: MarkupEditorModal) => {this.options.setValue(modal.markupEditor.getValue());}
            });
        });
    }
}

export interface EditableMessageOptions {
    deletable?: boolean;
    message?: MessageInstance;
}

class EditableMessage extends UI.Element {
    declare messageInput: TextArea;

    declare options: ElementOptions<EditableMessageOptions>;
    declare content: TextUIElement;
    declare contentContainer: UIElement;
    declare contentSwitcher: Switcher;
    declare editContent: UIElement;
    declare message: MessageInstance;

    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            deletable: true,
        };
    }

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.message = options.message;
    }

    render() {
        return [<Button ref="editButton" onClick={() => this.toggleEditMode()}>{UI.T("Edit")}</Button>,
            <Switcher ref="contentSwitcher">
                <span ref="contentContainer" style={{whiteSpace: "pre-line"}}>
                    {this.message.hasMarkupEnabled() ?
                        <ChatMarkupRenderer ref={this.refLink("content")} value={this.message.getContent()}
                                           style={{height:"auto"}} /> :
                        <UI.TextElement ref="content" value={this.message.getContent()}/>
                    }
                </span>
            </Switcher>
        ];
    }

    showEditMode() {
        if (!this.editContent) {
            let writingSectionStyle = {
                marginTop: "5px"
            };
            let chatInputStyle = {
                overflow: "auto",
                height: "60px",
                width: "100%",
            };

            this.editContent = <div style={writingSectionStyle}>
                <TextArea ref={this.refLink("messageInput")} style={chatInputStyle} className="form-control"
                             value={this.message.getContent()}/>
                <ButtonGroup>
                    <Button label={UI.T("Cancel")} size={Size.SMALL}
                               onClick={() => {this.hideEditMode()}} />
                    <PreviewMarkupButton size={Size.SMALL}
                                         getValue={() => {return this.messageInput.getValue();}}
                                         setValue={(value) => {this.messageInput.setValue(value);this.messageInput.node.focus();}}
                    />
                    <Button label={UI.T("Save changes")} level={Level.PRIMARY}
                               onClick={() => this.saveMessageChanges()} size={Size.SMALL} />
                    {this.options.deletable ? <Button level={Level.DANGER} label={UI.T("Delete")} size={Size.SMALL}
                                                         onClick={() => this.deleteMessage()}/> : ""}
                </ButtonGroup>
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
        if (this.options.deletable) {
            this.message.deleteMessage();
        }
    }

    onMount() {
        this.message.addListener("edit", () => {
            this.content.setValue(this.message.getContent());
            this.redraw();
        });

        this.message.addListener("delete", () => {
            // TODO: refactor this, should delete message, not hide
            this.hide();
        });
    }
}


export interface GroupChatMessageOptions {
    message?: MessageInstance;
}

@registerStyle(ChatStyle)
class GroupChatMessage extends EditableMessage {
    declare options: ExtendedOptions<EditableMessage, GroupChatMessageOptions>;
    declare message: MessageInstance;

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        if (this.message.hasTemporaryId()) {
            // TODO: this can also happen when editing a message, another case for later
            this.message.addListener("postError", () => {
                this.redraw();
            });
            this.message.addListener("updateId", () => {
                // TODO: we might need to updated our position here
                this.options.key = this.message.id;
            })
        }
    }

    extraNodeAttributes(attr: NodeAttributes) {
        attr.addClass(this.styleSheet.groupChatMessage);
    }

    shouldShowDayTimestamp() {
        let lastMessage = this.options.message.getPreviousMessage();
        return !lastMessage || new StemDate(lastMessage.timeAdded).isSame(this.options.message.timeAdded, TimeUnit.DAY);
    }

    render() {
        let editButton;
        if (this.message.userId === USER.id || USER.isSuperUser) {
        // if (USER.isSuperUser) {
            editButton = <a style={Object.assign({cursor: "pointer"}, this.styleSheet.timestamp)}
                            onClick={() => this.toggleEditMode()}>{UI.T("Edit")}</a>;
        }

        if (!this.contentSwitcher) {
            this.contentSwitcher = <Switcher>
                <span ref="contentContainer" style={{whiteSpace: "pre-line"}}>
                    {this.message.hasMarkupEnabled() ?
                        <ChatMarkupRenderer ref={this.refLink("content")} value={this.message.getContent()}
                                           style={{height:"auto"}} /> :
                        <UI.TextElement ref="content" value={this.message.getContent()}/>
                    }
                </span>
            </Switcher>;
        }

        let date = null;
        if (this.shouldShowDayTimestamp()) {
            date = <div ref="dayTimestamp" className={this.styleSheet.messageTimeStampHr}>
                <div className={this.styleSheet.messageTimeStamp}>
                    {StemDate.unix(this.message.timeAdded).format("dddd, MMMM Do")}
                </div>
            </div>;
        }

        let errorElement = null;
        if (this.message.postError) {
            errorElement = <span ref="errorArea" style={{marginLeft: "1rem"}} className="fa fa-warning"
                                 domTitle={"Error: " + this.message.postError}/>;
        }

        return [
            date,
            <div className={this.styleSheet.comment}>
                <UserHandle userId={this.message.userId} className={this.styleSheet.userHandle} />
                <span className={this.styleSheet.timestamp}>{this.message.getTimeOfDay()}</span>
                {editButton}
                {errorElement}
                <div className={this.styleSheet.commentContent}>
                    {this.contentSwitcher}
                </div>
            </div>
        ];
    }
}


export interface PrivateChatMessageOptions {
    message?: MessageInstance;
}

@registerStyle(ChatStyle)
class PrivateChatMessage extends UI.Element {
    declare options: ElementOptions<PrivateChatMessageOptions>;
    declare contentSwitcher: Switcher;
    declare message: MessageInstance;

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.message = options.message;
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass(this.styleSheet.groupChatMessage);
        return attr;
    }

    shouldShowDayTimestamp() {
        let lastMessage = this.options.message.getPreviousMessage();
        return !lastMessage || new StemDate(lastMessage.timeAdded).isSame(this.options.message.timeAdded, TimeUnit.DAY);
    }

    isOwnMessage() {
        return this.message.userId === USER.id;
    }

    render() {
        if (!this.contentSwitcher) {
            this.contentSwitcher = <Switcher>
                <span ref="contentContainer" style={{whiteSpace: "pre-line"}}>
                    {this.message.hasMarkupEnabled() ?
                        <ChatMarkupRenderer ref={this.refLink("content")} value={this.message.getContent()}
                                           style={{height:"auto"}} /> :
                        <UI.TextElement ref="content" value={this.message.getContent()}/>
                    }
                </span>
            </Switcher>;
        }

        let date = null;
        if (this.shouldShowDayTimestamp()) {
            date = <div className={this.styleSheet.messageTimeStampHr}>
                <div ref="dayTimestamp" className={this.styleSheet.messageTimeStamp}>
                    {StemDate.unix(this.message.timeAdded).format("dddd, MMMM Do")}
                </div>
            </div>;
        }

        let errorElement = null;
        if (this.message.postError) {
            errorElement = <span ref="errorArea" style={{marginLeft: "1rem"}} className="fa fa-warning"
                                 domTitle={"Error: " + this.message.postError}/>;
        }

        let content = [
            <div className={this.styleSheet.comment} style={{margin: "8px 16px", backgroundColor: "#eee",}}>
                <UserHandle userId={this.message.userId} className={this.styleSheet.userHandle} />
                <span className={this.styleSheet.timestamp}>{this.message.getTimeOfDay()}</span>
                {errorElement}
                <div className={this.styleSheet.commentContent}>
                    {this.contentSwitcher}
                </div>
            </div>
        ];

        let paddingDiv = <div style={{flexGrow: "1000000"}} />;

        let result;
        if (this.isOwnMessage()) {
            result = [
                date,
                <div style={{
                    display: "flex",
                }}>
                    {paddingDiv}
                    {content}
                </div>
            ];
        } else {
            result = [
                date,
                <div style={{
                    display: "flex",
                }}>
                    {content}
                    {paddingDiv}
                </div>
            ];
        }

        return result;
    }
}


class ChatMessageScrollSection extends InfiniteScrollable {
    setOptions(options: typeof this.options) {
        options = Object.assign({
            entryComparator: (a: MessageInstance, b: MessageInstance) => {
                return a.getNormalizedId() - b.getNormalizedId();
            }
        }, options);
        super.setOptions(options);
    }

    getTopMessage() {
        return this.children[1];
    }
}


// What every chat request is keyed by; the group widgets send the chat, the private one the pair
type ChatBaseRequest = {chatId?: StoreId; userId?: StoreId; privateChatId?: StoreId};

// What is posted: the base request the widget was configured with, plus what sendMessage adds to it
type ChatSendRequest = ChatBaseRequest & {message?: string; virtualId?: string};

export interface ChatWidgetBaseOptions {
    baseRequest?: ChatBaseRequest;
    extraHeightOffset?: number;
    messageThread?: MessageThread;
    plugins?: Constructor<ChatPlugin>[];
    renderMessage?: (message: MessageInstance) => BaseUIElement;
}

@registerStyle(ChatStyle)
class ChatWidgetBase extends Pluginable(UI.Element) {
    declare options: ExtendedOptions<InstanceType<ReturnType<typeof Pluginable>>, ChatWidgetBaseOptions>;

    getDefaultOptions(options?: typeof this.options) {
        return {
            dateTimestamps: true,
        };
    }

    get messageThread() {
        return this.options.messageThread;
    }

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.initializeShowLoadMoreButton();
    }

    extraNodeAttributes(attr: NodeAttributes) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            display: "flex",
            flexDirection: "column",
        });
    }

    canOverwrite() {
        return false;
    }

    initializeShowLoadMoreButton() {
        // TODO: this is a shitty way of knowing if there are more messages!
        if (this.messageThread.getNumMessages() >= 20) {
            this.showLoadMoreButton = true;
        }
    }

    createVirtualMessage(request: ChatSendRequest, message: string) {
        let virtualId = this.messageThread.getMaxMessageId() + "-" + MessageInstance.generateVirtualId() + "-" + Math.random();
        let virtualMessageInstance = MessageInstance.createVirtualMessageInstance(message, this.messageThread, virtualId);
        request.virtualId = virtualId;
        return virtualMessageInstance;
    }

    async sendMessage(message?: string) {
        if (!USER.isAuthenticated) {
            LoginModal.show();
            return;
        }
        const request = {
            ...this.options.baseRequest,
        };

        message = message || this.chatInput.getValue();
        message = message.trim();

        if (!message) {
            return;
        }
        request.message = message;

        // Create a virtual message to be drawn temporarily
        const virtualMessageInstance = this.createVirtualMessage(request, message);
        this.messageWindow.scrollToBottom();

        this.chatInput.setValue("");
        this.chatInput.dispatch("messageSent");

        try {
            const response = await Ajax.postJSON(this.getPostURL(), request, {disableStateImport: true});
            if (response.error) {
                virtualMessageInstance.setPostError(response.error);
                return;
            }
            if (virtualMessageInstance?.hasTemporaryId()) {
                MessageInstance.applyUpdateObjectId(virtualMessageInstance, response.messageId);
                GlobalState.importState(response.state);
            }
        } catch (error) {
            if (virtualMessageInstance) {
                virtualMessageInstance.setPostError(42);
            }
            console.log("Error in sending chat message:\n" + error.message);
            console.log(error.stack);
        }
    }

    saveScrollPosition() {
        this.scrollPosition = this.messageWindow.node.scrollTop;
        this.scrollPercent = this.scrollPosition / (this.messageWindow.node.scrollHeight - this.messageWindow.node.clientHeight);
    }

    applyScrollPosition() {
        this.messageWindow.node.scrollTop = this.scrollPosition || this.messageWindow.node.scrollHeight;
        this.chatInput.node.focus();
    }

    addResizeListeners() {
        this.messageWindow.addNodeListener("scroll", () => {
            let scrollTop = this.messageWindow.node.scrollTop;
            if (scrollTop < 20) {
                this.loadMoreMessages();
            }
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
        this.setStyle("height", this.getDesiredHeight());
    }

    setHeight(height: number) {
        this.setStyle("height", height);
    }

    renderMessageView() {
        let loadMoreButton;


        if (this.showLoadMoreButton) {
            loadMoreButton = (
                <div className="text-center">
                    <AjaxButton ref={this.refLink("loadMoreButton")} onClick={() => {this.loadMoreMessages()}}
                                   style={this.styleSheet.loadMoreButton} statusOptions={["Load more messages", {faIcon: "spinner fa-spin", label:" loading messages..."}, "Load more messages", "Failed"]}
                    />
                </div>
            );
        }

        return [
            <ChatMessageScrollSection className={this.styleSheet.renderMessageView}
                                      ref="messageWindow"
                                      entryRenderer={this.options.renderMessage}
                                      entries={this.messageThread.getMessages()}
                                      staticTop={loadMoreButton} />
        ];
    }

    getGetType() {
        return "GET";
    }

    loadMoreMessages() {
        // TODO: wrap this in something
        if (this.outstandingRequest) {
            return;
        }
        this.outstandingRequest = true;

        const topMessage = this.messageWindow.getTopMessage();

        let messageInstances = this.messageThread.getMessages();
        let lastMessageId = 999999999;
        if (messageInstances.length) {
            lastMessageId = messageInstances[0].id;
        }

        let request = Object.assign({
            lastMessageId: lastMessageId
        }, this.options.baseRequest || {});

        const oldScrollHeight = this.messageWindow.node.scrollHeight;

        if (this.loadMoreButton) {
            this.loadMoreButton.ajaxCall({
                url: this.getGetURL(),
                type: this.getGetType(),
                dataType: "json",
                data: request,
                complete: () => {
                    //TODO(@Rocky): find out why this doesn't work
                    this.outstandingRequest = false;
                }
            }).then((data) => {
                const emptyData = !data.state || !data.state.MessageInstance;
                if (emptyData || data.state.MessageInstance.length < 20) {
                    if (this.loadMoreButton) {
                        this.loadMoreButton.hide();
                    }
                    this.showLoadMoreButton = false;

                    if (emptyData) {
                        return;
                    }
                }

                let scrollDelta = 0;
                if (!topMessage.shouldShowDayTimestamp()) {
                    scrollDelta += topMessage.dayTimestamp.getHeight();
                    topMessage.dayTimestamp.addClass("hidden");
                }
                this.messageWindow.scrollToHeight(this.messageWindow.node.scrollHeight - oldScrollHeight - scrollDelta);

                this.outstandingRequest = false;
            });
        }
    }

    renderMessageBox() {
        return <div ref="writingSection" className={this.styleSheet.renderMessage}>
            <TextArea readOnly={this.messageThread.muted}
                         ref="chatInput"
                         placeholder="Type a message..."
                         className={this.styleSheet.chatInput} />
            <div style={{display: "flex", flexDirection: "column", height: "100%", position: "absolute", right: "0px", width: "50px"}}>
                <Button ref="sendMessageButton"
                           icon="paper-plane"
                           disabled={this.messageThread.muted}
                           onClick={() => this.sendMessage()}
                           className={this.styleSheet.messageBoxButton} />
                <PreviewMarkupButton ref="previewMessageButton"
                               getValue={() => {return this.chatInput.getValue();}}
                               setValue={(value) => {this.chatInput.setValue(value);this.chatInput.node.focus();}}
                               className={this.styleSheet.messageBoxButton}
                               icon="eye" />
            </div>
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

    getDefaultPlugins() {
        return ChatWidget.defaultPlugins || [];
    }

    onMount() {
        super.onMount();

        for (let plugin of (this.options.plugins || this.getDefaultPlugins())) {
            this.registerPlugin(plugin);
        }

        this.attachChangeListener(this.messageThread, (event: StoreEvent) => {
            if (event.type === "muted") {
                this.redraw();
            }
        });

        this.attachListener(this.messageThread, "newMessage", (event: StoreEvent) => {
            //console.log("Received chat message: ", event);
            let messageInstance = MessageInstance.get(event.data.id);

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

        this.addResizeListeners();
    }
}

// The class is hoisted out of the factory so that @registerStyle is visible at the top level: the
// plugin appends a merged interface there, and it cannot reach a class declared inside a function.
// An embedder bolts defaultPlugins onto the factory itself; see CSAApp
interface ChatWidgetFactory {
    (ChatMessageClass: any): typeof ChatWidgetBase;
    defaultPlugins?: Constructor<ChatPlugin>[];
}

let ChatWidget: ChatWidgetFactory = (ChatMessageClass) => class ChatWidgetClass extends ChatWidgetBase {
    getDefaultOptions(options: typeof this.options) {
        return {
            ...super.getDefaultOptions(options),
            renderMessage: (messageInstance: MessageInstance) => {
                return <ChatMessageClass key={messageInstance.getNormalizedId()} message={messageInstance} />;
            }
        };
    }
};

export interface GroupChatWidgetOptions {
    baseRequest?: ChatBaseRequest;
    chatId?: StoreId;
    renderMessage?: (message: MessageInstance) => BaseUIElement;
}

class GroupChatWidget extends ChatWidget(GroupChatMessage) {
    declare options: ExtendedOptions<InstanceType<ReturnType<typeof ChatWidget>>, GroupChatWidgetOptions>;

    setOptions(options: typeof this.options) {
        super.setOptions(options);
        this.options.baseRequest = {
            chatId: this.options.chatId,
        };
    }

    getPostURL() {
        return "/chat/group_chat_post/";
    }

    extraNodeAttributes(attr: NodeAttributes) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            display: "flex",
            flexDirection: "column",
            overflowY: "hidden",
        });
    }

    getGetURL() {
        return "/chat/group_chat_state/";
    }

    renderMessageView() {
        let loadMoreButton;

        if (this.showLoadMoreButton) {
            loadMoreButton = (
                <div className="text-center">
                    <AjaxButton ref={this.refLink("loadMoreButton")} onClick={() => {this.loadMoreMessages()}}
                                   style={this.styleSheet.loadMoreButton} statusOptions={["Load more messages", {faIcon: "spinner fa-spin", label:" loading messages..."}, "Load more messages", "Failed"]}
                    />
                </div>
            );
        }

        return [
            <ChatMessageScrollSection className={this.styleSheet.renderMessageView}
                                      ref="messageWindow"
                                      entryRenderer={this.options.renderMessage}
                                      entries={this.messageThread.getMessages()}
                                      staticTop={loadMoreButton}/>
        ];
    }
}

export interface PrivateChatWidgetOptions {
    privateChat?: PrivateChat;
}

class PrivateChatWidget extends ChatWidget(PrivateChatMessage) {
    declare options: ExtendedOptions<InstanceType<ReturnType<typeof ChatWidget>>, PrivateChatWidgetOptions>;

    setOptions(options: typeof this.options) {
        options = Object.assign({
            messageThread: options.privateChat.getMessageThread(),
            baseRequest: {
                userId: options.privateChat.getOtherUserId(),
                privateChatId: options.privateChat.id
            }
        }, options);
        super.setOptions(options);
    }

    setPrivateChat(privateChat: boolean) {
        this.options.privateChat = privateChat;
        this.setOptions(this.options);
    }

    getPostURL() {
        return "/chat/private_chat_post/";
    }

    getGetType() {
        return "POST"; // It might create a chat if it doesn't have one
    }

    getGetURL() {
        return "/chat/private_chat_state/";
    }
}

export interface VotableChatMessageOptions {
    message?: MessageInstance;
}

class VotableChatMessage extends GroupChatMessage {
    declare options: ExtendedOptions<GroupChatMessage, VotableChatMessageOptions>;

    render() {
        let result = super.render();
        result[1].options.children.push(<CommentVotingWidgetWithThumbs style={{display: "inline-block"}} message={this.options.message} />);
        return result;
    }
}

export interface VotableGroupChatWidgetOptions {
    baseRequest?: ChatBaseRequest;
    chatId?: StoreId;
}

class VotableGroupChatWidget extends ChatWidget(VotableChatMessage) {
    declare options: ExtendedOptions<InstanceType<ReturnType<typeof ChatWidget>>, VotableGroupChatWidgetOptions>;

    setOptions(options: typeof this.options) {
        options.messageThread = options.messageThread || MessageThread.get(GroupChat.get(options.chatId).messageThreadId);
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

export {ChatWidget, EditableMessage,
    GroupChatWidget, PrivateChatWidget, VotableGroupChatWidget,
    GroupChatMessage, PrivateChatMessage, VotableChatMessage,
    PreviewMarkupButton, ChatMessageScrollSection};
