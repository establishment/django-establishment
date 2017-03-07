import {Ajax} from "Ajax";
import {UI} from "UI";
import {StemDate} from "Time";
import {GlobalState} from "State";
import {ArticleStore} from "ArticleStore";
import {PublicUserStore} from "UserStore";
import {Language} from "LanguageStore";
import {UserHandle} from "UserHandle";

class TransferOwnershipModal extends UI.ActionModal {
    getActionName() {
        return "Transfer ownership";
    }
    
    getActionLevel() {
        return UI.Level.PRIMARY;
    }

    getBodyContent() {
        return [
            <UI.TextElement ref="text" value={"Set owner"}/>,
            <UI.Form style={{marginTop: "10px"}}>
                <UI.FormGroup ref="ownerFormGroup" label="Author ID">
                    <UI.TextInput ref="ownerFormInput"  value=""/>
                </UI.FormGroup>
            </UI.Form>
        ];
    }

    getFooterContent() {
        return [
            <UI.TemporaryMessageArea ref="messageArea"/>,
            <UI.Button level={UI.Level.DEFAULT} label="Close" onClick={() => this.hide()}/>,
            <UI.AjaxButton ref="transferOwnershipButton" level={this.getActionLevel()} onClick={() => {this.action()}}
                           statusOptions={[this.getActionName(), {faIcon: "spinner fa-spin", label:" transfering ownership ..."}, this.getActionName(), "Failed"]}
            />
        ];
    }

    setArticle(article) {
        this.article = article;
        this.text.setValue("Set owner for " + this.article.name + ":");
        this.ownerFormInput.setValue(this.article.userCreatedId);
    }

