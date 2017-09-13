import {Ajax} from "Ajax";
import {UI, Button, Link, Modal, Form, FormField, TextInput, FormGroup, CheckboxInput, TemporaryMessageArea} from "UI";
import {StemDate} from "Time";
import {GlobalState} from "State";
import {BlogEntryStore} from "BlogStore";
import {ArticleStore} from "ArticleStore";
import {MarkupEditor} from "markup/MarkupEditor";
import {UserHandle} from "UserHandle";
import {BlogArticleRenderer} from "./BlogArticleRenderer";
import {ArticleEditor} from "ArticleEditor";
import {AsyncCommentThread} from "CommentWidget";
import {ErrorHandlers} from "ErrorHandlers";
import {slugify} from "Utils";
import {FAIcon} from "FontAwesome";
import {BlogStyle} from "BlogStyle";
import {StateDependentElement} from "StateDependentElement";
import {Route, Router} from "Router";
import {Dispatcher} from "Dispatcher";

import {Theme} from "ui/style/Theme";
import {Level} from "ui/Constants";

export class BlogEntryEditModal extends Modal {
    getModalWindowStyle() {
        return Object.assign({}, super.getModalWindowStyle(), {
            margin: "0 auto",
            maxHeight: "100%",
            overflow: "initial",
            display: "flex",
            flexDirection: "column",
            top: "1vh",
            height: "98vh",
        });
    }

    render() {
        let entry = BlogEntryStore.get(this.options.entryId);
        let article = entry.getArticle();

        let discussionButton = null;
        if (!entry.discussionId) {
            discussionButton = <Button level={Level.WARNING} label="Create discussion"
                                       onClick={() => this.createDiscussion()} style={{marginLeft: "5px"}}/>;
        }

        return [
            <h3>Edit Entry</h3>,
            <Form>
                <FormField label="Title">
                    <TextInput ref="titleInput" value={article.name} />
                </FormField>
                <FormField label="URL Name">
                    <TextInput ref="urlInput" value={entry.urlName} />
                </FormField>
                <FormField label="Visible">
                    <CheckboxInput ref="visibleCheckbox" value={entry.visible} />
                </FormField>
                <Button level={Level.PRIMARY} label="Change settings" onClick={() => this.changeSettings()} />
                {discussionButton}
                <TemporaryMessageArea ref="messageArea"/>
            </Form>,
            <ArticleEditor ref="contentEditor" articleId={article.id} style={{flex: "1"}} />
        ];
    }

    changeSettings() {
        let title = this.titleInput.getValue();
        let urlName = this.urlInput.getValue();

        let request = {
            entryId: this.options.entryId,
            isVisible: this.visibleCheckbox.getValue(),
        };

        if (title) {
            request.title = title;
        }

        if (urlName) {
            request.urlName = urlName;
        }

        Ajax.postJSON("/blog/change_entry_settings/", request).then(
            (data) => {
                if (data.urlName) {
                    Router.changeURL(["blog", data.urlName]);
                }
                this.hide();
            }
        );
    }

    createDiscussion() {
        let request = {
            entryId: this.options.entryId
        };

        Ajax.postJSON("/blog/create_entry_discussion/", request).then(
            () => this.hide()
        );
    }
}

export class NewBlogEntryModal extends Modal {
    render() {
        return [
            <h1>New Entry</h1>,
            <FormGroup>
                <FormField label="Title">
                    <TextInput ref="titleInput" />
                </FormField>
                <FormField label="URL Name">
                    <TextInput ref="urlInput" />
                </FormField>
                <FormField label="Visible">
                    <CheckboxInput ref="visibleCheckbox"/>
                </FormField>
                <Button label="Add Entry" level={Level.PRIMARY} onClick={() => {this.addEntry()}}/>
                <MarkupEditor ref="postContentMarkup" style={{height: "450px"}} />
            </FormGroup>
        ];
    }

    onMount() {
        super.onMount();

        this.titleInput.onKeyUp(() => {
            this.urlInput.setValue(slugify(this.titleInput.getValue()));
        });
    }

