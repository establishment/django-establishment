import {UI, SectionDivider, Button} from "UI";
import {GlobalState} from "State";
import {PrivateChatStore, MessageThreadStore} from "MessageThreadStore";
import {UserNotificationStore} from "UserStore";
import {UserHandle} from "UserHandle";
import {PrivateChatWidget} from "ChatWidget";
import {Dispatcher, Dispatchable} from "Dispatcher";
import {URLRouter} from "URLRouter";
import {Ajax} from "Ajax";
import {StemDate} from "Time";
import {MessagesPanelListStyle} from "SocialNotificationsStyle";
import {FAIcon} from "FontAwesome";

import {Router, Subrouter} from "Router";

let messagesPanelListStyle = MessagesPanelListStyle.getInstance();

const formatMiniMessageLastTime = (timeStamp) => {
    const presentTimeStamp = StemDate.now();
    const fullDateFormat = "DD/MM/YYYY";
    if (presentTimeStamp.format(fullDateFormat) === timeStamp.format(fullDateFormat)) {
        return timeStamp.format("HH:mm");
    } else if (presentTimeStamp.getYear() === timeStamp.getYear()) {
        if (presentTimeStamp.getWeekInYear() === timeStamp.getWeekInYear()) {
            return timeStamp.format("ddd");
        } else {
            return timeStamp.format("MMM Do");
        }
    } else {
        return timeStamp.format(fullDateFormat);
    }
};

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
            backgroundColorActive: "#3373b7"
        }, options);
        super.setOptions(options);
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass("miniMessage" + this.options.userId);
        attr.setStyle({
            padding: "10px",
            borderBottom: "1px solid #ddd",
            whiteSpace: "nowrap",
            color: this.isRead ? (this.isActive ? "white" : "black") : (this.isActive ? "white" : "red"),
        });
    }

    render() {
        let callButton;
        if (USER.isSuperUser) {
            callButton = <span className="fa fa-phone" ref="call" style={{cursor: "pointer", paddingLeft: "7px"}}/>;
        }
        return [
            <UserHandle ref="userHandle" id={this.options.userId} noPopup />,
            callButton,
            <div ref="timeAttribute" className="pull-right" style={{color: (this.isActive ? "white" : "#888"),}}>
                {(this.options.lastMessage.timeAdded !== 0 ? formatMiniMessageLastTime(StemDate(this.options.lastMessage.timeAdded)) : "")}
            </div>,
            <div style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: "8px",}}>
                {this.options.lastMessage.content}
            </div>,
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
            this.userColor = this.userHandle.getRatingColor();
            this.userHandle.setColor("white");
        } else {
            this.setStyle("background-color", "");
            this.setStyle("color", "black");
            this.timeAttribute.setStyle("color", "#888");
            this.userHandle.setColor(this.userColor);
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

            Ajax.postJSON("/chat/private_chat_mark_read/", request).then(
                (data) => {
                    if (data.error) {
                        console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                        return;
                    }
                },
                (error) => {
                    console.error("Error in fetching objects:\n" + error.message);
                    console.error(error.stack);
                }
            );
        }
        this.dispatch("unreadCountChanged", -1);
        this.setStyle("color", this.isActive ? "white" : "");
        this.options.lastMessageReadId = null;
    }

    // Returns whether the update was successful or not
    updateLastMessage(message) {
        if (this.options.lastMessage && this.options.lastMessage.id > message.id) {
            return false;
        }
        this.options.lastMessage = message;
        if (message.userId !== USER.id) {
            this.setAsUnread();
        } else {
            this.setAsRead();
        }
        this.redraw();
        return true;
    }

    onMount() {
        if (this.options.firstUnreadMessageId) {
            this.setAsUnread();
        }
        this.addClickListener(() => {
            this.dispatch("messageSelected");
        });
        if (USER.isSuperUser) {
            this.call.addClickListener((event) => {
                if (window.userMediaStreamer) {
                    Dispatcher.Global.dispatch("startedCall", this.options.userId);
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }
    }
};

class UserSearchInput extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle({
            width: "100%",
        });
        return attr;
    }

    render() {
        let windowStyle = {
            marginTop: "0.9px",
            position: "absolute",
            maxWidth: "300px",
            maxHeight: "300px",
            overflow: "auto",
            marginTop: "30px",
            backgroundColor: "#eee",
        };

        return [
            <FAIcon icon="search" style={{
                display: "inline-block",
                backgroundColor: "#eee",
                color: "#999",
                width: "15%",
                height: "30px",
                textAlign: "center",
                float: "left",
                lineHeight: "30px",
                cursor: "pointer",
            }} onClick={() => {
                this.input.node.focus(); 
                this.input.node.select();
            }} />,
            <UI.TextInput ref="input" className={this.options.textInputStyle || ""} placeholder={this.options.placeholder || ""} />,
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

                Ajax.get("/public_user_profiles/", {
                    dataType: "json",
                    data: request,
                    cache: false,
                }).then(
                    (data) => {
                        if (data.error) {
                            console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                            return;
                        }
                        GlobalState.importState(data.state || {});
                        this.updateList(data.state.publicuser);
                    },
                    (error) => {
                        console.error("Error in fetching objects:\n" + error.message);
                        console.error(error.stack);
                    }
                );
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

    render() {
        return <div style={{width: "100%", height: "100%", position: "relative",}}>
            <UI.Element ref="miniMessagesList" style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "auto"}} >
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
            if (miniMessage.updateLastMessage(event.data)) {
                this.updateLastReadMessage(miniMessage);
            }
        });
        privateChat.addUpdateListener((event) => {
            if (event.type === "updateFirstUnreadMessage" && ! event.data.firstUnreadMessage["1"]) {
                miniMessage.setAsRead(false);
            }
        });
    }

    refreshList() {
        let request = {};

        Ajax.get("/chat/private_chat_list/", {
            dataType: "json",
            data: request,
            cache: false,
        }).then(
            (data) => {
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
            (error) => {
                console.error("Error in fetching objects:\n" + error.message);
                console.error(error.stack);
            }
        );
    }

    onMount() {
        this.refreshList();
    }
}

