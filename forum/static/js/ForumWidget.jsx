import {UI, Panel, Link, Route, Router, TimePassedSpan} from "UI";
import {Dispatcher} from "base/Dispatcher";
import {Ajax} from "base/Ajax";
import {GlobalState} from "State";
import {ForumStore, ForumThreadStore} from "ForumStore";
import {PreviewMarkupButton} from "ChatWidget";
import {UserHandle} from "UserHandle";
import {ChatMarkupRenderer} from "ChatMarkupRenderer";
import {MessageThreadStore, MessageInstanceStore} from "MessageThreadStore";
import {ForumThreadPanel, CreateForumThreadButton} from "ForumThread";
import {slugify} from "base/Utils"; // TODO: import the individual methods
import {ForumThreadHeaderStyle, ForumThreadPreviewStyle, ForumThreadBubbleStyle, ForumPanelStyle} from "ForumStyle";
import {StateDependentElement} from "StateDependentElement";
import {Size} from "ui/Constants";

let forumThreadHeaderStyle = ForumThreadHeaderStyle.getInstance();
let forumThreadPreviewStyle = ForumThreadPreviewStyle.getInstance();
let forumThreadBubbleStyle = ForumThreadBubbleStyle.getInstance();
let forumPanelStyle = ForumPanelStyle.getInstance();


class ForumThreadHeader extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(forumThreadHeaderStyle.mainClass);
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
        return "/forum/" + this.getForumThread().id + "/" + slugify(this.getForumThread().getTitle());
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
                <TimePassedSpan timeStamp={threadActivity} />
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

class ForumPanel extends Panel {
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
                size={Size.DEFAULT}
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

    onMount() {
        this.attachListener(ForumThreadStore, "create", () => this.redraw());
        this.attachListener(ForumThreadStore, "delete", () => this.redraw());
    }
}

class DelayedForumPanel extends StateDependentElement(ForumPanel) {
    importState(data) {
        super.importState(data);
        this.options.forum = ForumStore.get(this.options.forumId);
    }
}

class DelayedForumThreadPanel extends StateDependentElement(ForumThreadPanel) {
    // TODO: must be able to specify if URL is POST or GET in StateDependentElement
    beforeRedrawNotLoaded() {
        Ajax.postJSON("/forum/forum_thread_state/", {
            forumThreadId: this.options.forumThreadId,
        }).then(
            (data) => {
                this.importState(data);
                this.setLoaded();
            },
            (error) => {
                console.error(error);
            }
        );
    }

    importState(data) {
        super.importState(data);
        this.options.forumThread = ForumThreadStore.get(this.options.forumThreadId);
    }
}

class ForumRoute extends Route {
    getSubroutes() {
        return [
            new Route(["%s", "%s"], (options) => {
                const forumThreadId = options.args[options.args.length - 2];

                const forumThread = ForumThreadStore.get(forumThreadId);

                if (forumThread) {
                    return <ForumThreadPanel forumThread={forumThread} />;
                } else {
                    return <DelayedForumThreadPanel forumThreadId={forumThreadId} />;
                }
            }),
        ]
    }

    constructor(expr="forum", options={}) {
        super(expr, DelayedForumPanel, [], options);
        this.subroutes = this.getSubroutes();
    }
}

export {ForumRoute};
