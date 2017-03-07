import {Ajax} from "Ajax";
import {UI} from "UI";
import {TabArea} from "tabs/TabArea";
import {GlobalState} from "State";
import {ArticleStore} from "ArticleStore";
import {Language} from "LanguageStore";
import {MarkupEditor} from "MarkupEditor";
import {ArticleRenderer} from "ArticleRenderer";
import {TranslationManager} from "ArticleManager";

const deleteRedirectLink = "/";

//TODO (@kira) : 4. fix line wrapping 5.Fix diffing svg gutter bug 7.Collapse button in section Divider maybe?
class ArticleMarkupEditor extends MarkupEditor {
    setOptions(options) {
        super.setOptions(options);
        this.options.value = this.options.article.markup;
    }

    getMarkupRenderer() {
        return <ArticleRenderer ref="articleRenderer" article={this.options.article} style={{height:"100%"}} />
    }

    updateValue(markup) {
        this.options.article.markup = markup;
        this.articleRenderer.setValue(markup);
        this.articleRenderer.redraw();
    }
}

// TODO(@gem): refactor to ActionModal
class DeleteArticleModal extends UI.Modal {
    getGivenChildren() {
        return [
            <div className="modal-dialog" style={{margin: "0px"}}>
                <div className="modal-header">
                    <h4 className="modal-title">Delete article</h4>
                </div>
                <div className="modal-body">
                    <p>Delete {this.options.article.name}?</p>
                </div>
                <div className="modal-footer">
                    <UI.TemporaryMessageArea ref="messageArea"/>
                    <UI.Button level={UI.Level.DEFAULT} label="Close" onClick={() => this.hide()}/>
                    <UI.AjaxButton ref="deleteArticleButton" level={UI.Level.DANGER} onClick={() => {this.deleteArticle()}}
                                       statusOptions={["Delete article", {faIcon: "spinner fa-spin", label:" deleting article ..."}, "Delete article", "Failed"]}
                        />
                </div>
            </div>
        ];
    }

    deleteArticle() {
        let request = {
        };
        this.deleteArticleButton.ajaxCall({
            url: "/article/" + this.options.article.id + "/delete/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully deleted article", data);
                    if (this.options.article.baseArticleId)
                        window.location.replace("/article/" + this.options.article.baseArticleId + "/edit/");
                    else
                        window.location.replace(deleteRedirectLink);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.messageArea.showMessage("Error in deleting article", "red");
            }
        });
    }
}

class ArticleEditor extends UI.Panel {
    setOptions(options) {
        super.setOptions(options);
        this.options.article = ArticleStore.get(this.options.articleId);
        this.versions = [];
        this.versionsLabels = [];
        for (let article of this.options.article.getEdits()) {
            this.versions.push(article.content);
            this.versionsLabels.push("Version " + article.id);
        }
        this.versions.push(this.options.article.markup);
        this.versionsLabels.push("Edit version");
        this.versions.reverse();
        this.versionsLabels.reverse();
    }