    addEntry() {
        let data = {};

        let title = this.titleInput.getValue();
        if (title) {
            data.title = title;
        }

        let urlName = this.urlInput.getValue();
        if (urlName) {
            data.urlName = urlName;
        }

        data.isVisible = this.visibleCheckbox.getValue();

        let content = this.postContentMarkup.getValue();
        if (content) {
            data.content = content;
        }

        Ajax.postJSON("/blog/add_entry/", data).then(
            (data) => {
                let blogEntry = BlogEntryStore.get(data.blogEntryId);
                Router.changeURL(["blog", blogEntry.urlName]);
                this.hide();
            }
        );
    }
}

class BlogEntryPreview extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            position: "relative",
            maxHeight: "420px",
            marginTop: "45px",
            marginBottom: "45px",
        });
    }

    canOverwrite(obj) {
        return super.canOverwrite(obj) && this.options.entryId === obj.options.entryId;
    }

    getBlogEntry() {
        return BlogEntryStore.get(this.options.entryId);
    }

    getBlogArticle() {
        return this.getBlogEntry().getArticle();
    }

    getEntryURL() {
        return "/blog/" + this.getBlogEntry().urlName + "/";
    }

    render() {
        const blogStyle = this.getStyleSheet();
        const article = this.getBlogArticle();

        // TODO: not actually the published date
        let publishedDate = article.dateCreated;
        let publishedFormat = StemDate.unix(publishedDate).format("LL");
        let modifiedFormat;

        let articleInfoStyle = {
            color: "#777",
            fontSize: "1em",
            margin: "0",
            fontStyle: "italic",
        };

        if (article.dateModified > article.dateCreated) {
            modifiedFormat = <p style={articleInfoStyle}>{UI.T("Last update on")} {StemDate.unix(article.dateModified).format("LL")}.</p>
        }

        return [
            <div style={{height: "100%",}}>
                <div style={{
                    boxShadow: "0px 0px 10px rgb(160, 162, 168)",
                    "background-color": "#fff",
                    "padding": "1% 4% 10px 4%",
                    "margin": "0 auto",
                    "width": "900px",
                    "max-width": "100%",
                    position: "relative"
                }}>
                    <div style={blogStyle.writtenBy}>
                        {UI.T("Written by")} <UserHandle
                        userId={article.userCreatedId}/>, {publishedFormat}.{modifiedFormat}
                    </div>
                    <div style={blogStyle.title}>
                        <Link href={this.getEntryURL()} value={article.name}
                              style={{"text-decoration": "none", "color": "inherit"}}/>
                    </div>
                    <BlogArticleRenderer article={article} style={blogStyle.blogArticleRenderer}/>
                    <div className={blogStyle.whiteOverlay}></div>
                    <Link href={this.getEntryURL()} style={blogStyle.link} value={UI.T("Continue reading")}/>
                </div>
            </div>
        ];
    }
}

class BlogEntryView extends UI.Element {
    get pageTitle() {
        return this.getBlogArticle().name;
    }

    getBlogEntry() {
        return BlogEntryStore.get(this.options.entryId);
    }

    getBlogArticle() {
        return this.getBlogEntry().getArticle();
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.getStyleSheet().blogEntryView);
    }

    getComments() {
        let chatId = this.getBlogEntry().discussionId;
        if (!chatId) {
            return null;
        }
        return (<div style={{marginBottom: "20px", marginTop: "20px"}}>
            <AsyncCommentThread chatId={chatId}/>
        </div>);
    }

    render() {
        const article = this.getBlogArticle();
        const blogStyle = this.getStyleSheet();

        // TODO: not actually the published date
        let publishedDate = article.dateCreated;
        let publishedFormat = StemDate.unix(publishedDate).format("LL");
        let modifiedFormat;

        let articleInfoStyle = {
            margin: "3px",
            color: "#777",
            fontSize: "1em",
            fontStyle: "italic",
        };

        if (article.dateModified > article.dateCreated) {
            modifiedFormat = <p style={articleInfoStyle}>Last update on {StemDate.unix(article.dateModified).format("LL")}.</p>
        }

        let blogEntryEditButton;
        // TODO: should use proper rights
        if (USER.isSuperUser) {
            blogEntryEditButton = <Button level={Level.DEFAULT} label="Edit" onClick={() => {
                BlogEntryEditModal.show({entryId: this.getBlogEntry().id, fillScreen: true});
            }}/>
        }

        return [
            <div style={{
                "background-color": "#fff",
                "padding": "2% 5%",
                "box-shadow": "rgb(160, 160, 160) 0px 3px 15px",
            }}>
                {blogEntryEditButton}
                <div style={blogStyle.writtenBy}>
                    Written by <UserHandle userId={article.userCreatedId}/> on {publishedFormat}.
                    {modifiedFormat}
                </div>
                <div style={blogStyle.title}>{article.name}</div>
                <BlogArticleRenderer style={blogStyle.article} article={article}/>
                <div style={{
                    "margin-top": "30px",
                    "margin-bottom": "10px",
                }}>
                    <Link href="/blog/" style={blogStyle.link} value="Back to the Main Blog"/>
                </div>
                {this.getComments()}
            </div>,
            <div className={blogStyle.bottomSection}>
            </div>
        ];
    }
}

