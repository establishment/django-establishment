import {Ajax} from "Ajax";
import {UI, Button, Link} from "UI";
import {StemDate} from "Time";
import {GlobalState} from "State";
import {BlogEntryStore} from "BlogStore";
import {ArticleStore} from "ArticleStore";
import {MarkupEditor} from "MarkupEditor";
import {UserHandle} from "UserHandle";
import {BlogArticleRenderer} from "./BlogArticleRenderer";
import {ArticleEditor} from "ArticleEditor";
import {AsyncCommentThread} from "CommentWidget";
import {URLRouter} from "URLRouter";
import {ErrorHandlers} from "ErrorHandlers";
import * as Utils from "Utils";
import {FAIcon} from "FontAwesome";
import {css, hover, focus, active, StyleSet} from "Style";
import {BlogStyle} from "BlogStyle";
import {StateDependentElement} from "StateDependentElement";
import {Subrouter, Router} from "Router";
import {Dispatcher} from "Dispatcher";

let blogStyle = BlogStyle.getInstance();

class BlogEntryEditModal extends UI.Modal {
    getModalWindowStyle() {
        return Object.assign({}, super.getModalWindowStyle(), {
            margin: "0 auto",
            maxHeight: "100%",
            overflow: "initial",
            height: "100%",
        });
    }

    getGivenChildren() {
        let entry = BlogEntryStore.get(this.options.entryId);
        let article = entry.getArticle();

        let discussionButton = null;
        if (!entry.discussionId) {
            discussionButton = <Button level={UI.Level.WARNING} label="Create discussion"
                                       onClick={() => this.createDiscussion()} style={{marginLeft: "5px"}}/>;
        }

        return [
            <h3>Edit Entry</h3>,
            <UI.Form>
                <UI.FormField label="Title">
                    <UI.TextInput ref="titleInput" value={article.name} />
                </UI.FormField>
                <UI.FormField label="URL Name">
                    <UI.TextInput ref="urlInput" value={entry.urlName} />
                </UI.FormField>
                <UI.FormField label="Visible">
                    <UI.CheckboxInput ref="visibleCheckbox" value={entry.visible} />
                </UI.FormField>
                <Button level={UI.Level.PRIMARY} label="Change settings" onClick={() => this.changeSettings()} />
                {discussionButton}
                <UI.TemporaryMessageArea ref="messageArea"/>
            </UI.Form>,
            <ArticleEditor ref="contentEditor" articleId={article.id} style={{height: "600px"}} />
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
                console.log("Changed contest settings!", data);

                if (data.urlName) {
                    URLRouter.route(data.urlName, "edit");
                }
                this.redraw();
            },
            (error) => {
                console.log("Error in changing contest settings!");
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in changing contest settings!", "red");
            }
        );
    }

    createDiscussion() {
        let request = {
            entryId: this.options.entryId
        };

        Ajax.postJSON("/blog/create_entry_discussion/", request).then(
            (data) => {
                console.log("Created discussion!", data);
                GlobalState.importState(data.state);
                this.hide();
            },
            (error) => {
                console.log("Error in creating discussion!");
                console.log(error.message);
                console.log(error.stack);
                this.messageArea.showMessage("Error in creating discussion!", "red");
            }
        );
    }
}

class NewBlogEntryModal extends UI.Modal {
    getGivenChildren() {
        return [
            <h1>New Entry</h1>,
            <UI.FormGroup>
                <UI.FormField label="Title">
                    <UI.TextInput ref="titleInput" />
                </UI.FormField>
                <UI.FormField label="URL Name">
                    <UI.TextInput ref="urlInput" />
                </UI.FormField>
                <UI.FormField label="Visible">
                    <UI.CheckboxInput ref="visibleCheckbox"/>
                </UI.FormField>
                <Button label="Add Entry" level={UI.Level.PRIMARY} onClick={() => {this.addEntry()}}/>
                <MarkupEditor ref="postContentMarkup" style={{height: "450px"}} />
            </UI.FormGroup>
        ];
    }

    onMount() {
        super.onMount();

        let modifiedURLInput = false;

        this.titleInput.onKeyUp(() => {
            if (!modifiedURLInput) {
                this.urlInput.setValue(Utils.slugify(this.titleInput.getValue()));
            }
        });

        this.urlInput.addChangeListener(() => {
            modifiedURLInput = true;
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
                if (data.error) {
                    ErrorHandlers.SHOW_ERROR_ALERT(data.error);
                } else {
                    GlobalState.importState(data.state);
                    let blogEntry = BlogEntryStore.get(data.blogEntryId);
                    URLRouter.route(blogEntry.urlName);
                    this.hide();
                }
            },
            (error) => {
                console.log("Error in adding blog post!");
                console.log(error.message);
                console.log(error.stack);
            }
        );
    }
}