    render() {
        console.log(this.options.article);
        let translationsPanel = null;
        let baseArticleForm = null;
        if (this.options.article.baseArticleId) {
            let baseArticle = ArticleStore.get(this.options.article.baseArticleId);
            if (baseArticle) {
                baseArticleForm = <UI.FormGroup ref="baseArticleFormGroup" label="Base article">
                    <a href={"/article/" + baseArticle.id + "/edit/"}>{baseArticle.name}</a>
                </UI.FormGroup>;
            }
        } else {
            translationsPanel = <UI.Panel title="Translations">
                <TranslationManager title={"Translations for " + this.options.article.name}
                                    baseArticle={this.options.article}/>
            </UI.Panel>
        }
        let ownershipPanel = null;
        if (USER.isSuperUser) {
            ownershipPanel = <UI.Panel title="Ownership">
                <UI.Form style={{marginTop: "10px"}}>
                    <UI.FormGroup ref="ownerFormGroup" label="Author ID">
                        <UI.TextInput ref="ownerFormInput"  value={this.options.article.userCreatedId}/>
                    </UI.FormGroup>
                </UI.Form>
                <UI.AjaxButton ref="setOwnerButton" level={UI.Level.INFO} onClick={() => {
                                let newOwner = this.ownerFormInput.getValue();
                                this.setOwner(newOwner);
                               }}
                               statusOptions={["Transfer ownership", {faIcon: "spinner fa-spin", label:" transfering ownership ..."}, "Transfer ownership", "Failed"]}
                        />
                <UI.TemporaryMessageArea ref="setOwnerMessageArea"/>
            </UI.Panel>
        }
        return [
            <h3>{this.options.article.name + " Id=" + this.options.article.id}</h3>,
            <TabArea ref="tabArea" variableHeightPanels>
                <UI.Panel title="Edit" active>
                    <UI.AjaxButton ref="saveMarkupButton" level={UI.Level.INFO} onClick={() => {
                                    let content = this.markupEditor.getValue();
                                    this.saveMarkup(content);
                                   }}
                               statusOptions={["Save", {faIcon: "spinner fa-spin", label:" saveing ..."}, "Save", "Failed"]}
                        />
                    <UI.TemporaryMessageArea ref="saveMarkupMessageArea"/>
                    <ArticleMarkupEditor style={{height: "650px"}} ref="markupEditor" article={this.options.article} />
                </UI.Panel>
                <UI.Panel title="Summary">
                    <UI.Form style={{marginTop: "10px"}}>
                        <UI.FormGroup ref="articleNameFormGroup" label="Article name">
                            <UI.TextInput ref="articleNameFormInput"  value={this.options.article.name}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="dependencyFormGroup" label="Dependencies">
                            <UI.TextInput ref="dependencyFormInput" value={this.options.article.dependency}/>
                        </UI.FormGroup>
                        {baseArticleForm}
                        <UI.FormGroup ref="languageFormGroup" label="Language">
                            <UI.Select ref="languageSelect" className="form-control" options={Language.all()}
                                       selected={Language.get(this.options.article.languageId)}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="publicFormGroup" label="Public">
                            <UI.CheckboxInput ref="publicCheckbox" checked={this.options.article.isPublic}/>
                        </UI.FormGroup>
                    </UI.Form>
                    <UI.AjaxButton ref="saveOptionsButton" level={UI.Level.INFO} onClick={() => {
                                    let name = this.articleNameFormInput.getValue();
                                   let dependency = this.dependencyFormInput.getValue();
                                   let languageId = this.languageSelect.get().id;
                                   let isPublic = this.publicCheckbox.getValue();
                                   let options = {
                                       name: name,
                                       dependency: dependency,
                                       languageId: languageId,
                                       isPublic: isPublic
                                   };
                                   this.saveOptions(options);
                                   }}
                               statusOptions={["Save", {faIcon: "spinner fa-spin", label:" saveing ..."}, "Save", "Failed"]}
                        />
                    <UI.Button ref="deleteArticleButton" level={UI.Level.DANGER} label="Delete article"
                               style={{marginLeft: "3px"}}
                               onClick={() => this.deleteArticleModal.show()}/>
                    <UI.TemporaryMessageArea ref="saveOptionsMessageArea"/>
                </UI.Panel>
                {translationsPanel}
                {ownershipPanel}
            </TabArea>
        ];
    }

    getArticle(id) {
        let request = {
            ids: [id]
        };
        Ajax.request({
            url: "/fetch_article/",
            type: "GET",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    this.redraw();
                }
            },
            error: (xhr, errmsg, err) => {
                console.error("Error in fetching articles");
                console.error(xhr.responseText);
            }
        });
    }

    saveMarkup(content) {
        let request = {
            markup: content
        };

        this.saveMarkupMessageArea.showMessage("Saving...", "black", null);

        this.saveMarkupButton.ajaxCall({
            url: "/article/" + this.options.article.id + "/edit/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                // Add a new version in the dropdown if the save is a success
                this.addNewVersion(content);
                console.log("Successfully saved article", data);
                this.saveMarkupMessageArea.showMessage("Saved article");
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.saveMarkupMessageArea.showMessage("Error in saving the article", "red");
            }
        });
    }

    saveOptions(options) {
        let request = {
        };
        Object.assign(request, options);

        this.saveOptionsMessageArea.showMessage("Saving...", "black", null);

        this.saveOptionsButton.ajaxCall({
            url: "/article/" + this.options.article.id + "/edit/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.saveOptionsMessageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully saved article", data);
                    this.saveOptionsMessageArea.showMessage("Successfully saved article");
                    window.location.replace("/article/" + this.options.article.id + "/edit/");
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in saving article:\n" + xhr.status + ":\n" + xhr.responseText);
                this.saveOptionsMessageArea.showMessage("Error in saving the article", "red");
            }
        });
    }

    setOwner(newOwner) {
        let request = {
            newOwner: newOwner
        };

        this.setOwnerMessageArea.showMessage("Saving...", "black", null);

        this.setOwnerButton.ajaxCall({
            url: "/article/" + this.options.article.id + "/set_owner/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.setOwnerMessageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully changed owner", data);
                    this.setOwnerMessageArea.showMessage("Author successfully changed");
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                this.setOwnerMessageArea.showMessage("Error in changing owner", "red");
            }
        });
    }

    addNewVersion(content) {
        this.versionsLabels[0] = ("Version " + this.versionsLabels.length);
        this.versions[0] = content;

        this.versions.unshift(this.markupEditor.getValue());
        this.versionsLabels.unshift("Edit version");
    }

    onMount() {
        this.deleteArticleModal = <DeleteArticleModal article={this.options.article}/>;
        this.deleteArticleModal.mount(document.body);

        this.tabArea.titleArea.children[1].addClickListener(() => {
            this.versions[0] = this.markupEditor.getValue();
        });

        if (this.options.article.baseArticleId) {
            if (!ArticleStore.get(this.options.article.baseArticleId)) {
                this.getArticle(this.options.article.baseArticleId);
            }
        }

        window.onbeforeunload = () => {
            // Are you sure you want to close the page?
            return "";
        }
    }
}

export {ArticleEditor}
