import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {Link} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {Route} from "../../../stemjs/src/ui/Router.jsx";
import {registerStyle} from "../../../stemjs/src/ui/style/Theme.js";
import {TimePassedSpan} from "../../../stemjs/src/ui/misc/TimePassedSpan.jsx";
import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {slugify} from "../../../stemjs/src/base/Utils.js";
import {StateDependentElement} from "../../../stemjs/src/ui/StateDependentElement.jsx";

import {UserHandle} from "../../../csaaccounts/js/UserHandle.jsx";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer.jsx";
import {ForumStore, ForumThreadStore} from "./state/ForumStore.js";
import {ForumThreadPanel, CreateForumThreadButton} from "./ForumThread.jsx";
import {ForumThreadHeaderStyle, ForumThreadPreviewStyle, ForumThreadBubbleStyle, ForumPanelStyle} from "./ForumStyle.js";
import {autoredraw} from "../../../stemjs/src/decorators/AutoRedraw.js";


@registerStyle(ForumThreadHeaderStyle)
export class ForumThreadHeader extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.mainClass);
    }

    getTitle() {
        return <div className={this.styleSheet.tagsTitle}>
            {UI.T("Title")}
        </div>;
    }

    getAuthor() {
        return <div className={this.styleSheet.tagsAuthor}>
            {UI.T("Author")}
        </div>;
    }

    getReplies() {
        return <div className={this.styleSheet.tagsReplies}>
            {UI.T("Replies")}
        </div>;
    }

    getViews() {
        return <div className={this.styleSheet.tagsViews}>
            {UI.T("Views")}
        </div>;
    }

    getVotes() {
        return <div className={this.styleSheet.tagsVotes}>
            {UI.T("Score")}
        </div>;
    }

    getActivity() {
        return <div className={this.styleSheet.tagsActivity}>
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

@registerStyle(ForumThreadPreviewStyle)
export class ForumThreadPreview extends ChatMarkupRenderer {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.forumThreadPreview);
    }
}

@autoredraw
@registerStyle(ForumThreadBubbleStyle)
export class ForumThreadBubble extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass(this.styleSheet.mainClass);
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
            pinned = <span className={"fa fa-thumb-tack " + this.styleSheet.pinnedIcon} aria-hidden="true" style={{paddingTop: "0", lineHeight: "20px", height: "20px",}}/>;
        }
        let forumThread = this.getForumThread();
        return [
            <div className={this.styleSheet.threadTitleAndPreview}>
                <div className={this.styleSheet.threadTitle}
                    style={{paddingBottom: () => {
                        if (forumThread.getContentMessage().content) {
                            return this.styleSheet.titlePaddingBottom;
                        }
                        return "0";
                    }}}>
                    {pinned}
                    <Link style={{"text-decoration": "none", "color": "inherit", "font-size": "14px", "text-align": "justify"}} href={this.getHref()}
                        value={<span className={this.styleSheet.threadTitleSpan}>
                                {this.getForumThread().getTitle()}
                                </span>} />
                </div>
                <ForumThreadPreview value={this.getForumThread().getContentMessage().content} />
            </div>
        ];
    }

    getThreadAuthor() {
        return [
            <span className={this.styleSheet.threadAuthor}>
                <UserHandle id={this.getForumThread().authorId} style={{
                    "line-height": "normal",
                    wordBreak: "break-word",
                }} />
            </span>
        ];
    }

    getThreadReplies() {
        return [
            <div className={this.styleSheet.threadReplies}>
                <Link style={{
                    "text-decoration": "none",
                    "color": "inherit",
                }} href={this.getHref()} value={
                    <span className={this.styleSheet.threadRepliesSpan}>
                        {this.getForumThread().getNumReplies()}
                    </span>
                } />
            </div>
        ];
    }

    getThreadViews() {
        return [
            <div className={this.styleSheet.threadViews}>
                {this.getForumThread().numViews}
            </div>
        ];
    }

    getThreadVotes() {
        return [
            <div className={this.styleSheet.threadVotes}>
                {this.getForumThread().getVotesBalance()}
            </div>
        ];
    }

    getThreadActivity() {
        let threadActivity = this.getForumThread().getLastActive();
        /* TODO @mihaic, this should support custom color option (but I didn't want to change stem files on my own). check UIPrimitives.jsx line 400 */
        return [
            <div className={this.styleSheet.threadActivity}>
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
}

export class ForumThreadList extends UI.Element {
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

@registerStyle(ForumPanelStyle)
export class ForumPanel extends Panel {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.mainClass);
    }

    getTitle() {
        return <div className={this.styleSheet.title}>
                {this.options.forum.name}
            </div>;
    }

    getButton() {
        return <div className={this.styleSheet.buttonParent}>
            <CreateForumThreadButton
                label="NEW POST"
                className={this.styleSheet.button}
                forumId={this.options.forum.id}
            />
        </div>;
    }

    getForumThreadList() {
        return <ForumThreadList forum={this.options.forum}/>;
    }

    render() {
        return [
            <div className={this.styleSheet.header}>
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

export class DelayedForumPanel extends StateDependentElement(ForumPanel) {
    importState(data) {
        super.importState(data);
        this.options.forum = ForumStore.get(this.options.forumId);
    }
}

export class DelayedForumThreadPanel extends StateDependentElement(ForumThreadPanel) {
    // TODO: must be able to specify if URL is POST or GET in StateDependentElement
    beforeRedrawNotLoaded() {
        Ajax.postJSON("/forum/forum_thread_state/", {
            forumThreadId: this.options.forumThreadId,
        }).then(
            (data) => {
                this.importState(data);
                this.setLoaded();
            },
            () => {}
        );
    }

    importState(data) {
        super.importState(data);
        this.options.forumThread = ForumThreadStore.get(this.options.forumThreadId);
    }
}

export class ForumRoute extends Route {
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
