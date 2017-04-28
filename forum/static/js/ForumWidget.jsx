import {UI, Link} from "UI";
import {GlobalState} from "State";
import {ForumStore, ForumThreadStore} from "ForumStore";
import {PreviewMarkupButton} from "ChatWidget";
import {UserHandle} from "UserHandle";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {MessageThreadStore, MessageInstanceStore} from "MessageThreadStore";
import {ForumThreadPanel, CreateForumThreadButton, CreateForumThreadButtonWithUrl, ForumThreadPanelWithUrl} from "ForumThread";
import {URLRouter} from "URLRouter";
import * as Utils from "Utils";
import {ForumThreadHeaderStyle} from "ForumStyle";
import {ForumThreadPreviewStyle} from "ForumStyle";
import {ForumThreadBubbleStyle} from "ForumStyle";
import {ForumThreadPanelStyle} from "ForumStyle";
import {ForumPanelStyle} from "ForumStyle";
import {StateDependentElement} from "StateDependentElement";
import {Subrouter, Router} from "Router";
import {Dispatcher} from "Dispatcher";

let forumThreadHeaderStyle = ForumThreadHeaderStyle.getInstance();
let forumThreadPreviewStyle = ForumThreadPreviewStyle.getInstance();
let forumThreadBubbleStyle = ForumThreadBubbleStyle.getInstance();
let forumThreadPanelStyle = ForumThreadPanelStyle.getInstance();
let forumPanelStyle = ForumPanelStyle.getInstance();


class ForumThreadHeader extends UI.ConstructorInitMixin(UI.Element) {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        // TODO: this should not be cast as a String here!
        attr.addClass(forumThreadHeaderStyle.mainClass);
        return attr;
    }

    getTitle() {
        return <div className={forumThreadHeaderStyle.tagsTitle}>
            {UI.T("Title")}
        </div>;
    }

    getAuthor() {
        return <div className={forumThreadHeaderStyle.tagsAuthor}>
            {UI.T("Author")}
        </div>;
    }

    getReplies() {
        return <div className={forumThreadHeaderStyle.tagsReplies}>
            {UI.T("Replies")}
        </div>;
    }

    getViews() {
        return <div className={forumThreadHeaderStyle.tagsViews}>
            {UI.T("Views")}
        </div>;
    }

    getVotes() {
        return <div className={forumThreadHeaderStyle.tagsVotes}>
            {UI.T("Score")}
        </div>;
    }

    getActivity() {
        return <div className={forumThreadHeaderStyle.tagsActivity}>
            {UI.T("Active")}
        </div>;
    }

    render() {
        return [
            this.getTitle(),
            this.getAuthor(),
            this.getReplies(),
            this.getViews(),
            this.getVotes(),
            this.getActivity(),
        ];
    }
}

class ForumThreadPreview extends ChatMarkupRenderer {
    extraNodeAttributes(attr) {
        attr.addClass(forumThreadPreviewStyle.forumThreadPreview);
    }
}

class ForumThreadBubble extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        // TODO: this should not be cast as a String here!
        attr.addClass(forumThreadBubbleStyle.mainClass);
        // couldn't figure out how to solve this easier and better
        // if (this.options.isPinned) {
        //     attr.addClass(String(forumThreadBubbleStyle.backgroundColorPinnedInstances));
        // } else if (this.options.color == 0) {
        //     attr.addClass(String(forumThreadBubbleStyle.backgroundColorOddInstances));
        // } else {
        //     attr.addClass(String(forumThreadBubbleStyle.backgroundColorEvenInstances));
        // }
        return attr;
    }

    getHref() {
        return "#" + this.getForumThread().id + "/" + Utils.slugify(this.getForumThread().getTitle());
    }

    getForumThread() {
        return this.options.forumThread;
    }

    getThreadTitle() {
        let pinned = "";
        if (this.getForumThread().isPinned()) {
            pinned = <span className={"fa fa-thumb-tack " + forumThreadBubbleStyle.pinnedIcon} aria-hidden="true" style={{paddingTop: "0", lineHeight: "20px", height: "20px",}}/>;
        }
        let forumThread = this.getForumThread();
        return [
            <div className={forumThreadBubbleStyle.threadTitleAndPreview}>
                <div className={forumThreadBubbleStyle.threadTitle}
                    style={{paddingBottom: () => {
                        if (forumThread.getContentMessage().content) {
                            return forumThreadBubbleStyle.titlePaddingBottom;
                        }
                        return "0";
                    }}}>
                    {pinned}
                    <Link style={{"text-decoration": "none", "color": "inherit", "font-size": "14px", "text-align": "justify"}} href={this.getHref()}
                        value={<span className={forumThreadBubbleStyle.threadTitleSpan}>
                                {this.getForumThread().getTitle()}
                                </span>} />
                </div>
                <ForumThreadPreview value={this.getForumThread().getContentMessage().content} />
            </div>
        ];
    }

    getThreadAuthor() {
        return [
            <span className={forumThreadBubbleStyle.threadAuthor}>
                <UserHandle id={this.getForumThread().authorId} style={{
                    "line-height": "normal",
                    wordBreak: "break-word",
                }} />
            </span>
        ];
    }

    getThreadReplies() {
        return [
            <div className={forumThreadBubbleStyle.threadReplies}>
                <Link style={{
                    "text-decoration": "none",
                    "color": "inherit",
                }} href={this.getHref()} value={
                    <span className={forumThreadBubbleStyle.threadRepliesSpan}>
                        {this.getForumThread().getNumReplies()}
                    </span>
                } />
            </div>
        ];
    }

    getThreadViews() {
        return [
            <div className={forumThreadBubbleStyle.threadViews}>
                {this.getForumThread().numViews}
            </div>
        ];
    }

    getThreadVotes() {
        return [
            <div className={forumThreadBubbleStyle.threadVotes}>
                {this.getForumThread().getVotesBalance()}
            </div>
        ];
    }

    getThreadActivity() {
        let threadActivity = this.getForumThread().getLastActive();
        /* TODO @mihaic, this should support custom color option (but I didn't want to change stem files on my own). check UIPrimitives.jsx line 400 */
        return [
            <div className={forumThreadBubbleStyle.threadActivity}>
                <UI.TimePassedSpan timeStamp={threadActivity} />
            </div>
        ]
    }

    render() {
        return [
            this.getThreadTitle(),
            this.getThreadAuthor(),
            this.getThreadReplies(),
            this.getThreadViews(),
            this.getThreadVotes(),
            this.getThreadActivity(),
        ];
    }

    onMount() {
        super.onMount();
        this.getForumThread().addUpdateListener(() => {
            this.redraw();
        });
        this.getForumThread().addDeleteListener(() => {
            this.hide();
        });
    }
}