class BlogEntryPreview extends UI.Element {
    setOptions(options) {
        super.setOptions(options);

        this.options.urlPrefix = this.options.urlPrefix || "";

        this.options.maxHeight = this.options.maxHeight || "240px";

        this.entry = BlogEntryStore.get(this.options.entryId);
        this.article = this.entry.getArticle();
    }

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

    render() {
        // TODO: not actually the published date
        let publishedDate = this.article.dateCreated;
        let publishedFormat = StemDate.unix(publishedDate).format("LL");
        let modifiedFormat;

        let articleInfoStyle = {
            margin: "3px",
            color: "#777",
            fontSize: "1em",
            margin: "0",
            fontStyle: "italic",
        };

        if (this.article.dateModified > this.article.dateCreated) {
            modifiedFormat = <p style={articleInfoStyle}>Last update on {StemDate.unix(this.article.dateModified).format("LL")}.</p>
        }

        return [
            <div style={{height: "100%",}}>
            <div style={{boxShadow: "0px 0px 10px rgb(160, 162, 168)", "background-color": "#fff", "padding": "1% 4% 10px 4%", "margin": "0 auto", "width": "900px", "max-width": "100%", position: "relative"}}> <div style={blogStyle.writtenBy}>
                Written by <UserHandle userId={this.article.userCreatedId}/> on {publishedFormat}.{modifiedFormat}
              </div>
              <div style={blogStyle.title}>
                <Link href={this.options.urlPrefix + this.entry.urlName + "/"} value={this.article.name}
                      style={{"text-decoration": "none", "color": "inherit"}} />
              </div>
              <BlogArticleRenderer article={this.article} style={blogStyle.blogArticleRenderer}/>
              <div className={blogStyle.whiteOverlay}></div>
              <Link href={this.options.urlPrefix + this.entry.urlName + "/"} style={blogStyle.link} value="Continue reading" />
            </div>
            </div>
        ];
    }
}

class BlogEntryView extends UI.Element {
    setOptions(options) {
        super.setOptions(options);

        if (this.options.entryId) {
            this.entry = BlogEntryStore.get(this.options.entryId);
            this.article = this.entry.getArticle();
        }
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.addClass(blogStyle.blogEntryView);
        return attr;
    }

    getComments() {
        let chatId = this.entry.discussionId;
        if (!chatId) {
            return null;
        }
        return (<div style={{marginBottom: "20px", marginTop: "20px"}}>
            <AsyncCommentThread chatId={chatId}/>
        </div>);
    }

    render() {
        // TODO: not actually the published date
        let publishedDate = this.article.dateCreated;
        let publishedFormat = StemDate.unix(publishedDate).format("LL");
        let modifiedFormat;

        let articleInfoStyle = {
            margin: "3px",
            color: "#777",
            fontSize: "1em",
            fontStyle: "italic",
        };

        if (this.article.dateModified > this.article.dateCreated) {
            modifiedFormat = <p style={articleInfoStyle}>Last update on {StemDate.unix(this.article.dateModified).format("LL")}.</p>
        }

        let blogEntryEditButton;
        if (USER.isSuperUser) {
            blogEntryEditButton = <Button level={UI.Level.DEFAULT} label="Edit" onClick={() => {
                if (!this.blogEntryEditModal) {
                    this.blogEntryEditModal = <BlogEntryEditModal entryId={this.options.entryId} fillScreen/>;
                    this.blogEntryEditModal.mount(document.body);
                }
                this.blogEntryEditModal.show();
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
                    Written by <UserHandle userId={this.article.userCreatedId}/> on {publishedFormat}.
                    {modifiedFormat}
                </div>
                <div style={blogStyle.title}>{this.article.name}</div>
                <BlogArticleRenderer style={blogStyle.article} article={this.article}/>
                <div style={{
                    "margin-top": "30px",
                    "margin-bottom": "10px",
                }}>
                    <a href="blog/" style={blogStyle.link}>
                        Back to the Main Blog
                    </a>
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

    render() {
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
                           level={UI.Level.DEFAULT}
                           onClick={() => this.newBlogPostModal.show()}
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
            }}></div>
        ];
    }

    onMount() {
        this.newBlogPostModal = <NewBlogEntryModal fillScreen/>;
        this.newBlogPostModal.mount(document.body);
        super.onMount();

        this.loadMoreButton.addClickListener(() => {
            if (!this.options.finishedLoading) {
                Ajax.getJSON("/blog/", {
                    lastDate: Math.min.apply(null, BlogEntryStore.all().map(x => x.getArticle().dateCreated))
                }).then(
                    (data) => {
                        if (data.error) {
                            console.log(data.error);
                        } else {
                            GlobalState.importState(data.state || {});
                            this.options.finishedLoading = data.finishedLoading;
                            if (this.options.finishedLoading) {
                                this.loadMoreButton.options.label = UI.T("No more posts");
                                this.loadMoreButton.redraw();
                                this.loadMoreButton.disable();
                            }
                            for (let entry of ((data.state || {}).blogentry || [])) {
                                this.entriesList.appendChild(<BlogEntryPreview key={entry.id} entryId={entry.id}/>);
                            }
                        }
                    },
                    (error) => {
                        console.log(error);
                    });
            }
        })
    }
}

class BlogPanel extends UI.Panel {
    render() {
        return <UI.Switcher ref="switcher" lazyRender>
            <BlogEntryList ref="entryList" finishedLoading={this.options.finishedLoading} />
            <BlogEntryView ref="entryView" />
        </UI.Switcher>;
    }