class IconMessagesList extends MessagesList {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        // attr.setStyle("display", "table");
        // attr.setStyle("height", "400px");
        // attr.setStyle("width", "320px");
        attr.setStyle({
            lineHeight: "normal",
            backgroundColor: "#fff",
            width: "100%",
            height: "100%",
            overflow: "auto",
            maxWidth: "100%",
            position: "absolute",
            right: "0px",
            display: "flex",
            flexDirection: "column",
        });
        return attr;
    }

    render() {
        return [
            <MessagesList ref="messagesList" style={{flex: "1", overflow: "auto"}}/>,
            <div style={{textAlign: "center", width: "100%", padding: "0.5em", borderTop: "1px solid #ddd"}} >
                <UI.Link href="/messages/" newTab={false} value="View all messages"/>
            </div>
        ];
    }

    getLink(userId) {
        return "/messages/#" + userId;
    }

    onMount() {
        this.messagesList.addListener("unreadCountChanged", (value) => {
            this.dispatch("unreadCountChanged", value);
        });
        this.messagesList.addListener("messageSelected", (event) => {
            window.open(this.getLink(event.userId));
        })
    }
}

class IconMessagesListWithUrl extends IconMessagesList {
    getLink(userId) {
        return "/messages/" + userId + "/";
    }
}

class MessagesPanelList extends UI.Element {
    constructor(options) {
        super(options);
        this.urlMiniMessageMap = new Map();
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass(messagesPanelListStyle.messagesPanelList);
        return attr;
    }

    render() {
        return [
            <div style={{padding: "16px", paddingRight: "50px", height: "62px", borderBottom: "1px solid #ddd",}}>
                <UserSearchInput ref="userSearchInput" textInputStyle={messagesPanelListStyle.textInputStyle} placeholder="Search for user"/>
            </div>,
            <MessagesList ref="messagesList" style={{flex: "1", overflow: "auto"}}/>
        ];
    }

    setActiveMiniMessage(miniMessage) {
        if (this.activeMiniMessage) {
            this.activeMiniMessage.setActive(false);
        }
        this.activeMiniMessage = miniMessage;
        this.activeMiniMessage.setActive(true);
    }