    action() {
        let table = this.options.parent.table;
        let newOwner = this.ownerFormInput.getValue();
        let request = {
            newOwner: newOwner
        };

        this.messageArea.showMessage("Saving...", "black", null);

        this.transferOwnershipButton.ajaxCall({
            url: "/article/" + this.article.id + "/set_owner/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully changed owner", data);
                    this.messageArea.showMessage("Author successfully changed");
                    GlobalState.importState(data.state);
                    console.log(data.state);
                    table.redraw();
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in changing owner:\n" + xhr.status + ":\n" + xhr.responseText);
                this.messageArea.showMessage("Error in changing owner", "red");
            }
        });
    }

    hide() {
        this.messageArea.clear();
        super.hide();
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
                    <UI.TextElement ref="text" value={"Delete article?"}/>
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

    setArticle(article) {
        this.article = article;
        this.text.setValue("Delete " + this.article.name + "?");
    }

    deleteArticle() {
        let table = this.options.parent.table;
        let request = {};
        this.deleteArticleButton.ajaxCall({
            url: "/article/" + this.article.id + "/delete/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    this.messageArea.showMessage(data.error, "red");
                    console.log(data.error);
                } else {
                    console.log("Successfully deleted article", data);
                    table.options.articles.splice(table.getArticleIndex(this.article.id), 1);
                    table.redraw();
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in deleting article:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    hide() {
        this.messageArea.clear();
        super.hide();
    }
}

// TODO(@gem): refactor to ActionModal
class CreateArticleModal extends UI.Modal {
    getGivenChildren() {
        return [
            <div className="modal-dialog" style={{margin: "0px"}}>
                <div className="modal-header">
                    <h4 className="modal-title">Create article</h4>
                </div>
                <div className="modal-body">
                    <UI.Form style={{marginTop: "10px"}}>
                        <UI.FormGroup ref="articleNameFormGroup" label="Article name">
                            <UI.TextInput ref="articleNameInput"  value=""/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="dependencyFormGroup" label="Dependencies">
                            <UI.TextInput ref="dependencyInput" value=""/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="languageFormGroup" label="Language">
                            <UI.Select ref="languageSelect" className="form-control" options={Language.all()}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="publicFormGroup" label="Public">
                            <UI.CheckboxInput ref="publicCheckbox" checked={false}/>
                        </UI.FormGroup>
                    </UI.Form>
                </div>
                <div className="modal-footer">
                    <UI.TemporaryMessageArea ref="messageArea"/>
                    <UI.Button level={UI.Level.DEFAULT} label="Close" onClick={() => this.hide()}/>
                    <UI.AjaxButton ref="createArticleButton" level={UI.Level.PRIMARY} onClick={() => {this.createArticle()}}
                                   statusOptions={["Create article", {faIcon: "spinner fa-spin", label:" creating article ..."}, "Create article", "Failed"]}
                    />
                </div>
            </div>
        ];
    }

    createArticle(options) {
        let name = this.articleNameInput.getValue();
        let dependency = this.dependencyInput.getValue();
        let languageId = this.languageSelect.get().id;
        let isPublic = this.publicCheckbox.getValue();
        let request = {
            name: name,
            dependency: dependency,
            languageId: languageId,
            isPublic: isPublic
        };
        if (options) {
            Object.assign(request, options);
        }
        this.createArticleButton.ajaxCall({
            url: "/create_article/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                    this.messageArea.showMessage(data.error, "red");
                } else {
                    console.log("Successfully created article", data);
                    GlobalState.importState(data.state);
                    this.options.parent.table.addArticle(ArticleStore.get(data.article.id));
                    this.hide();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in creating article:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    hide() {
        this.messageArea.clear();
        super.hide();
    }
}

// TODO(@gem): refactor to ActionModal
class AddTranslationModal extends CreateArticleModal {
    getGivenChildren() {
        this.baseArticle = this.options.baseArticle;
        return [
            <div className="modal-dialog" style={{margin: "0px"}}>
                <div className="modal-header">
                    <h4 className="modal-title">Add translation</h4>
                </div>
                <div className="modal-body">
                    <UI.Form style={{marginTop: "10px"}}>
                        <UI.FormGroup ref="articleNameFormGroup" label="Article name">
                            <UI.TextInput ref="articleNameInput"  value={"Translation for " + this.baseArticle.name}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="dependencyFormGroup" label="Dependencies">
                            <UI.TextInput ref="dependencyInput" value={this.baseArticle.dependency}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="languageFormGroup" label="Language">
                            <UI.Select ref="languageSelect" className="form-control" options={Language.all()}/>
                        </UI.FormGroup>
                        <UI.FormGroup ref="publicFormGroup" label="Public">
                            <UI.CheckboxInput ref="publicCheckbox" checked={this.baseArticle.isPublic}/>
                        </UI.FormGroup>
                    </UI.Form>
                </div>
                <div className="modal-footer">
                    <UI.TemporaryMessageArea ref="messageArea"/>
                    <UI.Button level={UI.Level.DEFAULT} label="Close" onClick={() => this.hide()}/>
                    <UI.AjaxButton ref="createArticleButton" level={UI.Level.PRIMARY}
                                   onClick={() => this.createArticle({
                                       baseArticleId: this.baseArticle.id,
                                       markup: this.baseArticle.markup
                                   })}
                                   statusOptions={["Add translation", {faIcon: "spinner fa-spin", label:" creating translation article ..."}, "Success", "Failed"]}
                    />
                </div>
            </div>
        ];
    }
}

class ArticleTable extends UI.SortableTable {
    setOptions(options) {
        super.setOptions(options);
        this.resetColumnSortingOrder();
    }

    resetColumnSortingOrder() {
        this.columnSortingOrder = [this.columns[4], this.columns[5], this.columns[0],
            this.columns[3], this.columns[2], this.columns[1]];
    }

    getArticleIndex(articleId) {
        for (let i = 0; i < this.options.articles.length; i += 1) {
            if (this.options.articles[i].id === articleId)
                return i;
        }
        return -1;
    }

    addArticle(article) {
        this.options.articles.push(article);
        this.redraw();
    }

    setColumns() {
        let cellStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let headerStyle = {
            textAlign: "left",
            verticalAlign: "middle"
        };
        let columns = [{
            value: article => <a href={"/article/" + article.id + "/edit/"}>{article.name}</a>,
            rawValue: article => article.name,
            headerName: "Article",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => <UserHandle id={article.userCreatedId}/>,
            rawValue: article => PublicUserStore.get(article.userCreatedId).username,
            headerName: "Author",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => (article.isPublic ? <span className="fa fa-check fa-lg" style={{color: "green"}}/>
                : <span className="fa fa-times fa-lg" style={{color: "red"}}/>),
            rawValue: article => (article.isPublic ? "Yes" : "No"),
            headerName: "Public",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => Language.get(article.languageId).name,
            rawValue: article => Language.get(article.languageId).name,
            headerName: "Language",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => StemDate.unix(article.dateCreated).locale("en").format("DD/MM/YYYY HH:mm:ss"),
            rawValue: article => article.dateCreated,
            sortDescending: true,
            headerName: "Date created",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }, {
            value: article => StemDate.unix(article.dateModified).locale("en").format("DD/MM/YYYY HH:mm:ss"),
            rawValue: article => article.dateModified,
            sortDescending: true,
            headerName: "Date modified",
            headerStyle: headerStyle,
            cellStyle: cellStyle
        }];
        if (!this.options.parent.options.readOnly) {
            if (USER.isSuperUser) {
                columns.push({
                    value: article => <UI.Button level={UI.Level.PRIMARY} label="Set owner"
                                                 onClick={() => {
                                                     this.options.parent.transferOwnershipModal.show();
                                                     this.options.parent.transferOwnershipModal.setArticle(article);
                                                 }}/>,
                    headerName: "Set owner",
                    headerStyle: headerStyle,
                    cellStyle: cellStyle
                });
            }
            columns.push({
                value: article => <UI.Button level={UI.Level.DANGER} label="Delete"
                                             onClick={() => {
                                                 this.options.parent.deleteArticleModal.show();
                                                 this.options.parent.deleteArticleModal.setArticle(article);
                                             }}/>,
                headerName: "Delete",
                headerStyle: headerStyle,
                cellStyle: cellStyle
            });
        }
        super.setColumns(columns);
    }

    getEntries() {
        return this.sortEntries(this.options.articles);
    }
}

class ArticleManager extends UI.Panel {
    getDefaultOptions() {
        return {
            title: "Article manager"
        };
    }

    setOptions(options) {
        options = Object.assign(this.getDefaultOptions(), options);
        super.setOptions(options);
        this.options.articles = this.options.articles || ArticleStore.all();
    }

    render() {
        let addButton = null;
        if (!this.options.readOnly) {
            addButton = <div className="pull-right">
                <UI.Button level={UI.Level.PRIMARY} label="Create article"
                           onClick={() => this.createArticleModal.show()}
                           style={{marginTop: "5px", marginBottom: "5px"}}/>
            </div>;
        }

        return [
            <div className="pull-left">
                <h4><strong>{this.options.title}</strong></h4>
            </div>,
            addButton,
            <ArticleTable ref="table" articles={this.options.articles} parent={this}/>,
        ];
    }

    onMount() {
        super.onMount();
        this.getArticles();

        if (this.options.readOnly === true)
            return;

        this.createArticleModal = <CreateArticleModal parent={this}/>;

        if (USER.isSuperUser) {
            this.transferOwnershipModal = <TransferOwnershipModal parent={this}/>;
        }

        this.deleteArticleModal = <DeleteArticleModal parent={this}/>;
    }

    getArticles() {
        if (this.options.articles && this.options.articles.length > 0) {
            return;
        }

        let request = {};
        Ajax.request({
            url: "/get_available_articles/",
            type: "GET",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    this.options.articles = ArticleStore.all();
                    this.redraw();
                }
            },
            error: (xhr, errmsg, err) => {
                console.error("Error in fetching articles");
                console.error(xhr.responseText);
            }
        });
    }
}

class TranslationManager extends UI.Panel {
    getDefaultOptions() {
        return {
            title: "Translation manager"
        };
    }

    setOptions(options) {
        options = Object.assign(this.getDefaultOptions(), options);
        super.setOptions(options);
    }

    render() {
        this.table = <ArticleTable articles={[]} parent={this}/>;
        let addButton = null;
        if (!this.options.readOnly)
            addButton = <div className="pull-right"><UI.Button level={UI.Level.PRIMARY} label="Add translation"
                                                               onClick={() => this.addTranslationModal.show()}
                                                               style={{marginTop: "5px", marginBottom: "5px"}}/></div>;
        return [<div className="pull-left"><h4><strong>{this.options.title}</strong></h4></div>, addButton, this.table];
    }

    onMount() {
        super.onMount();
        this.getTranslations();

        if (this.options.readOnly === true)
            return;

        this.addTranslationModal = <AddTranslationModal parent={this} baseArticle={this.options.baseArticle}/>;

        if (USER.isSuperUser) {
            this.transferOwnershipModal = <TransferOwnershipModal parent={this}/>;
        }

        this.deleteArticleModal = <DeleteArticleModal parent={this}/>;
    }

    getTranslations() {
        if (!this.options.baseArticle)
            return;
        let request = {};
        Ajax.request({
            url: "/article/" + this.options.baseArticle.id + "/get_translations/",
            type: "GET",
            dataType: "json",
            data: request,
            success: (data) => {
                if (data.error) {
                    console.log(data.error);
                } else {
                    GlobalState.importState(data.state);
                    for (let article of ArticleStore.all()) {
                        if (article.baseArticleId == this.options.baseArticle.id) {
                            this.table.options.articles.push(article);
                        }
                    }
                    this.table.redraw();
                }
            },
            error: (xhr, errmsg, err) => {
                console.error("Error in fetching articles");
                console.error(xhr.responseText);
            }
        });
    }
}

export {ArticleManager, TranslationManager}
