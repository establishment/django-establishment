import {Ajax} from "Ajax";
import {UI} from "UI";
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

let blogStyle = BlogStyle.getInstance();

class BlogEntryEditModal extends UI.Modal {
    getGivenChildren() {
        let entry = BlogEntryStore.get(this.options.entryId);
        let article = entry.getArticle();

        let discussionButton = null;
        if (!entry.discussionId) {
            discussionButton = <UI.Button level={UI.Level.WARNING} label="Create discussion"
                                          onClick={() => this.createDiscussion()} style={{marginLeft: "5px"}}/>;
        }

        return [
            <h1>Edit Entry</h1>,
            <div className="form form-horizontal">
                <UI.FormGroup label="Title">
                    <UI.TextInput ref="titleInput" value={article.name}/>
                </UI.FormGroup>
                <UI.FormGroup label="URL Name">
                    <UI.TextInput ref="urlInput" value={entry.urlName}/>
                </UI.FormGroup>
                <UI.FormGroup label="Visible">
                    <UI.CheckboxInput ref="visibleCheckbox" value={entry.visible}/>
                </UI.FormGroup>
                <UI.Button level={UI.Level.PRIMARY} label="Change settings" onClick={() => this.changeSettings()}/>
                {discussionButton}
                <UI.TemporaryMessageArea ref="messageArea"/>
            </div>,
            <ArticleEditor ref="contentEditor" articleId={article.id}/>
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

        Ajax.request({
            url: "/blog/change_entry_settings/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                console.log("Changed contest settings!", data);

                if (data.urlName) {
                    URLRouter.route(data.urlName, "edit");
                }
                this.redraw();
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in changing contest settings!");
                console.log(xhr.responseText);
                this.messageArea.showMessage("Error in changing contest settings!", "red");
            }
        });
    }

    createDiscussion() {
        let request = {
            entryId: this.options.entryId
        };

        Ajax.request({
            url: "/blog/create_entry_discussion/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                console.log("Created discussion!", data);
                GlobalState.importState(data.state);
                this.hide();
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in creating discussion!");
                console.log(xhr.responseText);
                this.messageArea.showMessage("Error in creating discussion!", "red");
            }
        });
    }
}

class NewBlogEntryModal extends UI.Modal {
    getGivenChildren() {
        return [
            <h1>New Entry</h1>,
            <div className="form form-inline">
                <UI.FormGroup label="Title">
                    <UI.TextInput ref="titleInput"/>
                </UI.FormGroup>
                <UI.FormGroup label="URL Name">
                    <UI.TextInput ref="urlInput"/>
                </UI.FormGroup>
                <UI.FormGroup>
                    <div className="checkbox">
                        <UI.CheckboxInput ref="visibleCheckbox"/>
                        {"Visible"}
                    </div>
                </UI.FormGroup>
                <UI.Button label="Add Entry" level={UI.Level.PRIMARY} onClick={() => {
                    this.addEntry()
                }}/>
                <MarkupEditor ref="postContentMarkup" style={{height: "450px"}}/>
            </div>
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

        Ajax.request({
            url: "/blog/add_entry/",
            type: "POST",
            dataType: "json",
            data: data,
            success: (data) => {
                if (data.error) {
                    ErrorHandlers.SHOW_ERROR_ALERT(data.error);
                } else {
                    GlobalState.importState(data.state);
                    let blogEntry = BlogEntryStore.get(data.blogEntryId);
                    URLRouter.route(blogEntry.urlName);
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in adding blog post!");
                console.log(xhr.responseText);
            }
        });
    }
}


class BlogEntryPreview extends UI.Element {
    setOptions(options) {
        super.setOptions(options);

        this.options.urlPrefix = this.options.urlPrefix || "";

        this.options.maxHeight = "420px";

        this.entry = BlogEntryStore.get(this.options.entryId);
        this.article = this.entry.getArticle();
    }

    extraNodeAttributes(attr) {
        attr.setStyle({
            overflow: "hidden",
            marginTop: "40px",
        });
    }

    canOverwrite(obj) {
        return super.canOverWrite(obj) && this.options.entryId === obj.options.entryId;
    }

    render() {
        // TODO: not actually the published date
        let publishedDate = this.article.dateCreated;
        let publishedFormat = StemDate.unix(publishedDate).format("LL");
        let modifiedFormat;

        if (this.article.dateModified > this.article.dateCreated) {
            modifiedFormat = <p>Last update on {StemDate.unix(this.article.dateModified).format("LL")}.</p>
        }

        return [
            <div style={{"background-color": "#fff", "padding": "2% 4% 10px 4%", "margin": "0 auto", "width": "900px", "max-width": "100%", position: "relative"}}>
              <div style={blogStyle.writtenBy}>
                Written by <UserHandle userId={this.article.userCreatedId}/> on {publishedFormat}.{modifiedFormat}
              </div>
              <div style={blogStyle.title}>
                <a href={this.options.urlPrefix + "#" + this.entry.urlName} style={{"text-decoration": "none", "color": "inherit"}}>
                  {this.article.name}
                </a>
              </div>
              <BlogArticleRenderer article={this.article} style={blogStyle.blogArticleRenderer}/>
              <div className={blogStyle.whiteOverlay}></div>
              <a href={this.options.urlPrefix + "#" + this.entry.urlName} style={blogStyle.link}>
                Continue reading
              </a>
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

        if (this.article.dateModified > this.article.dateCreated) {
            modifiedFormat = <p>Last update on {StemDate.unix(this.article.dateModified).format("LL")}.</p>
        }

        let blogEntryEditButton;
        if (USER.isSuperUser) {
            blogEntryEditButton = <UI.Button level={UI.Level.DEFAULT} label="Edit" onClick={() => {
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
                    <a href="#" style={blogStyle.link}>
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
            USER.isSuperUser ? <UI.Button ref="newEntryButton" label="New Entry" level={UI.Level.DEFAULT}/> : null,
            entries
        ];
    }

    onMount() {
        super.onMount();

        if (this.newEntryButton) {
            this.newEntryButton.addClickListener(() => {
                this.newBlogPostModal = this.newBlogPostModal || <NewBlogEntryModal fillScreen/>;
                this.newBlogPostModal.show()
            });
        }
    }
}

class BlogPanel extends UI.Panel {
    render() {
        return <UI.Switcher ref="switcher" lazyRender>
            <BlogEntryList ref="entryList"/>
            <BlogEntryView ref="entryView"/>
        </UI.Switcher>;
    }

    onMount() {
        let handleLocation = (location) => {
            if (!location) return;
            try {
                if (location.args.length === 0) {
                    this.switcher.setActive(this.entryList);
                } else {
                    let entryURL = location.args[0];

                    let entryId;
                    for (let entry of BlogEntryStore.all()) {
                        if (entry.urlName === entryURL) {
                            entryId = entry.id;
                            break;
                        }
                    }

                    if (entryId) {
                        this.entryView.setOptions({entryId: entryId});
                        this.switcher.setActive(this.entryView);
                        this.entryView.redraw();
                    } else {
                        console.log("Could not find blog entry", entryURL);
                    }
                }
            } catch (e) {
                console.log("Failed to handle location. ", e);
            }
        };

        handleLocation(URLRouter.getLocation());
        URLRouter.addRouteListener(handleLocation);
    }
}

export {BlogPanel, BlogEntryPreview};