    getEntryIdForURLName(entryURL) {
        let entryId;
        for (let entry of BlogEntryStore.all()) {
            if (entry.urlName === entryURL) {
                entryId = entry.id;
                break;
            }
        }
        return entryId;
    }

    onMount() {
        let handleLocation = (location) => {
            if (!location) return;
            try {
                if (location.args.length === 0) {
                    this.switcher.setActive(this.entryList);
                } else {
                    let entryURL = location.args[0];

                    let entryId = this.getEntryIdForURLName(entryURL);

                    if (entryId) {
                        this.entryView.setOptions({entryId: entryId});
                        this.switcher.setActive(this.entryView);
                        this.entryView.redraw();
                    } else {
                        Ajax.getJSON("/blog/get_blog_post/", {
                            entryUrlName: entryURL
                        }).then((data) => {
                            if (data.error) {
                                console.log(data.error);
                            } else {
                                GlobalState.importState(data.state || {});
                                let entryId = this.getEntryIdForURLName(entryURL);
                                if (entryId) {
                                    this.entryView.setOptions({entryId: entryId});
                                    this.switcher.setActive(this.entryView);
                                    this.entryView.redraw();
                                } else {
                                    console.log("Could not find blog entry", entryURL);
                                }
                            }
                        },
                        (error) => {
                            console.log(error);
                        });
                    }
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);

        // TODO: have a more throught out procedure for which streams to register to
        // for (let article of ArticleStore.all()) {
        //     GlobalState.registerStream("article-" + article.id);
        // }
        //
        // for (let entry of BlogEntryStore.all()) {
        //     GlobalState.registerStream("blogentry-" + entry.id);
        // }
    }
}

class DelayedBlogPanel extends StateDependentElement(BlogPanel) {
    getAjaxUrl() {
        return "/blog/";
    }

    importState(data) {
        super.importState(data);
        this.options.finishedLoading = data.finishedLoading;
    }

    getUrlRouter() {
        return this.urlRouter;
    }

    onDelayedMount() {
        let handleLocation = (args) => {
            try {
                if (args.length === 0) {
                    this.switcher.setActive(this.entryList);
                } else {
                    let entryURL = args[0];

                    let entryId = this.getEntryIdForURLName(entryURL);

                    if (entryId) {
                        this.entryView.setOptions({entryId: entryId});
                        this.switcher.setActive(this.entryView);
                        this.entryView.redraw();
                    } else {
                        Ajax.getJSON("/blog/get_blog_post/", {
                            entryUrlName: entryURL
                        }).then((data) => {
                            if (data.error) {
                                console.log(data.error);
                                this.getUrlRouter().setState([]);
                            } else {
                                GlobalState.importState(data.state || {});
                                let entryId = this.getEntryIdForURLName(entryURL);
                                if (entryId) {
                                    this.entryView.setOptions({entryId: entryId});
                                    this.switcher.setActive(this.entryView);
                                    this.entryView.redraw();
                                } else {
                                    console.log("Could not find blog entry", entryURL);
                                    this.getUrlRouter().setState([]);
                                }
                            }
                        },
                        (error) => {
                            console.log(error);
                            this.getUrlRouter().setState([]);
                        });
                    }
                }
            } catch (e) {
                this.getSubrouter().setState([]);
            }
        };

        this.urlRouter = new Subrouter( Router.Global.getCurrentRouter(),
                                        [...Router.Global.getCurrentRouter().getPrefix(), "blog"],
                                        this.options.subArgs || []);
        Router.Global.getCurrentRouter().registerSubrouter(this.urlRouter);
        this.getUrlRouter().addChangeListener(handleLocation);
        this.getUrlRouter().addExternalChangeListener(handleLocation);

        this.getUrlRouter().dispatch("change", this.getUrlRouter().getState());

        Dispatcher.Global.addListener("changeURL", () => {
            let currentUrl = Router.parseURL();
            if (currentUrl.length >= this.getUrlRouter().getPrefix().length) {
                let currentPrefix = currentUrl.slice(0, this.getUrlRouter().getPrefix().length);
                if (currentPrefix.join("/") === this.getUrlRouter().getPrefix().join("/")) {
                    this.getUrlRouter().getParentRouter().setActiveSubrouter(this.getUrlRouter());
                    this.getUrlRouter().setState(currentUrl.slice(currentPrefix.length));
                }
            }
        });
    }
}

export {BlogPanel, BlogEntryPreview, DelayedBlogPanel};
