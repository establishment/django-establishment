// @ts-nocheck
import {UI, type ElementOptions, type ExtendedOptions, type HTMLTagType} from "../../../stemjs/ui/UIBase";
import {TimePassedSpan} from "../../../stemjs/ui/misc/TimePassedSpan";
import {Ajax} from "../../../stemjs/base/Ajax";
import {MarkupRenderer} from "../../../stemjs/markup/MarkupRenderer";
import {UserNotification} from "../../../csaaccounts/js/state/UserStore";
import {Emoji} from "../../../csabase/js/ui/EmojiUI";

export interface NotificationOptions {
    notification?: any;
}

class Notification extends UI.Element {
    declare options: ElementOptions<NotificationOptions>;

    getNodeType(): HTMLTagType {
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

    getChildrenToRender() {
        return [
            <div style={{textAlign: "initial"}}>{this.render()}</div>,
            <TimePassedSpan timeStamp={this.options.notification.dateCreated} />
        ];
    }
}

export interface RatingNotificationOptions {
    notification?: any;
}

class RatingNotification extends Notification {
    declare options: ExtendedOptions<Notification, RatingNotificationOptions>;

    getNotificationClass() {
        return "ratingNotification";
    }

    render() {
        let oldRating = this.options.notification.data.oldRating;
        let newRating = this.options.notification.data.newRating;
        if (oldRating < newRating) {
            return  ["Congratulations! Your rating has increased by ", <span style={{color: "green"}}>
                            {newRating - oldRating}</span> , " points ", <Emoji value="smile" />, ". Keep it up!"];
        } else {
            return ["Your rating has decreased by ", <span style={{color: "red"}}>{oldRating - newRating}</span> , " points ",
                        <Emoji value="disappointed" />, ". Better luck next time!", <Emoji value="smiley" />];
        }
    }
}

export interface AnnouncementNotificationOptions {
    notification?: any;
}

class AnnouncementNotification extends Notification {
    declare options: ExtendedOptions<Notification, AnnouncementNotificationOptions>;

    getNotificationClass() {
        return "announcementNotification";
    }

    render() {
        return <MarkupRenderer value={this.options.notification.data.value} />;
    }
}

export interface NotificationsListOptions {
    icon?: any;
}

class NotificationsList extends UI.Element {
    declare options: ElementOptions<NotificationsListOptions>;
    declare displayedNotifications: any;
    declare notificationsCount: any;
    declare unreadNotificationsCount: any;

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
        Ajax.getJSON("/accounts/get_user_notifications/", {});
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
        for (let notification of UserNotification.all().sort((x, y) => {
            return x.dateCreated - y.dateCreated;
        })) {
            this.handleNewNotification(notification);
        }
        this.attachCreateListener(UserNotification, (notification) => {
            this.handleNewNotification(notification);
        });
    }
}

NotificationsList.NotificationClassMap = new Map([
    ["ratingsChange", RatingNotification],
    ["announcement", AnnouncementNotification]
]);

export {NotificationsList};
