import {
    UI, Button, Link, TextInput, VolatileFloatingWindow, registerStyle,
} from "UI";
import {MessagesPanelListStyle} from "SocialNotificationsStyle";
import {PrivateChatWidget} from "ChatWidget";
import {Router, Route} from "Router";
import {Ajax} from "Ajax";
import {FAIcon} from "FontAwesome";
import {PublicUserStore} from "UserStore";
import {PrivateChatStore, MessageThreadStore} from "MessageThreadStore";
import {UserHandle} from "UserHandle";
import {StemDate} from "Time";
import {Dispatcher} from "Dispatcher";
import {GlobalState} from "State";
import {Level, Size} from "ui/Constants";


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

function getUserMessagesUrl(userId) {
    return "/messages/" + userId + "/";
}

class MiniMessage extends UI.Element {
    getDefaultOptions() {
        return {
            hoverColor: "rgba(0, 0, 0, .05)",
            backgroundColorActive: "#3373b7"
        };
    }

    getPrivateChat() {
        return PrivateChatStore.get(this.options.privateChatId);
    }

    getMessageThread() {
        return this.getPrivateChat().getMessageThread();
    }

    getLastMessage() {
        return this.getMessageThread().getLastMessage() || {content: "", timeAdded: 0, id: "0"};
    }

    getUserId() {
        return this.getPrivateChat().getOtherUserId();
    }

    isLastMessageRead() {
        return !this.getPrivateChat().firstUnreadMessage[USER.id];
    }

    extraNodeAttributes(attr) {
        attr.setStyle({
            padding: "10px",
            borderBottom: "1px solid #ddd",
            whiteSpace: "nowrap",
            color: this.isLastMessageRead() ? (this.options.active ? "white" : "black") : (this.options.active ? "white" : "red"),
            backgroundColor: this.options.active ? this.options.backgroundColorActive : ""
        });
    }

    render() {
        return [
            <UserHandle ref="userHandle" id={this.getUserId()} noPopup color={this.options.active ? "white" : null}/>,
            <div ref="timeAttribute" className="pull-right" style={{color: (this.options.active ? "white" : "#888"),}}>
                {(this.getLastMessage().timeAdded !== 0 ? formatMiniMessageLastTime(StemDate(this.getLastMessage().timeAdded)) : "")}
            </div>,
            <div style={{whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingTop: "8px",}}>
                {this.getLastMessage().content}
            </div>,
        ];
    }

    setActive(active = true) {
        if (this.options.active === active) {
            return;
        }
        this.updateOptions({active});
    }

    setAsRead(forceAjax=false) {
        if (!forceAjax && this.isLastMessageRead()) {
            return;
        }
        Ajax.postJSON("/chat/private_chat_mark_read/", {
            privateChatId: this.options.privateChatId,
        }).then(() => {}, () => {});
    }

    onMount() {
        this.addClickListener(() => {
            this.setAsRead();
            this.options.list.dispatch("messageSelected", this.getUserId());
        });

        this.attachListener(this.getMessageThread(), "newMessage", () => {
            this.redraw();
            this.options.list.redraw();
            if (this.options.active) {
                this.setAsRead(true);
            } else {
                this.options.list.recalculateTotalUnread();
            }
        });
        this.attachEventListener(this.getPrivateChat(), "updateFirstUnreadMessage", () => {
            this.redraw();
            this.options.list.recalculateTotalUnread();
        });
    }
}

class UserSearchInput extends UI.Element {
    getDefaultOptions() {
        return {
            style: {
                width: "100%"
            }
        };
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
            <TextInput ref="input" className={this.options.textInputStyle || ""} placeholder={this.options.placeholder || ""} />,
            <VolatileFloatingWindow className="searchList" style={windowStyle} ref="window" />,
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
                this.window.hide();
                this.dispatch("userChosen", listItems[i].id);
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
                Ajax.getJSON(PublicUserStore.options.fetchURL, {
                    usernamePrefix: this.input.getValue(),
                }).then(
                    (data) => this.updateList(data.state.publicuser),
                    () => {}
                );
            } else {
                this.updateList();
            }
        });
    }
}

class MessagesList extends UI.Element {
    constructor(options) {
        super(options);
        this.miniMessages = [];
        this.unreadMessages = 0;
    }

    getMiniMessages() {
        this.miniMessages = [];
        for (let privateChat of PrivateChatStore.all()) {
            let userId = privateChat.getOtherUserId();
            let miniMessage = <MiniMessage active={userId === this.activeUserId}
                                           list={this} privateChatId={privateChat.id} />;
            this.miniMessages.push(miniMessage);
        }
        this.miniMessages.sort((a, b) => {
            return - parseInt(a.getLastMessage().timeAdded) + parseInt(b.getLastMessage().timeAdded);
        });
        return this.miniMessages;
    }