class ForumThreadBubbleWithUrl extends ForumThreadBubble {
    getHref() {
        return super.getHref().slice(1);
    }
}

class ForumThreadList extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle({
            width: "90%",
            margin: "0 auto",
            marginTop: "10px",
            marginBottom: "60px",
            // boxShadow: "0px 0px 10px #ddd", // TODO: Do we want this?
        });
        return attr;
    }

    getBubbleClass() {
        return ForumThreadBubble;
    }

    render() {
        let forumThreads = Array.from(this.options.forum.getForumThreads());

        forumThreads.sort((a, b) => {
            if (a.isPinned() && b.isPinned()) {
                return b.getPinIndex() - a.getPinIndex();
            }
            if (a.isPinned()) {
                return -1;
            }
            if (b.isPinned()) {
                return 1;
            }
            return b.lastActive - a.lastActive;
        });

        let result = [];
        let color = 1;
        result.push(<ForumThreadHeader/>);
        let Bubble = this.getBubbleClass();
        for (let forumThread of forumThreads) {
            result.push(<Bubble forumThread={forumThread} color={color} isPinned={forumThread.isPinned()}/>);
            if (!forumThread.isPinned()) {
                color = !color;
            }
        }
        return result;
    }

    onMount() {
        super.onMount();
        this.options.forum.addListener("newForumThread", () => {
            this.redraw();
        });
    }
}

class ForumThreadListWithUrl extends ForumThreadList {
    getBubbleClass() {
        return ForumThreadBubbleWithUrl;
    }
}

class ForumPanel extends UI.ConstructorInitMixin(UI.Panel) {
    extraNodeAttributes(attr) {
        attr.addClass(forumPanelStyle.mainClass);
    }

    getTitle() {
        return <div className={forumPanelStyle.title}>
                {this.options.forum.name}
            </div>;
    }

    getButton() {
        return <div className={forumPanelStyle.buttonParent}>
            <CreateForumThreadButton
                label="NEW POST"
                className={forumPanelStyle.button}
                size={UI.Size.DEFAULT}
                forumId={this.options.forum.id}
            />
        </div>;
    }

    getForumThreadList() {
        return <ForumThreadList forum={this.options.forum}/>;
    }

    render() {
        return [
            <div className={forumPanelStyle.header}>
                {this.getTitle()}
                {this.getButton()}
            </div>,
            this.getForumThreadList(),
        ];
    }
}

class ForumPanelWithUrl extends ForumPanel {
    getForumThreadList() {
        return <ForumThreadListWithUrl forum={this.options.forum}/>;
    }

    getButton() {
        return <div className={forumPanelStyle.buttonParent}>
            <CreateForumThreadButtonWithUrl
                label="NEW POST"
                className={forumPanelStyle.button}
                size={UI.Size.DEFAULT}
                forumId={this.options.forum.id}
                ref="newPostButton"
            />
        </div>;
    }
}

class ForumWidget extends UI.Switcher {
    setOptions(options) {
        super.setOptions(options);
        this.forumThreadMap = new Map();
    }