    handleMiniMessage(miniMessage) {
        let userId = parseInt(miniMessage.options.userId);
        this.urlMiniMessageMap.set(userId, miniMessage);
        if (userId === parseInt(URLRouter.getLocation().args[0])) {
            setTimeout(() => {this.handleLocation(URLRouter.getLocation());}, 0);
        }
    }

    routeToUser(userId) {
        URLRouter.route(userId);
    }

    initializeUrlHandling() {
        this.handleLocation = (location) => {
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
        URLRouter.addRouteListener(this.handleLocation);
    }

    onMount() {
        this.initializeUrlHandling();

        this.messagesList.addListener("miniMessageCreated", (miniMessage) => {
            this.handleMiniMessage(miniMessage);
        });
        this.addListener("userChatCreated", () => {
            this.messagesList.refreshList();
        });
        this.userSearchInput.addListener("userChosen", (userId) => {
            this.dispatch("createUserChat", userId);
            this.routeToUser(userId);
        });
        this.messagesList.addListener("messageSelected", (event) => {
            this.setActiveMiniMessage(event.miniMessage);
            this.dispatch("userChanged", event.userId);
            this.routeToUser(event.userId);
        });
    }
}

class RoutedMessagesPanelList  extends MessagesPanelList {
    handleMiniMessage(miniMessage) {
        let userId = parseInt(miniMessage.options.userId);
        this.urlMiniMessageMap.set(userId, miniMessage);
        if (userId === this.urlRouter.getState()[0]) {
            setTimeout(() => {
                this.urlRouter.dispatch("change");
            }, 0);
        }
    }

    routeToUser(userId) {
        this.urlRouter.setState([userId]);
    }

    initializeUrlHandling() {
        this.handleLocation = (urlState) => {
            if (urlState.length === 0) {
                return;
            }
            if (urlState.length === 1) {
                let userId = parseInt(urlState[0]);
                let miniMessage = this.urlMiniMessageMap.get(userId);
                if (miniMessage) {
                    this.setActiveMiniMessage(miniMessage);
                    this.dispatch("userChanged", userId);
                } else {
                    this.dispatch("createUserChat", userId);
                }
            }
            if (urlState.length > 1) {
                this.urlRouter.setState([urlState[0]]);
            }
        };

        setTimeout(() => {
            this.urlRouter = new Subrouter(Router.Global.getCurrentRouter(),
                                        [...Router.Global.getCurrentRouter().getPrefix(), ...Router.Global.getCurrentRouter().getState()],
                                        this.options.subArgs);
            Router.Global.registerSubrouter(this.urlRouter);

            this.urlRouter.addChangeListener(this.handleLocation);
            this.urlRouter.addExternalChangeListener(this.handleLocation);
            this.urlRouter.dispatch("change", this.urlRouter.getState());
        }, 0);
    }
}

class DelayedPrivateChat extends UI.Element {
    render() {
        if (!this.options.userId) {
            return <h3 style={{marginTop: "40px", textAlign: "center"}}>Click on a chat box to start a conversation.</h3>;
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
            return [<PrivateChatWidget ref="chat" style={widgetStyle} extraHeightOffset={75}
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
        this.chat.messageWindow.scrollToBottom();
    }

    onMount() {
        this.addListener("userChatCreated", () => {
            setTimeout(() => {
                this.chat.messageWindow.scrollToBottom();
            }, 0);
        });
    }
}

let BaseMessagesPanel = function(MessageListClass) {
    return class MessagesPanel extends UI.Element {
        extraNodeAttributes(attr) {
            super.extraNodeAttributes(attr);
            attr.setStyle({
                border: "1px solid #ddd",
                height: "calc(100vh - 50px)",
                maxWidth: "1280px",
                margin: "0 auto",
                position: "relative",
            });
        }

        render() {
            return [
                <div style={{display: "inline-flex", height: "100%", overflow: "hidden", position: "relative"}}>
                    <MessageListClass ref="messagesPanelList" subArgs={this.options.subArgs}
                                      style={{height: "100%", overflow: "auto", width: "250px",
                                              borderRight: "1px solid #ddd", transition: "margin .7s ease"}} />
                </div>,
                <Button ref="collapseButton" size={UI.Size.SMALL} faIcon="chevron-left" level={UI.Level.DARK}
                        style={{position: "absolute", top: "15px", left: "208px", zIndex: "2017", transition: "all .7s ease"}}/>,
                <DelayedPrivateChat style={{display: "inline-block", flex: "1", width: "calc(100% - 260px)", height: "100%",
                                         transition: "width .7s ease", verticalAlign: "top"}} ref="chatWidget"/>
            ];
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
            //TODO: use classes here
            this.collapseButton.addClickListener(() => {
                if (!this.collapsed) {
                    this.messagesPanelList.setStyle("marginLeft", "-250px");
                    this.collapseButton.setFaIcon("chevron-right");
                    this.collapseButton.setStyle("left", "8px");
                    this.collapseButton.setStyle("opacity", ".3");
                    this.chatWidget.setWidth("100%");
                    this.collapsed = true;
                } else {
                    this.messagesPanelList.setStyle("marginLeft", "0");
                    this.collapseButton.setFaIcon("chevron-left");
                    this.collapseButton.setStyle("left", "208px");
                    this.collapseButton.setStyle("opacity", "1");
                    this.chatWidget.setWidth("calc(100% - 250px)");
                    this.collapsed = false;
                }
            })
        }
    }
};

let MessagesPanel = BaseMessagesPanel(MessagesPanelList);
let RoutedMessagesPanel = BaseMessagesPanel(RoutedMessagesPanelList);

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
            <DelayedChat ref="chatWidget" userId={this.options.userId} style={{backgroundColor: "white", width: "100%",
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
        attr.setStyle("borderBottom", "1px solid #ddd");
        attr.setStyle("textAlign", "right");
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

class AnnouncementNotification extends Notification {
    getNotificationClass() {
        return "announcementNotification";
    }

    getGivenChildren() {
        return <UI.MarkupRenderer value={this.options.notification.data.value} />;
    }
}

class NotificationsList extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            height: "100%",
            width: "100%",
            lineHeight: "normal",
            overflow: "auto",
            backgroundColor: "#fff",
            // padding: "8px",
            color: "#262626",
        });
    }