class BlogEntryList extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle("paddingTop", "10px");
    }

    showNewBlogPostModal() {
        let modal = <NewBlogEntryModal fillScreen/>;
        modal.show();
    }

    render() {
        const blogStyle = this.getStyleSheet();

        let entries = [];

        let blogEntries = BlogEntryStore.all().sort((a, b) => {
            return b.getArticle().dateCreated - a.getArticle().dateCreated;
        });

        for (let entry of blogEntries) {
            entries.push(<BlogEntryPreview key={entry.id} entryId={entry.id}/>);
        }

        return [
            USER.isSuperUser ?
                <Button label="New Entry"
                        level={Level.DEFAULT}
                        onClick={() => this.showNewBlogPostModal()}
                />
                : null,
            <div ref="entriesList">
                {entries}
            </div>,
            <Button label={this.options.finishedLoading ? UI.T("End of blog") : UI.T("Load More")}
                    ref="loadMoreButton"
                    style={{margin: "0px auto", display: "block"}}
                    className={blogStyle.loadMoreButton}
                    disabled={this.options.finishedLoading} />,
            <div style={{
                height: "45px",
                width: "100%",
            }}/>
        ];
    }

    onMount() {
        super.onMount();

        this.loadMoreButton.addClickListener(() => {
            if (!this.options.finishedLoading) {
                Ajax.getJSON("/blog/", {
                    lastDate: Math.min.apply(null, BlogEntryStore.all().map(x => x.getArticle().dateCreated))
                }).then(
                    (data) => {
                        this.options.finishedLoading = data.finishedLoading;
                        if (this.options.finishedLoading) {
                            this.loadMoreButton.options.label = UI.T("No more posts");
                            this.loadMoreButton.redraw();
                            this.loadMoreButton.disable();
                        }
                        this.redraw();
                    }
                );
            }
        });

        this.attachCreateListener(BlogEntryStore, () => {
            this.redraw();
        });
    }
}

Theme.register(BlogEntryView, BlogStyle);
Theme.register(BlogEntryPreview, BlogStyle);
Theme.register(BlogEntryList, BlogStyle);

class DelayedBlogEntryList extends StateDependentElement(BlogEntryList) {
}

class DelayedBlogEntryView extends StateDependentElement(BlogEntryView) {
    getBlogEntry() {
        return BlogEntryStore.getEntryForURL(this.options.entryURL);
    }

    get pageTitle() {
        if (this.getBlogEntry()) {
            return super.pageTitle;
        } else {
            return null;
        }
    }

    set pageTitle(value) {
    }

    onDelayedMount() {
        super.onDelayedMount();
        Router.updateURL();
    }

    getAjaxUrl() {
        return "/blog/get_blog_post/";
    }

    getAjaxRequest() {
        return {
            entryUrlName: this.options.entryURL,
        }
    }
}

class BlogRoute extends Route {
    getSubroutes() {
        return [
            new Route("%s", (options) => {
                let entryURL = options.args[options.args.length - 1];

                let blogEntry = BlogEntryStore.getEntryForURL(entryURL);

                if (blogEntry) {
                    return <BlogEntryView entryId={blogEntry.id} />;
                } else {
                    return <DelayedBlogEntryView entryURL={entryURL} />;
                }
            }),
        ]
    }

    constructor(expr="blog", options={}) {
        options.title = options.title || "Blog";
        super(expr, DelayedBlogEntryList, [], options);
        this.subroutes = this.getSubroutes();
    }
}

export {BlogEntryPreview, DelayedBlogEntryList, DelayedBlogEntryView, BlogEntryView, BlogRoute};