    render() {
        this.forumPanel = this.forumPanel || <ForumPanel forum={ForumStore.get(this.options.forumId)}/>;

        this.options.children = Utils.unwrapArray([
            this.forumPanel,
            Array.from(this.forumThreadMap.values()),
        ]);
        return super.render();
    }

    addForumThread(forumThread) {
        let forumThreadPanel = <ForumThreadPanel key={forumThread.id} forumThread={forumThread}/>;
        this.forumThreadMap.set(forumThread.id, forumThreadPanel);
        this.appendChild(forumThreadPanel);
    }

    switchToForumThread(forumThread) {
        if (!this.forumThreadMap.has(forumThread.id)) {
            this.addForumThread(forumThread);
        }
        this.setActive(this.forumThreadMap.get(forumThread.id));
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("margin-top", "40px");
        return attr;
    }

    onMount() {
        super.onMount();

        let handleLocation = (location) => {
            if (!location) {
                return;
            }
            try {
                if (location.args.length !== 0) {
                    let forumThread = ForumThreadStore.get(parseInt(location.args[0]));
                    if (!forumThread) {
                        URLRouter.route();
                        return;
                    }
                    if (location.args.length === 1) {
                        URLRouter.route(forumThread.id, Utils.slugify(forumThread.getTitle()));
                    } else {
                        this.switchToForumThread(forumThread);
                    }
                } else {
                    this.setActive(this.forumPanel);
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);

        ForumThreadStore.addListener("create", () => {
            this.dispatch("shouldRedrawChild", {child: this.forumPanel});
        });
        ForumThreadStore.addListener("delete", () => {
            this.dispatch("shouldRedrawChild", {child: this.forumPanel});
        });
    }
}

class DelayedForumWidget extends StateDependentElement(ForumWidget) {
    getAjaxUrl() {
        return "/" + this.options.args.join("/") + "/";
    }

    addForumThread(forumThread) {
        let forumThreadPanel = <ForumThreadPanelWithUrl key={forumThread.id} forumThread={forumThread} forumWidget={this} />;
        this.forumThreadMap.set(forumThread.id, forumThreadPanel);
        this.appendChild(forumThreadPanel);
    }

    importState(data) {
        super.importState(data);
        this.options.forumId = data.forumId;
    }

    renderLoaded() {
        this.forumPanel = this.forumPanel || <ForumPanelWithUrl forum={ForumStore.get(this.options.forumId)} forumWidget={this}/>;
        return super.renderLoaded();
    }

    registerSubrouter() {
        let handleLocation = (args) => {
            if (args.length !== 0) {
                let forumThread = ForumThreadStore.get(parseInt(args[0]));
                if (!forumThread) {
                    this.getUrlRouter().setState([], true);
                    return;
                }
                if (args.length !== 2 || args[1] !== Utils.slugify(forumThread.getTitle())) {
                    this.getUrlRouter().setState([forumThread.id, Utils.slugify(forumThread.getTitle())], true);
                } else {
                    this.switchToForumThread(forumThread);
                }
            } else {
                this.setActive(this.forumPanel);
            }
        };

        this.urlRouter = new Subrouter( Router.Global.getCurrentRouter(),
                                        [...Router.Global.getCurrentRouter().getPrefix(), "forum"],
                                        this.options.subArgs || []);
        Router.Global.getCurrentRouter().registerSubrouter(this.urlRouter);
        this.getUrlRouter().addChangeListener(handleLocation);
        this.getUrlRouter().addExternalChangeListener(handleLocation);
    }

    getUrlRouter() {
        return this.urlRouter;
    }

    onDelayedMount() {
        this.registerSubrouter();

        this.forumPanel.newPostButton.options.urlRouter = this.getUrlRouter();

        this.getUrlRouter().dispatch("change", this.getUrlRouter().getState());

        let handleChangeUrl = () => {
            let currentUrl = Router.parseURL();
            if (currentUrl.length >= this.getUrlRouter().getPrefix().length) {
                let currentPrefix = currentUrl.slice(0, this.getUrlRouter().getPrefix().length);
                if (currentPrefix.join("/") === this.getUrlRouter().getPrefix().join("/")) {
                    this.getUrlRouter().getParentRouter().setActiveSubrouter(this.getUrlRouter());
                    this.getUrlRouter().setState(currentUrl.slice(currentPrefix.length), true);
                } else if (this.getUrlRouter().getParentRouter().getActiveSubrouter() === this.getUrlRouter()) {
                    this.getUrlRouter().getParentRouter().resetActiveSubrouter();
                }
            }
        };

        Dispatcher.Global.addListener("changeURL", handleChangeUrl);
        Router.Global.addListener("change", handleChangeUrl);

        ForumThreadStore.addListener("create", () => {
            this.dispatch("shouldRedrawChild", {child: this.forumPanel});
        });
        ForumThreadStore.addListener("delete", () => {
            this.dispatch("shouldRedrawChild", {child: this.forumPanel});
        });
    }
}

export {ForumWidget, DelayedForumWidget};
