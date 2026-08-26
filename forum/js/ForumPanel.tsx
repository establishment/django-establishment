// @ts-nocheck
import {UI, type ElementOptions} from "../../../stemjs/ui/UIBase";
import {Link} from "../../../stemjs/ui/primitives/Link";
import {Route} from "../../../stemjs/ui/Router";
import {registerStyle} from "../../../stemjs/ui/style/Theme";
import {TimePassedSpan} from "../../../stemjs/ui/misc/TimePassedSpan";
import {Ajax} from "../../../stemjs/base/Ajax";
import {slugify, multikeySort} from "../../../stemjs/base/Utils";
import {StateDependentElement} from "../../../stemjs/ui/StateDependentElement";

import {UserHandle} from "../../../csaaccounts/js/UserHandle";
import {ChatMarkupRenderer} from "../../chat/js/ChatMarkupRenderer";
import {Forum, ForumThread} from "./state/ForumStore";
import {ForumThreadPanel, CreateForumThreadButton} from "./ForumThread";
import {ForumThreadHeaderStyle, ForumThreadPreviewStyle, ForumThreadBubbleStyle, ForumPanelStyle} from "./ForumStyle";
import {autoredraw} from "../../../stemjs/decorators/AutoRedraw";


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

export interface ForumThreadBubbleOptions {
    forumThread?: any;
}

@autoredraw
@registerStyle(ForumThreadBubbleStyle)
export class ForumThreadBubble extends UI.Element {
    declare options: ElementOptions<ForumThreadBubbleOptions>;

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

export interface ForumThreadListOptions {
    forum?: any;
}

export class ForumThreadList extends UI.Element {
    declare options: ElementOptions<ForumThreadListOptions>;

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
        // Pinned threads come first, ordered among themselves by pin index rather than by activity
        const forumThreads = multikeySort(this.options.forum.getForumThreads(), forumThread => {
            const isPinned = forumThread.isPinned();
            return [isPinned, isPinned ? forumThread.getPinIndex() : forumThread.lastActive];
        }, {desc: true});

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

export interface ForumPanelOptions {
    forum?: any;
}

@registerStyle(ForumPanelStyle)
export class ForumPanel extends UI.Element {
    declare options: ElementOptions<ForumPanelOptions>;

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
        this.attachListener(ForumThread, "create", () => this.redraw());
        this.attachListener(ForumThread, "delete", () => this.redraw());
    }
}

export class DelayedForumPanel extends StateDependentElement(ForumPanel) {
    importState(data) {
        super.importState(data);
        this.options.forum = Forum.get(this.options.forumId);
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
        this.options.forumThread = ForumThread.get(this.options.forumThreadId);
    }
}

export class ForumRoute extends Route {
    getSubroutes() {
        return [
            new Route(["%s", "%s"], (options) => {
                const forumThreadId = options.args[options.args.length - 2];

                const forumThread = ForumThread.get(forumThreadId);

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