    render() {
        return <div style={{width: "100%", height: "100%", position: "relative",}}>
            <div ref="miniMessagesList" style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0}} >
                {this.getMiniMessages()}
            </div>
        </div>;
    }

    setActiveMiniMessage(userId) {
        this.activeUserId = userId;
        this.redraw();
    }

    recalculateTotalUnread() {
        this.unreadMessages = 0;
        for (let miniMessage of this.miniMessages) {
            if (!miniMessage.isLastMessageRead()) {
                this.unreadMessages += 1;
            }
        }
        this.dispatch("unreadCountChanged", this.unreadMessages);
    }

    refreshList() {
        Ajax.getJSON("/chat/private_chat_list/", {}).then(
            () => {
                this.redraw();
                this.recalculateTotalUnread();
            }
        );
    }

    onMount() {
        this.refreshList();
    }
}

class IconMessagesList extends UI.Element {
    extraNodeAttributes(attr) {
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
    }

    render() {
        return [
            <MessagesList ref="messagesList" style={{flex: "1", overflow: "auto"}}/>,
            <div style={{textAlign: "center", width: "100%", padding: "0.5em", borderTop: "1px solid #ddd"}} >
                <Link href="/messages/" newTab={false} value="View all messages"/>
            </div>
        ];
    }

    onMount() {
        this.attachListener(this.messagesList, "unreadCountChanged", (value) => {
            this.dispatch("unreadCountChanged", value);
        });
        this.attachListener(this.messagesList, "messageSelected", (userId) => {
            window.open(getUserMessagesUrl(userId));
        });
    }
}

@registerStyle(MessagesPanelListStyle)
class MessagesPanelList extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.messagesPanelList);
    }

    render() {
        return [
            <div style={{padding: "16px", paddingRight: "50px", height: "62px", borderBottom: "1px solid #ddd",}}>
                <UserSearchInput ref="userSearchInput" textInputStyle={this.styleSheet.textInputStyle} placeholder="Search for user"/>
            </div>,
            <MessagesList ref="messagesList" style={{flex: "1", overflow: "auto"}}/>
        ];
    }

    setActiveMiniMessage(userId) {
        this.messagesList.setActiveMiniMessage(userId);
    }

    routeToUser(userId) {
        Router.changeURL(getUserMessagesUrl(userId));
    }

    onMount() {
        this.attachListener(this.userSearchInput, "userChosen", (userId) => {
            this.routeToUser(userId);
            this.messagesList.refreshList();
        });
        this.attachListener(this.messagesList, "messageSelected", (userId) => {
            this.setActiveMiniMessage(userId);
            this.dispatch("userChanged", userId);
            this.routeToUser(userId);
        });
    }
}

class PrivateChatWidgetWrapper extends UI.Element {
    render() {
        const privateChat = PrivateChatStore.getChatWithUser(parseInt(this.options.userId));
        if (privateChat) {
            let widgetStyle = {
                marginLeft: "0px",
                marginRight: "0px",
                width: "100%",
                paddingLeft: "0px !important",
                paddingRight: "0px !important",
                height: "100%"
            };
            if (this.options.style && this.options.style.height) {
                widgetStyle.height = this.options.style.height;
            }
            return <PrivateChatWidget ref="chat" style={widgetStyle} extraHeightOffset={75}
                               privateChat={privateChat} />;
        }
        PrivateChatStore.fetchForUser(this.options.userId, (privateChat) => {
            this.updateOptions({ privateChat });
            this.chat.messageWindow.scrollToBottom();
        });
        return [
            <h3>Chat loading...</h3>,
            <span className="fa fa-spinner fa-spin"/>
        ];
    }

    onMount() {
        this.addListener("hide", () => {
            this.chat && this.chat.dispatch("hide");
        });
        this.addListener("show", () => {
            this.chat && this.chat.dispatch("show");
        });
    }
}

class DelayedPrivateChat extends Router {
    getNoChat() {
        return <h3 style={{marginTop: "40px", textAlign: "center"}}>Click on a chat box to start a conversation.</h3>;
    }

    getRoutes() {
        this.routes = this.routes || new Route(null, () => this.getNoChat(), [
            new Route("%s", (options) => {
                return <PrivateChatWidgetWrapper userId={parseInt(options.args[0])} style={{height: "100%"}}/>;
            })
        ]);
        return this.routes;
    }
}

class MessagesPanel extends UI.Element {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setStyle({
            border: "1px solid #ddd",
            height: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
            position: "relative",
        });
    }

    setURL(urlParts) {
        this.messagesPanelList.setActiveMiniMessage(parseInt(urlParts[0]));
        this.chatWidget.setURL(urlParts);
    }

    render() {
        return [
            <div style={{display: "inline-flex", height: "100%", overflow: "hidden", position: "relative"}}>
                <MessagesPanelList ref="messagesPanelList"
                                  style={{height: "100%", overflow: "auto", width: "250px",
                                          borderRight: "1px solid #ddd", transition: "margin .7s ease"}} />
            </div>,
            <Button ref="collapseButton" size={Size.SMALL} faIcon="chevron-left" level={Level.PRIMARY}
                    style={{position: "absolute", top: "15px", left: "208px", zIndex: "2017", transition: "all .7s ease"}}/>,
            <DelayedPrivateChat style={{display: "inline-block", flex: "1", width: "calc(100% - 250px)", height: "100%",
                                     transition: "width .7s ease", verticalAlign: "top"}} ref="chatWidget"/>
        ];
    }

    onMount() {
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
        });
    }
}

export {MiniMessage, MessagesPanel, MessagesList, IconMessagesList};