import {Ajax} from "Ajax";
import {UI} from "UI";
import {SectionDivider} from "SectionDivider";
import {GlobalState} from "State";
import {PrivateChatStore, MessageThreadStore} from "MessageThreadStore";
import {UserNotificationStore} from "UserStore";
import {UserHandle} from "UserHandle";
import {PrivateChatWidget} from "ChatWidget";
import {Dispatchable} from "Dispatcher";
import {URLRouter} from "URLRouter";
import {StemDate} from "Time";

class MiniMessage extends UI.Element {
    constructor(options) {
        super(options);
        if (!this.options.lastMessage) {
            this.options.lastMessage = {content: "", timeAdded: 0, id: "0"};
        }
        this.isRead = true;
        this.isActive = false;
    }

    setOptions(options) {
        options = Object.assign({
            hoverColor: "rgba(0,0,0,0.05)",
            backgroundColorActive: "#3373b7",
            userColor: "#06B"
        }, options);
        super.setOptions(options);
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass("miniMessage" + this.options.userId);
        attr.setStyle("padding", "10px");
        attr.setStyle("border", "1px solid #ccc");
        attr.setStyle("position", "relative");
        attr.setStyle("color", (this.isRead ? (this.isActive ? "white" : "black") : (this.isActive ? "white" : "red")));
        return attr;
    }

    render() {
        return [
            <UserHandle ref="userHandle" id={this.options.userId} noPopup color={this.isActive ? "white" : this.options.userColor} />,
            <div ref="timeAttribute" className="pull-right" style={{color: (this.isActive ? "white" : "#888")}}>
                {(this.options.lastMessage.timeAdded ? StemDate.unix(this.options.lastMessage.timeAdded).format("HH:mm, MMMM Do") : "")}
            </div>,
            <div>{this.options.lastMessage.content}</div>,
            <UI.StyleElement>
                <UI.StyleInstance ref="hoverClass" selector={".miniMessage" + this.options.userId + ":hover"} attributes={{"cursor": "pointer", "background-color": this.options.hoverColor}}/>
            </UI.StyleElement>
        ];
    }

    setActive(active = true) {
        if (this.isActive === active) {
            return;
        }
        if (active) {
            this.setStyle("background-color", this.options.backgroundColorActive);
            this.setStyle("color", "white");
            this.timeAttribute.setStyle("color", "white");
            this.userHandle.setColor("white");
        } else {
            this.setStyle("background-color", "");
            this.setStyle("color", "black");
            this.timeAttribute.setStyle("color", "#888");
            this.userHandle.setColor(this.options.userColor);
        }
        this.isActive = active;
    }

    setAsUnread() {
        if (!this.isRead) {
            return;
        }
        this.setStyle("color", this.isActive ? "white" : "red");
        this.isRead = false;
        this.dispatch("unreadCountChanged", +1);
    }

    setAsRead(sendAjax = true) {
        if (this.isRead) {
            return;
        }
        this.isRead = true;
        if (sendAjax) {
            let request = {
                privateChatId: this.options.chatId,
            };

            Ajax.request({
                url: "/chat/private_chat_mark_read/",
                type: "POST",
                dataType: "json",
                data: request,
                cache: false,
                success: (data) => {
                    if (data.error) {
                        console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                        return;
                    }
                },
                error: (xhr, errmsg, err) => {
                    console.error("Error in fetching objects:\n" + xhr.status + ":\n" + xhr.responseText);
                }
            });
        }
        this.dispatch("unreadCountChanged", -1);
        this.setStyle("color", this.isActive ? "white" : "");
        this.options.lastMessageReadId = null;
    }

    setMessage(message) {
        this.options.lastMessage = message;
        if (message.userId !== USER.id) {
            this.setAsUnread();
        } else {
            this.setAsRead();
        }
        this.redraw();
    }

    onMount() {
        if (this.options.firstUnreadMessageId) {
            this.setAsUnread();
        }
        this.addClickListener(() => {
            this.dispatch("messageSelected");
        });
    }
};