    constructor(options) {
        super(options);
        this.unreadNotificationsCount = 0;
        this.notificationsCount = 0;
        this.displayedNotifications = new Set();
    }

    render() {
        if (this.options.children.length == 0) {
            this.options.children.push(
                <div style={{
                    cursor: "default", 
                    textAlign: "center",
                    fontSize: "1.05em",
                    height: "30px",
                    lineHeight: "30px",
                }}>
                    You don't have any notifications.
                </div>
            );
        }
        return this.options.children;
    }

    getStoredNotifications() {
        let request = {};

        Ajax.get("/accounts/get_user_notifications/", {
            dataType: "json",
            data: request,
            cache: false,
        }).then(
            (data) => {
                if (data.error) {
                    console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                    return;
                }
                GlobalState.importState(data.state || {});
            },
            (error) => {
                console.log("Error in fetching objects:\n" + error.message);
                console.log(error.stack);
            }
        );
    }

    insertChild(child, position) {
        position = position || 0;

        this.options.children.splice(position, 0, child);

        child.mount(this, position + 1 < this.options.children.length ? this.children[position + 1].node : null);

        return child;
    }

    handleNewNotification(notification) {
        if (this.displayedNotifications.has(notification)) {
            return;
        }
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
        this.displayedNotifications.add(notification);
    }

    onMount() {
        this.getStoredNotifications();
        for (let notification of UserNotificationStore.all().sort((x, y) => {
            return x.dateCreated - y.dateCreated;
        })) {
            this.handleNewNotification(notification);
        }
        UserNotificationStore.addCreateListener((notification) => {
            this.handleNewNotification(notification);
        });
    }
}

NotificationsList.NotificationClassMap = new Map([
    ["ratingsChange", RatingNotification],
    ["announcement", AnnouncementNotification]
]);


export {MiniMessage, MessagesPanel, RoutedMessagesPanel, MessagesList, ChatBoxesManager,
            NotificationsList, IconMessagesList, IconMessagesListWithUrl};