class UserSearchInput extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("position", "relative");
        return attr;
    }

    render() {
        let windowStyle = {
            marginTop: "0.9px",
            position: "absolute",
            backgroundColor: "white",
            maxWidth: "300px",
            maxHeight: "300px",
            overflow: "auto",
            boxShadow: "0 6px 12px rgba(0,0,0,.175)",
        };

        return [
            <UI.TextInput ref="input" style={{width: "100%"}} />,
            <UI.VolatileFloatingWindow className="searchList" style={windowStyle} ref="window" />,
            <UI.StyleElement>
                <UI.StyleInstance selector=".searchList>div:hover" attributes={{"cursor": "pointer", "background-color": "#eee"}} />
            </UI.StyleElement>
        ];
    }

    updateList(listItems) {
        if (!listItems) {
            this.window.options.children = "";
            this.window.redraw();
            return;
        }
        let divStyle = {
            paddingLeft: "7px",
            paddingRight: "7px",
            paddingTop: "2px",
            paddingBottom: "2px"
        };
        let list = [];
        for (let i = 0; i < listItems.length; i += 1) {
            let chooseUser = () => {
                this.input.setValue(listItems[i].username);
                this.selectedId = listItems[i].id;
                this.window.hide();
                this.dispatch("userChosen", this.selectedId);
            };
            list.push(<div style={divStyle} onClick={chooseUser}>{listItems[i].username}</div>);
        }
        this.window.options.children = list;
        this.window.redraw();
    }

    onMount() {
        this.input.addNodeListener("keyup", () => {
            this.window.show();
            if (this.input.getValue()) {
                let request = {
                    usernamePrefix: this.input.getValue(),
                };

                Ajax.request({
                    url: "/public_user_profiles/",
                    type: "GET",
                    dataType: "json",
                    data: request,
                    cache: false,
                    success: (data) => {
                        if (data.error) {
                            console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                            return;
                        }
                        GlobalState.importState(data.state || {});
                        this.updateList(data.state.publicuser);
                    },
                    error: (xhr, errmsg, err) => {
                        console.error("Error in fetching objects:\n" + xhr.status + ":\n" + xhr.responseText);
                    }
                });
            } else {
                this.updateList();
            }
        });
    }
};

class MessagesList extends UI.Element {
    constructor(options) {
        super(options);
        this.miniMessages = [];
        this.privateChatsMap = new Map();
        this.unreadMessages = 0;
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("height", "100%");
        attr.setStyle("width", "100%");
        attr.setStyle("display", "table-row");
        return attr;
    }

    render() {
        return <div style={{width: "100%", height: "100%", position: "relative"}}>
                    <UI.Element ref="miniMessagesList" style={{position: "absolute", top: 0, bottom: 0, left: 0,
                                                                                        right: 0, overflow: "auto"}} >
                        {this.miniMessages}
                    </UI.Element>
                </div>;
    }

    updateLastReadMessage(miniMessage) {
        this.miniMessagesList.insertChild(this.miniMessagesList.eraseChild(miniMessage, false), 0);
        for (let i = 0; i < this.miniMessages.length; i += 1) {
            if (this.miniMessages[i] === miniMessage) {
                this.miniMessages.splice(i,1);
                this.miniMessages.splice(0,0,miniMessage);
                break;
            }
        }
    }

    changeTotalUnread(value) {
        this.unreadMessages += value;
        this.dispatch("unreadCountChanged", this.unreadMessages);
    }

    bindMiniMessageEvents(messageThread, privateChat, miniMessage) {
        let basicEvent = {
            miniMessage: miniMessage,
            userId: miniMessage.options.userId
        };
        miniMessage.addListener("messageSelected", () => {
            miniMessage.setAsRead();
            this.dispatch("messageSelected", basicEvent);
        });
        miniMessage.addListener("unreadCountChanged", (value) => {
            this.changeTotalUnread(value);
        });
        messageThread.addListener("newMessage", (event) => {
            miniMessage.setMessage(event.data);
            this.updateLastReadMessage(miniMessage);
        });
        privateChat.addUpdateListener((event) => {
            if (event.type === "updateFirstUnreadMessage" && ! event.data.firstUnreadMessage["1"]) {
                miniMessage.setAsRead(false);
            }
        });
    }

    refreshList() {
        let request = {};

        Ajax.request({
            url: "/chat/private_chat_list/",
            type: "GET",
            dataType: "json",
            data: request,
            cache: false,
            success: (data) => {
                if (data.error) {
                    console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                    return;
                }
                GlobalState.importState(data.state || {});
                let privateChatArray = PrivateChatStore.all();
                for (let i = 0; i < privateChatArray.length; i += 1) {
                    let messageThread = privateChatArray[i].getMessageThread();
                    let privateChat = privateChatArray[i];
                    if (this.privateChatsMap.get(privateChat.getOtherUserId())) {
                        continue;
                    } else {
                        let lastMessage = (messageThread.messages.size ? messageThread.messages.get(messageThread.getMaxMessageId()) : {timeAdded : 0});
                        let miniMessage = <MiniMessage lastMessage={lastMessage} userId={privateChat.getOtherUserId()}
                                                       chatId={privateChat.id} messageThread={messageThread} list={this}
                                                       firstUnreadMessageId={privateChat.firstUnreadMessage[USER.id]} />;
                        this.privateChatsMap.set(privateChat.getOtherUserId(), miniMessage);
                        this.bindMiniMessageEvents(messageThread, privateChat, miniMessage);
                        this.miniMessages.push(miniMessage);
                        this.dispatch("miniMessageCreated", miniMessage);
                    }

                }
                for (let i = 0; i < this.miniMessages.length; i += 1) {
                    for (let j = 0; j < this.miniMessages.length - 1; j += 1) {
                        if (parseInt(this.miniMessages[j].options.lastMessage.timeAdded) < parseInt(this.miniMessages[j + 1].options.lastMessage.timeAdded)) {
                            let aux = this.miniMessages[j];
                            this.miniMessages[j] = this.miniMessages[j + 1];
                            this.miniMessages[j + 1] = aux;
                        }
                    }
                }
                this.redraw();
            },
            error: (xhr, errmsg, err) => {
                console.error("Error in fetching objects:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    onMount() {
        this.refreshList();
    }
}

class IconMessagesList extends MessagesList {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("display", "table");
        attr.setStyle("height", "400px");
        attr.setStyle("width", "320px");
        return attr;
    }

    render() {
        return [
            <MessagesList ref="messagesList" />,
            <span style={{padding: "3px", textAlign: "center"}} >
                <UI.Link href="/testing/messages_panel" newTab={false} value="View all messages" style={{left: "0px",
                            right: "0px", position: "absolute"}} />
            </span>
        ];
    }

    onMount() {
        this.messagesList.addListener("unreadCountChanged", (value) => {
            this.dispatch("unreadCountChanged", value);
        });
        this.messagesList.addListener("messageSelected", (event) => {
            window.open("/testing/messages_panel/#" + event.userId);
        })
    }
}

class MessagesPanelList extends UI.Element {
    constructor(options) {
        super(options);
        this.urlMiniMessageMap = new Map();
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("display", "table");
        return attr;
    }

    render() {
        return [
            <div style={{padding: "7px", boxShadow: "rgba(0, 0, 0, 0.172549) 0px 6px 12px"}}>
                <span>Search for a user to start a conversation:</span>
                <UserSearchInput ref="userSearchInput" style={{marginBottom: "10px"}}/>
            </div>,
            <MessagesList ref="messagesList"/>
        ];
    }

    setActiveMiniMessage(miniMessage) {
        if (this.activeMiniMessage) {
            this.activeMiniMessage.setActive(false);
        }
        this.activeMiniMessage = miniMessage;
        this.activeMiniMessage.setActive(true);
    }

    onMount() {
        this.messagesList.addListener("miniMessageCreated", (miniMessage) => {
            let userId = parseInt(miniMessage.options.userId);
            this.urlMiniMessageMap.set(userId, miniMessage);
            if (userId === parseInt(URLRouter.getLocation().args[0])) {
                setTimeout(() => {handleLocation(URLRouter.getLocation());}, 0);
            }
        });
        this.userSearchInput.addListener("userChosen", (userId) => {
            this.dispatch("createUserChat", userId);
            URLRouter.route(userId);
        });
        this.messagesList.addListener("messageSelected", (event) => {
            this.setActiveMiniMessage(event.miniMessage);
            this.dispatch("userChanged", event.userId);
            URLRouter.route(event.userId);
        });
        this.addListener("userChatCreated", () => {
            this.messagesList.refreshList();
        });
        let handleLocation = (location) => {
            if (!location)
                return;
            try {
                let url = parseInt(location.args[0]);
                let miniMessage = this.urlMiniMessageMap.get(url);
                if(miniMessage) {
                    this.setActiveMiniMessage(miniMessage);
                    this.dispatch("userChanged", parseInt(url));
                } else {
                    this.dispatch("createUserChat", parseInt(url));
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };
        URLRouter.addRouteListener(handleLocation);
    }
}

class DelayedChat extends UI.Element {
    render() {
        if (!this.options.userId) {
            return <h3>Click on a chat box to start a conversation.</h3>;
        }
        if (!this.ok) {
            this.privateChat = PrivateChatStore.getChatWithUser(this.options.userId);
            this.ok = true;
        }
        if (this.privateChat) {
            let widgetStyle = {
                marginLeft: "0px",
                marginRight: "0px",
                width: "100%",
                paddingLeft: "0px !important",
                paddingRight: "0px !important",
            };
            if (this.options.style && this.options.style.height) {
                widgetStyle.height = this.options.style.height;
            }
            this.dispatch("userChatCreated");
            return [<PrivateChatWidget ref="chat" key={this.options.userId} style={widgetStyle} extraHeightOffset={75}
                                       privateChat={this.privateChat} />];
        } else {
            PrivateChatStore.fetchForUser(this.options.userId, (privateChat) => {
                this.privateChat = privateChat;
                this.redraw();
            });
            return [<h3>Chat loading...</h3>, <span className="fa fa-spinner fa-spin"/>];
        }
    }

    changeToUser(userId) {
        if (this.options.userId === userId) {
            return;
        }
        this.options.userId = userId;
        this.ok = false;
        this.redraw();
    }

    setHeight(height) {
        super.setHeight(height);
        this.chat.setHeight(height);
    }
}

class MessagesPanel extends UI.Element {
    render() {
        return [
            <SectionDivider ref="sectionDivider" style={{height: this.computeHeight(), display: "flex"}} orientation={UI.Orientation.HORIZONTAL}>
                <MessagesPanelList ref="messagesPanelList" style={{display: "inline-block", width: "30%", height: this.computeHeight()}} />
                <DelayedChat style={{display: "inline-block", width:"70%", height: this.computeHeight()}} ref="chatWidget" fixed />
            </SectionDivider>
        ];
    }

    computeHeight() {
        return window.innerHeight - document.getElementById("navbar").offsetHeight - 30 + "px";
    }

    changeToUser(userId) {
        this.chatWidget.changeToUser(userId);
    }

    onMount() {
        this.messagesPanelList.addListener("userChanged", (userId) => {
            this.changeToUser(userId);
        });

        this.messagesPanelList.addListener("createUserChat", (userId) => {
            this.changeToUser(userId);
            this.newUserInserted = true;
            this.messagesPanelList.dispatch("userChatCreated");
        });

        this.chatWidget.addListener("userChatCreated", () => {
            if (this.newUserInserted) {
                this.messagesPanelList.dispatch("userChatCreated");
                this.newUserInserted = false;
            }
        });
        window.addEventListener("resize", () => {
            this.sectionDivider.setHeight(this.computeHeight());
            this.messagesPanelList.setHeight(this.computeHeight());
            this.chatWidget.setHeight(this.computeHeight());
        })
    }
}

class ChatBox extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("bottom", "0px");
        attr.setStyle("border", "1px solid #444");
        return attr;
    }

    getUserId() {
        return this.options.userId;
    }

    render() {
        return [
            <div style={{width: "100%", width: "100%", padding: "5px", fontSize: "1.5em", textAlign: "center",
                            backgroundColor: "#444"}}><UserHandle id={this.options.userId} color="white" noPopup/></div>,
            <DelayedChat ref="chatWidget" userId={this.options.userId} style={{backgroundColor: "white", width: "300px",
                height: "400px", fontSize: "1em", padding: "0px !important"}}/>
        ];
    }
}

class ChatBoxesManager extends UI.Element {
    constructor(options) {
        super(options);
        this.userChats = [];
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("position", "fixed");
        attr.setStyle("bottom", "0px");
        attr.setStyle("right", "0px");
        return attr;
    }

    render() {
        return Array.from(this.userChats);
    }

    expandChatBox(userId) {
        for (let i = 0; i < this.userChats.length; i += 1) {
            if (this.userChats[i].getUserId() === userId) {
                //this.userChats[i].expand();
                //this.userChats[i].focus();
                return;
            }
        }
        this.userChats.push(<ChatBox userId={userId} style={{display: "inline-block", marginRight: "5px"}}/>);
        this.redraw();
    }
}

class Notification extends UI.Element {
    getNodeType() {
        return "li";
    }

    getNotificationClass() {
        return "";
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("padding", "10px");
        attr.setStyle("border", "1px solid #ccc");
        attr.setStyle("textAlign", "center");
        attr.addClass(this.getNotificationClass());
        return attr;
    }

    render() {
        return [
            <div style={{textAlign: "initial"}}>{this.getGivenChildren()}</div>,
            <UI.TimePassedSpan timeStamp={this.options.notification.dateCreated} />
        ];
    }
}

class RatingNotification extends Notification {
    getNotificationClass() {
        return "ratingNotification";
    }

    getGivenChildren() {
        let oldRating = this.options.notification.data.oldRating;
        let newRating = this.options.notification.data.newRating;
        if (oldRating < newRating) {
            return  ["Congratulations! Your rating has increased by ", <span style={{color: "green"}}>
                            {newRating - oldRating}</span> , " points ", <UI.Emoji value="smile" />, ". Keep it up!"];
        } else {
            return ["Your rating has decreased by ", <span style={{color: "red"}}>{oldRating - newRating}</span> , " points ",
                        <UI.Emoji value="disappointed" />, ". Better luck next time!", <UI.Emoji value="smiley" />];
        }
    }
}

class NotificationsList extends UI.Element {
    constructor(options) {
        super(options);
        this.unreadNotificationsCount = 0;
        this.notificationsCount = 0;
    }

    render() {
        if (this.options.children.length == 0) {
            this.options.children.push(<div style={{cursor: "default", padding: "10px", paddingTop: "30px",
                                            paddingBottom: "30px"}}>You don't have any notifications.</div>);
        }
        return this.options.children;
    }

    getStoredNotifications() {
        let request = {};

        Ajax.request({
            url: "/accounts/get_user_notifications/",
            type: "GET",
            dataType: "json",
            data: request,
            cache: false,
            success: (data) => {
                if (data.error) {
                    console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                    return;
                }
                GlobalState.importState(data.state || {});
            },
            error: (xhr, errmsg, err) => {
                console.error("Error in fetching objects:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    insertChild(child, position) {
        position = position || 0;

        this.options.children.splice(position, 0, child);

        child.mount(this, position + 1 < this.options.children.length ? this.children[position + 1].node : null);

        return child;
    }

    onMount() {
        this.getStoredNotifications();
        UserNotificationStore.addCreateListener((notification) => {
            if (!notification.isRead()) {
                this.options.icon.increaseUnreadNotificationsCount();
            }
            let NotificationClass = this.constructor.NotificationClassMap.get(notification.type);
            if (!NotificationClass) {
                console.error("There is no notification class for ", notification.type);
                return;
            }
            let notificationElement = <NotificationClass notification={notification} />;
            this.notificationsCount += 1;
            if (this.notificationsCount === 1) {
                this.options.children = [notificationElement];
                this.redraw();
            } else {
                this.insertChild(notificationElement, 0);
            }
        });
    }
}

NotificationsList.NotificationClassMap = new Map([
    ["ratingsChange", RatingNotification],
]);


export {MiniMessage, MessagesPanel, MessagesList, ChatBoxesManager, NotificationsList, IconMessagesList};